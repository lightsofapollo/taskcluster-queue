suite('tasks', function() {
  var Promise = require('promise');
  var slugid = require('slugid');
  var assert = require('assert');
  var Tasks;
  var testDb = require('../db');
  var knex;

  function taskFactory(overrides) {
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

  suite('#completeTask', function() {
    var task;

    test('does not mark pending task', function() {
      var task = taskFactory();
      return Tasks.create(task).
        then(function() {
          return Tasks.completeTask(task.taskId);
        }).
        then(function(completed) {
          assert.ok(!completed);
          return Tasks.findBySlug(task.taskId);
        }).
        then(function(record) {
          assert.equal(record.state, task.state);
        });
    });

    test('marks running task complete', function() {
      var task = taskFactory();
      task.state = 'running';
      return Tasks.create(task).
        then(function() {
          return Tasks.completeTask(task.taskId);
        }).
        then(function(completed) {
          assert.ok(completed);
          return Tasks.findBySlug(task.taskId);
        }).
        then(function(record) {
          assert.equal(record.state, 'completed');
        });
    });
  });

  suite('#findAllPendingByRun', function() {
    function mapByTaskId(list) {
      return list.reduce(function(result, row) {
        result[row.taskId] = row;
        return result;
      }, {});
    }

    var taskFoo;
    setup(function() {
      taskFoo = taskFactory();
      taskFoo.provisionerId = 'foo';
      taskFoo.workerType = 'type';
      return Tasks.create(taskFoo).then(function() {
        return Tasks.claim(taskFoo.taskId, new Date(), runFactory());
      });
    });

    var taskBar;
    setup(function() {
      taskBar = taskFactory();
      taskBar.provisionerId = 'bar';
      taskBar.workerType = 'type';
      return Tasks.create(taskBar);
    });

    test('single result', function() {
      return Tasks.findAllWithRuns({
        provisionerId: 'bar'
      }).then(function(records) {
        assert.deepEqual(records[0], taskBar);
      });
    });

    test('find multiple', function() {
      return Tasks.findAllWithRuns({
        workerType: 'type'
      }).then(function(records) {
        var byId = mapByTaskId(records);

        return Promise.all([
          Tasks.findBySlugWithRuns(taskFoo.taskId),
          Tasks.findBySlugWithRuns(taskBar.taskId)
        ]).then(function(list) {
          assert.deepEqual(
            byId,
            mapByTaskId(list)
          );
        });
      });
    });

    suite('#rerunTask', function() {
      var task;
      setup(function() {
        task = taskFactory();
        task.state = 'running';
        return Tasks.create(task);
      });

      test('without a completed task', function() {
        return Tasks.rerunTask(task.taskId, 22).then(function(record) {
          assert.ok(!record, 'no task was updated for rerun');
        });
      });

      test('with a completed task', function() {
        var rerunTask;

        return Tasks.completeTask(task.taskId).then(function() {
          return Tasks.rerunTask(task.taskId, 22);
        }).then(function(value) {
          rerunTask = value;
          return Tasks.findBySlugWithRuns(task.taskId);
        }).then(function(record) {
          // returns the rerun task
          assert.deepEqual(rerunTask, record);

          assert.deepEqual(record.takenUntil, new Date(0));
          assert.equal(record.retries, 22);
        });
      });
    });

  });
});
