/**
load and configure the database for tests.
*/

module.exports = function() {
  var Sequelize = require('sequelize');
  var db = require('../db');
  var config = require('../config/tests')();

  var sequelize = new Sequelize(
    config.get('database:connectionString').replace('pg://', 'postgres://')
  );

  var instance = db(sequelize);

  // force is used to ensure we are in a clean state each time
  return instance.sequelize.sync({ force: true }).then(function() {
    return instance;
  });
};
