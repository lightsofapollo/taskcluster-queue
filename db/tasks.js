/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tasks', {
    takenuntil: {
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
    workertype: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provisionerid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taskid: {
      type: 'UUID',
      allowNull: false,
      primaryKey: true
    }
  });
};
