/**
This file is more or less ripped off by what the sequelize docs say to do.
*/
module.exports = function connect(sequelize) {

  var Runs = sequelize.import(__dirname + '/db/runs');
  var Tasks = sequelize.import(__dirname + '/db/tasks');

  Runs.belongsTo(Tasks, {
    foreignKey: 'taskid',
    onDelete: 'cascade'
  });

  Tasks.hasMany(Runs, {
    foreignKey: 'taskid'
  });

  return {
    sequelize: sequelize,
    Runs: Runs,
    Tasks: Tasks
  };

};
