/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('runs', {
    workerId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    workerGroup: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    runId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskId: {
      type: 'UUID',
      allowNull: false,
    }
  });
};
