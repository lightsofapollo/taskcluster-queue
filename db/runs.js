/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('runs', {
    workerid: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    workergroup: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    runid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskid: {
      type: 'UUID',
      allowNull: false,
    }
  });
};
