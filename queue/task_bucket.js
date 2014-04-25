var Promise = require('promise');
var urlJoin = require('url-join');

function bucketConfig(tasks, input) {
  var config = {};
  for (var key in input) config[key] = input[key];
  config.Bucket = tasks.bucket;
  return config;
}

/**
Small abstraction on top of common task s3 related operations.

@param {AWS.S3} s3 object.
@param {String} bucket name.
@param {String} [publicHref] public prefix for urls.
*/
function Tasks(s3, bucket, publicHref) {
  this.bucket = bucket;
  this.s3 = s3;
  this.publicHref = publicHref ? publicHref : s3.endpoint.href;
}

Tasks.prototype = {

  get: function(path) {
    return this.s3.getObject(bucketConfig(this, {
      Key: path
    })).promise().then(function(response) {
      var data = response.data.Body.toString('utf8');
      return JSON.parse(data);
    });
  },

  put: function(path, object) {
    return this.s3.putObject(bucketConfig(
      this,
      {
        Key: path,
        Body: JSON.stringify(object),
        ContentType: 'application/json'
      }
    )).promise();
  },

  signedPutUrl: function(path, timeout) {
    var signedUrl = Promise.denodeify(this.s3.getSignedUrl.bind(this.s3));

    return signedUrl('putObject', bucketConfig(
      this,
      {
        Key: path,
        ContentType: 'application/json',
        Expires: timeout
      }
    ));
  },

  publicUrl: function(path) {
    return urlJoin(this.publicHref, path);
  }

};

module.exports = Tasks;