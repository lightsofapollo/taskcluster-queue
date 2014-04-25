suite('task bucket', function() {
  var TaskBucket = require('../../queue/task_bucket');
  var AWS = require('aws-sdk-promise');

  var assert = require('assert');
  var config = require('../../config/tests')();
  var s3 = new AWS.S3(config.get('aws'));
  var slugid = require('slugid');

  var subject;
  setup(function() {
    subject = new TaskBucket(s3, config.get('queue:taskBucket'));
  });

  suite('#publicUrl', function() {
    test('with a host', function() {
      var subject = new TaskBucket(
        s3,
        'magicfoo',
        'https://things'
      );

      assert.equal(
        subject.publicUrl('wootbar'),
        'https://things/wootbar'
      );
    });

    test('without a host', function() {
      var subject = new TaskBucket(
        s3,
        'magicfoo'
      );

      assert.equal(
        subject.publicUrl('thething'),
        // href always has a trailing slash
        s3.endpoint.href + 'thething'
      );
    });
  });

  test('#signedPutUrl', function() {
    return subject.signedPutUrl('/what').then(function(url) {
      assert.ok(url.indexOf('/what') !== -1);
    });
  });

  test('#get/put', function() {
    var obj = { woot: true };
    var path = slugid.v4() + '-from-a-test';
    return subject.put(path, obj).then(function() {
      return subject.get(path);
    }).then(function(result) {
      assert.deepEqual(result, obj);
    });
  });

});
