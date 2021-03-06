var server        = require('../server'); // include for configuration
var data          = require('../queue/data');
var debug         = require('debug')('tests:queue:data');
var _             = require('lodash');
var validate      = require('../utils/validate');
var slugid        = require('../utils/slugid');


var setupDatabase = false;

/** Setup database */
exports.setUp = function(callback)  {
  if (!setupDatabase) {
    validate.setup();
    setupDatabase = true;
    debug("Setting up database");
    data.setupDatabase().then(function(server) {
      debug("Connected to configured database");
      callback();
    });
  } else {
    callback();
  }
}

// Count tearDowns so we terminate server after last tear down
// the server isn't exactly restartable, due to limitations in pg.js
var tearDowns = 0;

/** Close server application */
exports.tearDown = function(callback) {
  tearDowns += 1;
  if(tearDowns == _.keys(exports).length) {
    debug("Closing database connection");
    data.disconnect();
  }
  callback();
}

/** Test that we can create and delete tasks */
exports['Create and delete task'] = function(test) {
  test.expect(2);

  // Task structure to insert
  var task = {
    "taskId":             slugid.v4(),
    "provisionerId":      "jonasfj-test-provid",
    "workerType":         "jonasfj-test-worker",
    "runs":               [], // This will be ignored by createTask
    "state":              "pending",
    "reason":             "none",
    "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
    "retries":            0,
    "timeout":            60,
    "priority":           2.6,
    "created":            "2014-02-01T03:22:36.356Z",
    "deadline":           "2014-03-01T03:22:36.356Z",
    "takenUntil":         "1970-01-01T00:00:00.000Z"
  };

  data.createTask(task).then(function() {
    test.ok(true);
  }, function(err) {
    debug("Failed to create task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to create task");
  }).then(function() {
    data.deleteTask(task.taskId).then(function() {
      test.ok(true);
      test.done();
    }, function(err) {
      debug("Failed to delete task, error: %s as JSON: %j", err, err);
      test.ok(false, "Failed to delete task");
      test.done();
    });
  })
};


/** Test that we can create, load and delete tasks */
exports['Create, load and delete task'] = function(test) {
  test.expect(5);

  // Task structure to insert
  var task = {
    "taskId":             "w1mNqBW9QLGD5TL1srCK8w",
    "provisionerId":      "jonasfj-test-provid",
    "workerType":         "jonasfj-test-worker",
    "runs":               [], // This will be ignored by createTask
    "state":              "pending",
    "reason":             "none",
    "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
    "retries":            0,
    "timeout":            60,
    "priority":           2.6,
    "created":            "2014-02-01T03:22:36.356Z",
    "deadline":           "2014-03-01T03:22:36.356Z",
    "takenUntil":         "1970-01-01T00:00:00.000Z"
  };

  data.createTask(task).then(function() {
    test.ok(true);
  }, function(err) {
    debug("Failed to create task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to create task");
    test.done();
  }).then(function() {
    return data.loadTask(task.taskId);
  }).then(function(task_status) {
    test.ok(task_status);
    test.equal(task_status.timeout, task.timeout);
    // Validate the result, this should match our schema
    var errors = validate(
      task_status,
      'http://schemas.taskcluster.net/queue/v1/task-status.json#'
    );
    // test for errors
    test.equal(errors, null, "Validation of loaded task status structure failed");
    if(errors) {
      debug('Validation of loaded data failed, errors: %j', errors);
    }

  }).then(function() {
    return data.deleteTask(task.taskId);
  }).then(function() {
    test.ok(true);
    test.done();
  }, function(err) {
    debug("Failed to delete task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to delete task");
    test.done();
  });
};



/** Test that we can create, claim and delete tasks */
exports['Create, claim and delete task'] = function(test) {
  test.expect(3);

  // Task structure to insert
  var task = {
    "taskId":             slugid.v4(),
    "provisionerId":      "jonasfj-test-provid",
    "workerType":         "jonasfj-test-worker",
    "runs":               [], // This will be ignored by createTask
    "state":              "pending",
    "reason":             "none",
    "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
    "retries":            0,
    "timeout":            60,
    "priority":           2.6,
    "created":            "2014-02-01T03:22:36.356Z",
    "deadline":           "2014-03-01T03:22:36.356Z",
    "takenUntil":         "1970-01-01T00:00:00.000Z"
  };

  data.createTask(task).then(function() {
    test.ok(true);
  }, function(err) {
    debug("Failed to create task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to create task");
    test.done();
  }).then(function() {
    return data.claimTask(task.taskId, new Date(), {
      workerId:    'my-worker',
      workerGroup: 'my-cluster'
    });
  }).then(function(result) {
    test.ok(result != null);
  }).then(function() {
    return data.deleteTask(task.taskId);
  }).then(function() {
    test.ok(true);
    test.done();
  }, function(err) {
    debug("Failed to delete task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to delete task");
    test.done();
  });
};



/** Test that we can create, complete and delete tasks */
exports['Create, claim, complete and delete task'] = function(test) {
  test.expect(3);

  // Task structure to insert
  var task = {
    "taskId":             slugid.v4(),
    "provisionerId":      "jonasfj-test-provid",
    "workerType":         "jonasfj-test-worker",
    "runs":               [], // This will be ignored by createTask
    "state":              "pending",
    "reason":             "none",
    "routing":            "jonasfjs-precious-tasks.stupid-test.aws",
    "retries":            0,
    "timeout":            60,
    "priority":           2.6,
    "created":            "2014-02-01T03:22:36.356Z",
    "deadline":           "2014-03-01T03:22:36.356Z",
    "takenUntil":         "1970-01-01T00:00:00.000Z"
  };

  data.createTask(task).then(function() {
    test.ok(true);
  }, function(err) {
    debug("Failed to create task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to create task");
    test.done();
  }).then(function() {
    return data.claimTask(task.taskId, new Date(), {
      workerId:     'my-worker',
      workerGroup:  'my-cluster'
    });
  }).then(function() {
    return data.completeTask(task.taskId);
  }).then(function(result) {
    test.ok(result);
  }).then(function() {
    return data.deleteTask(task.taskId);
  }).then(function() {
    test.ok(true);
    test.done();
  }, function(err) {
    debug("Failed to delete task, error: %s as JSON: %j", err, err);
    test.ok(false, "Failed to delete task");
    test.done();
  });
};

