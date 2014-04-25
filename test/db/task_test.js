suite('task', function() {
  var assert = require('assert');
  var testDb = require('../db');
  var slugid = require('slugid');

  var Tasks;
  setup(function() {
    return testDb().then(function(db) {
      Tasks = db.Tasks;
    });
  });

  test('taskIdSlug', function() {
    var slug = slugid.v4();
    return Tasks.create({
      "taskIdSlug":         slug,
      "provisionerId":      "jonasfj-test-provid",
      "workerType":         "jonasfj-test-worker",
      "state":              "pending",
      "reason":             "none",
      "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
      "retries":            0,
      "timeout":            60,
      "priority":           2.6,
      "created":            "2014-02-01T03:22:36.356Z",
      "deadline":           "2014-03-01T03:22:36.356Z",
      "takenUntil":         "1970-01-01T00:00:00.000Z"
    }).then(function(record) {
      assert.equal(record.taskIdSlug, slug);
      return Tasks.find({
        taskIdSlug: slug
      });
    }).then(function(record) {
      assert.equal(record.taskIdSlug, slug);
    });
  });
});
