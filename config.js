var nconf   = require('nconf');
var aws     = require('aws-sdk-promise');

/** Default configuration values */
var DEFAULT_CONFIG_VALUES = {

};

/** Load configuration */
exports.load = function(default_only) {
  if (!default_only) {

  }

  // Load default configuration
  nconf.defaults(DEFAULT_CONFIG_VALUES);

  // Set configuration for aws-sdk
  aws.config.update(nconf.get('aws'));
};
