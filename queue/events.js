var Promise   = require('promise');
var nconf     = require('nconf');
var amqp      = require('amqp');
var validate  = require('../utils/validate');

var debug   = require('debug')('queue:events');

// AMQP connection created by events.setup()
var _conn = null;

// Exchanges setup by events.setup()
var _exchanges = null;

/**
 * Setup AMQP connection and declare the required exchanges, this returns a
 * promise that we're ready to publish messages.
 *
 * **Warning** the `node-amqp` library have some fairly limited error reporting
 * capability, so don't except this to fail. This isn't bad because failure to
 * setup exchanges is critical... Whether server crashes or loops doesn't really
 * matter to me.
 */
exports.setup = function() {
  debug("Connecting to AMQP server");

  // Connection created
  var conn = null;

  // Get a promise that we'll be connected
  var connected = new Promise(function(accept, reject) {
    // Create connection
    conn = amqp.createConnection(nconf.get('amqp'));
    conn.on('ready', function() {
      debug("Connection to AMQP is now ready for work");
      accept();
    });
  });

  // Create a dictionary for exchanges
  var exchanges = {};

  // When we're connected, let's defined exchanges
  var setup_completed = connected.then(function() {
    // For each desired exchange we create a promise that the exchange will be
    // declared (we just carry name to function below as name, enjoy)
    var exchanges_declared_promises = [
      'queue/v1/task-pending',
      'queue/v1/task-running',
      'queue/v1/task-completed',
      'queue/v1/task-failed'
    ].map(function(name) {
      // Promise that exchange with `name` will be created
      return new Promise(function(accept, reject) {
        debug("Declaring exchange: " + name);
        // For all intents and purposes these exchanges must be durable and
        // not auto deleted, they should never disappear!
        exchanges[name] = conn.exchange(name, {
          type:             'topic',
          durable:          true,
          confirm:          true,
          autoDelete:       false
        }, function() {
          debug("Declared exchange: " + name);
          accept();
        });
      });
    });

    // Return a promise that all exchanges have been configured
    return Promise.all(exchanges_declared_promises);
  });

  return setup_completed.then(function() {
    // Set connection and exchange globally
    _conn = conn;
    _exchanges = exchanges;
  });
};

/**
 * Disconnect from AMQP server, returns a promise of success
 * Mainly used for testing...
 */
exports.disconnect = function() {
  return new Promise(function(accept, reject) {
    _conn.on('close', function() {
      accept();
    });
    _conn.destroy();
  });
};

/**
 * Publish a message to exchange, routing key will be constructed from message
 */
exports.publish = function(exchange, message) {
  // Check if exchanges are created, don't give a promise if exchanges aren't
  // setup...
  if (_exchanges === null) {
    throw new Error("Exchanges are not setup yet, call events.setup()!");
  }

  return new Promise(function(accept, reject) {
    // Check if we're supposed to validate out-going messages
    if (nconf.get('queue:validateOutgoing')) {
      var schema = 'http://schemas.taskcluster.net/queue/v1/' + exchange +
                   '-message.json#';
      debug('Validating with schema', schema);

      var errors = validate(message, schema);
      // Reject message if there's any errors
      if (errors) {
        debug(
          "Failed to publish message, errors: %s, as JSON: %j",
          errors,
          errors
        );
        debug("Message: %j", message);
        reject(errors);
        return;
      }
    }

    // Construct routing key from task status structure in message
    // as well as runId, workerGroup and workerId, which are present in the
    // message if relevant.
    var routingKey = [
      message.status.taskId,
      message.runId         || '_',
      message.workerGroup   || '_',
      message.workerId      || '_',
      message.status.provisionerId,
      message.status.workerType,
      message.status.routing
    ].join('.');

    // Publish message to RabbitMQ
    _exchanges['queue/v1/' + exchange].publish(routingKey, message, {
      contentType:        'application/json',
      deliveryMode:       2,
    }, function(err) {
      if (err) {
        reject(new Error("Failed to send message\n" + err.stack));
      } else {
        debug(
          "Published message to %s with taskId: %s",
          exchange,
          message.status.taskId
        );
        accept();
      }
    });
  });
};
