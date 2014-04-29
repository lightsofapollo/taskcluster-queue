var Provider = require('nconf').Provider;

module.exports = function config() {
  var nconf = new Provider();
  // defaults
  nconf.defaults(require('./defaults'));
  return nconf;
};

