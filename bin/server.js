var program = require('commander');
var Promise = require('promise');
var debug = require('debug')('server');
var passport = require('passport');
var AWS = require('aws-sdk-promise');
var express = require('express');
var path = require('path');
var TaskBucket = require('../queue/task_bucket');
var TaskStore = require('../store/tasks');

function launch(options) {
  var nconf = require(__dirname + '/../config/' + program.config)();

  require('../utils/spread-promise').patch();

  var app = exports.app = express();

  app.set('port', Number(process.env.PORT || nconf.get('server:port')));
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'jade');
  app.set('nconf', nconf);
  app.use(express.favicon());
  app.use(express.logger('dev'));


  // task bucket
  var s3 = new AWS.S3(nconf.get('aws'));

  app.set(
    'taskBucket',
    new TaskBucket(
      s3,
      nconf.get('queue:taskBucket'), // bucket location
      nconf.get('queue:taskBucketIsCNAME') ?
        nconf.get('queue:taskBucket') :
        null
    )
  );

  // task database store
  var knex = require('knex').initialize({
    client: 'postgres',
    connection: nconf.get('database:connectionString')
  });

  app.set('tasksStore', TaskStore(knex));

  // routes
  require('../routes/api/v1').mount(app, '/v1');

  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.cookieParser(nconf.get('server:cookieSecret')));
  app.use(express.session());

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(function(req, res, next) {
    // Expose user to all templates, if logged in
    res.locals.user = req.user;
    next();
  });
  app.use(app.router);
  app.use('/static', require('stylus').middleware(path.join(__dirname, '..', 'static')));
  app.use('/static', express.static(path.join(__dirname, '..', 'static')));

  // Warn if no secret was used in production
  if ('production' == app.get('env')) {
    var secret = nconf.get('server:cookieSecret');
    if (secret == "Warn, if no secret is used on production") {
      console.log("Warning: Customized cookie secret should be used in production");
    }
  }

  // Middleware for development
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }
  // Passport configuration

  var PersonaStrategy = require('passport-persona').Strategy;
  passport.use(new PersonaStrategy({
      audience: 'http://' + nconf.get('server:hostname') + ':' +
                 nconf.get('server:port')
    },
    function(email, done) {
      debug("Signed in with:" + email);
      if (/@mozilla\.com$/.test(email)) {
        done(null, {email: email});
      } else {
        done(null, null);
      }
    }
  ));

  // Serialize user to signed cookie
  passport.serializeUser(function(user, done) {
    done(null, user.email);
  });

  // Deserialize user from signed cookie
  passport.deserializeUser(function(email, done) {
    done(null, {email: email});
  });

  app.post('/persona-auth',
    passport.authenticate('persona', {failureRedirect: '/unauthorized'}),
    function(req, res) {
      res.redirect('/');
    }
  );

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  /** Middleware for requiring authenticatoin */
  var ensureAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/unauthorized');
  };

  // Route configuration
  var routes = require('../routes');
  app.get('/',                                routes.index);
  app.get('/unauthorized',                    routes.unauthorized);

  // validate
  require('../utils/validate').setup();

  // async setup stuff...
  var eventsSetup = require('../queue/events').connect(nconf.get('amqp:url'));

  var publishSchema = nconf.get('queue:publishSchema') ?
    require('./utils/render-schema').publish() :
    null;

  var schemaSetup = require('../store/schema').create(knex);

  Promise.all([eventsSetup, publishSchema, schemaSetup]).
    then(function(setup) {
      // XXX: This looks ugly because we are mixing concerns here...
      //      The events setup step should be its own channel with only the
      //      exchange setup and then separately we can lazily connect to amqp
      //      to send messages.
      app.set('events', setup[0]);

      // reaper to clean database every once and awhile
      var reaper = require('../reaper')(
        nconf.get('queue:reaperInterval'),
        app.get('tasksStore'),
        app.get('events')
      );

      reaper.start();
      app.set('reaper', reaper);

      var server = require('http').createServer(app);
      var listen = Promise.denodeify(server.listen.bind(server, app.get('port')));
      return listen();
    }).
    then(function() {
      debug('Express server listening on port ' + app.get('port'));
      if (process.send) {
        process.send({ready: true});
      }
    }).
    catch(function(err) {
      debug("Failed to start server, err: %s, as JSON: %j", err, err, err.stack);
      // If we didn't launch the server we should crash
      process.exit(1);
    });
}

program.
  command('server').
  description('launch the queue server').
  action(launch);
