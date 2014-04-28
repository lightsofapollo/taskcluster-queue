suite('tasks', function() {
  var assert = require('assert');
  var Tasks;
  var testDb = require('../db');
  var knex;

  setup(function() {
    return testDb().then(function(_knex) {
      knex = _knex;
      Tasks = require('../../store/tasks')(knex);
    });
  });

  var slugid = require('slugid');

  test('task storage', function() {
    var task = {
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
});
