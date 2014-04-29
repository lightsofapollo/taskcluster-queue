var Promise = require('promise');

module.exports = function reaper(interval, Tasks, Events) {

  function emitFailedMessage(task) {
    var message = {
      version: '0.2.0',
      status: task
    };

    var run = task.runs[task.runs.length];
    if (run) {
      message.runId = run.runId;
      message.workerGroup = run.workerGroup;
      message.workerId = run.workerId;
    }

    return Events.publish('task-failed', message);
  }

  function emitPendingMessage(task) {
    return Events.publish('task-pending', {
      version: '0.2.0',
      status: task
    });
  }

  function reapFailed() {
    return Tasks.findAndUpdateFailed().
      then(function(list) {
        return list.map(emitFailedMessage);
      });
  }

  function reapPending() {
    return Tasks.findAndUpdatePending().
      then(function(list) {
        return list.map(emitPendingMessage);
      });
  }

  function reap() {
    return Promise.all([reapPending, reapFailed]);
  }

  /**
  XXX: The interval handling is scary (ported from data.js) basically it calls the db every N seconds
       and hopes for the best regardless of success or failure.
  */
  var intervalHandler = setInterval(reap, interval);

  return {
    destroy: function() {
      clearInterval(intervalHandler);
    }
  };
};
