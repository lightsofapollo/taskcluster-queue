/* jshint indent: 2 */

var slugid = require('slugid');

module.exports = function(sequelize, DataTypes) {
  var TYPES = {
    takenUntil: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    priority: {
      type: 'DOUBLE PRECISION',
      allowNull: false,
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    routing: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    workerType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provisionerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taskId: {
      type: 'UUID',
      allowNull: false,
      primaryKey: true
    }
  };

  return sequelize.define('tasks', TYPES, {
    getterMethods: {
      taskIdSlug: function() {
        return slugid.encode(this.taskId);
      },
    },

    setterMethods: {
      taskIdSlug: function(slug) {
        this.taskId = slugid.decode(slug);
      }
    }
  });
};
