var mem = require('memoizee');
var slugid = require('slugid');
var _ = require('lodash');

var FIELDS = [
  'taskId',
  'provisionerId',
  'workerType',
  'state',
  'reason',
  'routing',
  'retries',
  'timeout',
  'priority',
  'created',
  'deadline',
  'takenUntil'
];

/**
Build a record suitable for storage in the database from an external object.

XXX: Ideally this would be done by a "model" rather then the store in DM pattern.

@return {Object}
*/
function incomingTask(input) {
  var record = FIELDS.reduce(function(record, key) {
    record[key] = input[key];
    return record;
  }, {});

  record.taskId = slugid.decode(record.taskId);
  return record;
}

/**
Build a record suitable for returning from the store.
*/
function outgoingTask(input) {
  // we can manipulate the state of the outgoing task since it is fully
  // internal to the store and has no shared state.
  input.taskId = slugid.encode(input.taskId);
  return input;
}

module.exports = mem(function(knex) {
  return {
    create: function(task) {
      return knex('tasks').insert(incomingTask(task));
    },

    delete: function(slug) {
      var taskId = slugid.decode(slug);
      return knex('tasks').where('taskId', taskId).del();
    },

    findBySlug: function(slug) {
      var taskId = slugid.decode(slug);

      return knex('tasks').where('taskId', taskId).limit(1).then(function(list) {
        return list[0] && outgoingTask(list[0]);
      });
    }
  };
});
