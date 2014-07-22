suite('Reaper tests', function() {
  var debug       = require('debug')('test:api:reaper');
  var assert      = require('assert');
  var slugid      = require('slugid');
  var _           = require('lodash');
  var Promise     = require('promise');
  var helper      = require('./helper');
  var subject     = helper.setup({
    title:          "Reaper tests",
    startReaper:    true
  });

  var makeTask = function(timeToDeadline, retries) {
    var created = new Date();
    var deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + timeToDeadline);
    // Use the same task definition for everything
    return {
      version:          '0.2.0',
      provisionerId:    'my-provisioner',
      workerType:       'my-worker',
      // let's just test a large routing key too, 128 chars please :)
      routing:          "jonasfj-test.what-a-hack",
      timeout:          20,
      retries:          retries,
      priority:         1,
      created:          created.toJSON(),
      deadline:         deadline.toJSON(),
      payload:          {},
      metadata: {
        name:           "Unit testing task",
        description:    "Task created during unit tests",
        owner:          'jonsafj@mozilla.com',
        source:         'https://github.com/taskcluster/taskcluster-queue'
      },
      tags: {
        purpose:        'taskcluster-testing'
      }
    };
  };

  test("Expire claim with retry", function() {
    this.timeout(60 * 1000);
    var taskId = slugid.v4();
    var task = makeTask(120, 5);
    return subject.queue.createTask(taskId, task).then(function() {
      // First runId is always 0, so we should be able to claim it here
      return subject.queue.claimTask(taskId, 0, {
        workerGroup:    'my-worker-group',
        workerId:       'my-worker'
      });
    }).then(function() {
      debug("Listen for the task to become pending again");
      return subject.listenFor(subject.queueEvents.taskPending({
        taskId:   taskId,
        runId:    1
      }));
    }).then(function(msg) {
      assert(msg.payload.status.retriesLeft === 4, "Expected 4 retries left");
      // Let's try to reclaim the old run, this should fail
      return subject.queue.reclaimTask(taskId, 0).then(function() {
        assert(false, "It shouldn't be possible to reclaim this run");
      }, function(err) {
        debug("Expected error: %j", err);
      });
    });
  });

  test("Expire claim without retry", function() {
    this.timeout(60 * 1000);
    var taskId = slugid.v4();
    var task = makeTask(120, 0);
    return subject.queue.createTask(taskId, task).then(function() {
      // First runId is always 0, so we should be able to claim it here
      return subject.queue.claimTask(taskId, 0, {
        workerGroup:    'my-worker-group',
        workerId:       'my-worker'
      });
    }).then(function() {
      debug("Listen for the task to fail, by claim-expired expiration");
      return subject.listenFor(subject.queueEvents.taskFailed({
        taskId:   taskId,
        runId:    0
      }));
    }).then(function(msg) {
      assert(msg.payload.status.runs[0].reasonResolved === 'claim-expired',
             "reasonsResolved isn't right");
      assert(msg.payload.status.runs.length === 1, "we should only have 1 run");
    });
  });

  test("Expire deadline", function() {
    this.timeout(60 * 1000);
    var taskId = slugid.v4();

    var task = makeTask(10, 5);
    return subject.queue.createTask(taskId, task).then(function() {
      // First runId is always 0, so we should be able to claim it here
      return subject.queue.claimTask(taskId, 0, {
        workerGroup:    'my-worker-group',
        workerId:       'my-worker'
      });
    }).then(function() {
      debug("Listen for the task to fail, by deadline expiration");
      return subject.listenFor(subject.queueEvents.taskFailed({
        taskId:   taskId,
        runId:    0
      }));
    }).then(function(msg) {
      assert(msg.payload.status.runs[0].reasonResolved === 'deadline-exceeded',
             "reasonsResolved isn't right");
    });
  });
});