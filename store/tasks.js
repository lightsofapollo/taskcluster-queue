var mem = require('memoizee');
var slugid = require('slugid');
var _ = require('lodash');
var Promise = require('promise');

var TASK_FIELDS = [
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

var RUN_FIELDS = [
  'runId',
  'workerGroup',
  'workerId'
];

/**
Build a record suitable for storage in the database from an external object.

XXX: Ideally this would be done by a "model" rather then the store in DM pattern.

@return {Object}
*/
function incomingTask(input) {
  var record = TASK_FIELDS.reduce(function(record, key) {
    record[key] = input[key];
    return record;
  }, {});

  record.taskId = slugid.decode(record.taskId);
  return record;
}

function mapTask(taskId, row) {
  var record = TASK_FIELDS.reduce(function(model, key) {
    model[key] = row[key];
    return model;
  }, {});
  record.taskId = taskId;
  return record;
}

function mapRun(row) {
  return RUN_FIELDS.reduce(function(model, key) {
    model[key] = row[key];
    return model;
  }, {});
}

/**
Build a record suitable for returning from the store.
*/
function outgoingTasks(rows) {
  var byTaskId = {};

  return rows.reduce(function(tasks, row) {
    // extract the task by task id (only create one)
    var taskId = slugid.encode(row.taskId);

    var task = byTaskId[taskId];
    if (!task) {
      task = mapTask(taskId, row);
      tasks.push(task);
    }

    if (row.runId) {
      var runs = task.runs || (task.runs = []);
      runs.push(mapRun(row));
    }

    return tasks;
  }, []);
}

function decorateDecodeSlug(method) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    args[0] = slugid.decode(args[0]);
    return method.apply(this, args);
  };
}

function first(rows) {
  return rows[0];
}


module.exports = mem(function(knex) {
  return {
    create: function(task) {
      return knex('tasks').insert(incomingTask(task));
    },

    delete: decorateDecodeSlug(function(taskId) {
      return knex('tasks').where('taskId', taskId).del();
    }),

    findBySlug: decorateDecodeSlug(function(taskId) {
      return knex('tasks').
        where('taskId', taskId).
        limit(1).
        then(outgoingTasks).
        then(first);
    }),

    findBySlugWithRuns: decorateDecodeSlug(function(taskId) {
      return knex('tasks').
        options({ nestTables: true }).
        join('runs', 'tasks.taskId', '=', 'runs.taskId', 'left outer').
        where('tasks.taskId', taskId).
        then(outgoingTasks).
        then(first);
    }),

    claim: function(slug, takenUntil, run) {
      if (run.runId) {
        return this.refreshClaim(slug, takenUntil, run);
      }
      return this.createClaim(slug, takenUntil, run);
    },

    refreshClaim: decorateDecodeSlug(function(taskId, takenUntil, run) {
      return knex('tasks').
        update({
          takenUntil: takenUntil,
        }).
        where('taskId', taskId).
        andWhere('state', 'running');
    }),

    createClaim: decorateDecodeSlug(function(taskId, takenUntil, run) {
      return knex.transaction(function(t) {
        // attempt to acquire the task
        var markRunning = knex('tasks').
          transacting(t).
          update({
            retries: knex.raw('"retries" - 1'),
            state: 'running'
          }).
          where('taskId', taskId).
          andWhere('state', 'pending');

        return markRunning.then(function(count) {
          if (!count) {
            return t.commit([]);
          }

          var runIdCount = knex('runs').
            select(knex.raw('COUNT("runId") + 1')).
            where('taskId', taskId).
            toString();

          return knex('runs').
            transacting(t).
            insert({
              taskId: taskId,
              workerGroup: run.workerGroup,
              workerId: run.workerId,
              runId: knex.raw('(' + runIdCount + ')')
            }).
            returning('runId').
            then(t.commit).
            catch(t.rollback);
        });
      }).
      then(first);
    })

  };
});
