suite('tasks', function() {
  var slugid = require('slugid');
  var assert = require('assert');
  var Tasks;
  var testDb = require('../db');
  var knex;

  function taskFactory() {
    return {
      "taskId":             slugid.v4(),
      "provisionerId":      "jonasfj-test-provid",
      "workerType":         "jonasfj-test-worker",
      "state":              "pending",
      "reason":             "none",
      "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
      "retries":            0,
      "timeout":            60,
      "priority":           2.6,
      "created":            new Date("2014-02-01T03:22:36.356Z"),
      "deadline":           new Date("2014-03-01T03:22:36.356Z"),
      "takenUntil":         new Date("1970-01-01T00:00:00.000Z")
    };
  }

  function runFactory() {
    return { workerId: 1, workerGroup: 'group' };
  }

  setup(function() {
    return testDb().then(function(_knex) {
      knex = _knex;
      Tasks = require('../../store/tasks')(knex);
    });
  });

  test('task storage', function() {
    var task = taskFactory();
    return Tasks.create(task).then(function() {
      return Tasks.findBySlug(task.taskId);
    }).then(function(record) {
      assert.deepEqual(task, record);
      return Tasks.delete(task.taskId);
    }).then(function() {
      return Tasks.findBySlug(task.taskId);
    }).then(function(record) {
      assert.equal(record, null);
    });
  });

  suite('#claim', function() {
    var task;
    setup(function() {
      task = taskFactory();
      return Tasks.create(task);
    });

    test('attempt to claim and fail', function() {
      task.state = 'running';
      return knex('tasks').
        update({ state: 'running' }).
        where('taskId', slugid.decode(task.taskId)).
        then(function() {
          return Tasks.claim(task.taskId, new Date(), {});
        }).then(function(taskId) {
          assert.equal(taskId, null);
        });
    });

    test('reclaim', function() {
      var run = runFactory();
      var reclaimDate = new Date(2020, 1);
      return Tasks.claim(task.taskId, new Date(), run).then(function() {
        return Tasks.findBySlugWithRuns(task.taskId);
      }).then(function(task) {
        var createdRun = task.runs[0];
        return Tasks.claim(task.taskId, reclaimDate, createdRun);
      }).then(function(result) {
        return Tasks.findBySlug(task.taskId);
      }).then(function(updatedTask) {
        assert.deepEqual(updatedTask.takenUntil, reclaimDate);
      });
    });

    test('create first run and claim', function() {
      var run = runFactory();
      return Tasks.claim(task.taskId, new Date(), run).
        then(function(runId) {
          assert.equal(runId, 1);
          return Tasks.findBySlugWithRuns(task.taskId);
        }).
        then(function(taskWithRuns) {
          task.runs = [
            {
              runId: 1,
              workerId: run.workerId,
              workerGroup: run.workerGroup
            }
          ];

          task.retries--;
          task.state = 'running';

          assert.deepEqual(task, taskWithRuns);
        });
    });
  });
});
