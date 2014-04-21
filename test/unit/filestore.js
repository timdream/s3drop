'use strict';

module('AmazonS3FileStore');

test('getDownloadURL', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var url = fileStore.getDownloadURL('/foobar', new Date(1E12));

  equal(url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar?' +
    'AWSAccessKeyId=FAKE_AWS_KEY&' +
    'Signature=8LWKqeGFzC6jBrwsjIKC%2B8OFU2I%3D&Expires=1000000000',
    'URL is correct.')
});

test('getDownloadURL (with awsTimeOffset)', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.awsTimeOffset = 5000;
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var url = fileStore.getDownloadURL('/foobar', new Date(1E12));

  equal(url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar?' +
    'AWSAccessKeyId=FAKE_AWS_KEY&' +
    'Signature=WclBt81lyoc62G%2FjuGvh7aFlaEc%3D&Expires=1000000005',
    'URL is correct.')
});

test('getUploadInfo', function() {
  var fileStore = new AmazonS3FileStore();

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };
  var info = fileStore.getUploadInfo('/foobar');

  deepEqual(info, {
    'headers': {
      'Authorization': 'AWS FAKE_AWS_KEY:0ausxjwLqj06P+PMJDt6XELTQtk=',
      'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
    },
    'method': 'PUT',
    'url': 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar'
  }, 'info is correct.');

  ok(dateStub.calledWith(), 'Call with the right time');
  dateStub.restore();
});

test('getUploadInfo (with awsTimeOffset)', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.awsTimeOffset = 5000;

  var RealDate = Date;
  window.Date = function(time) {
    switch (time) {
      case undefined:
        return new RealDate(1E12);
        break;

      case 1E12 + 5000:
        return new RealDate(1E12 + 5000);
        break;

      default:
        throw 'Unexpected call';
    }
  };

  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };
  var info = fileStore.getUploadInfo('/foobar');

  deepEqual(info, {
    'headers': {
      'Authorization': 'AWS FAKE_AWS_KEY:lDxNLuWV0rkV7FTcL1k9rUohDX4=',
      'x-amz-date': 'Sun, 09 Sep 2001 01:46:45 GMT'
    },
    'method': 'PUT',
    'url': 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar'
  }, 'info is correct.');

  window.Date = RealDate;
});

test('getUploadInfo (with Content-Type)', function() {
  var fileStore = new AmazonS3FileStore();

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };
  var info = fileStore.getUploadInfo('/foobar', {
    'Content-Type': 'text/plain'
  });

  deepEqual(info, {
    'headers': {
      'Authorization': 'AWS FAKE_AWS_KEY:QXvfJDnFu1ZnczOEg41E7UR4XJg=',
      'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
    },
    'method': 'PUT',
    'url': 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar'
  }, 'info is correct.');

  dateStub.restore();
});

test('getUploadInfo (with Content-MD5)', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  var info = fileStore.getUploadInfo('/foobar', {
    'Content-MD5': 'd41d8cd98f00b204e9800998ecf8427e'
  });

  deepEqual(info, {
    'headers': {
      'Authorization': 'AWS FAKE_AWS_KEY:/PKlQgvHuvOltIn6ks518TZb3mU=',
      'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
    },
    'method': 'PUT',
    'url': 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar'
  }, 'info is correct.');

  dateStub.restore();
});

test('listFiles', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var request;
  fakeXhr.onCreate = function(req) {
    request = req;
  };

  fileStore.listFiles(function(filenames) {
    deepEqual(filenames, ['my-image.jpg', 'my-third-image.jpg'],
      'File list returns');

    fakeXhr.restore();
    start();
  });

  dateStub.restore();
  equal(request.url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/', 'URL is correct');
  equal(request.method, 'GET', 'Method is correct');
  deepEqual(request.requestHeaders, {
    'Authorization': 'AWS FAKE_AWS_KEY:8URyzG5HCrEcDr0yynSS6cXg+4I=',
    'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
  }, 'Header is correct');

  var xmlString = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
        '<Name>bucket</Name>' +
        '<Prefix/>' +
        '<Marker/>' +
        '<MaxKeys>1000</MaxKeys>' +
        '<IsTruncated>false</IsTruncated>' +
        '<Contents>' +
            '<Key>my-image.jpg</Key>' +
            '<LastModified>2009-10-12T17:50:30.000Z</LastModified>' +
            '<ETag>&quot;fba9dede5f27731c9771645a39863328&quot;</ETag>' +
            '<Size>434234</Size>' +
            '<StorageClass>STANDARD</StorageClass>' +
            '<Owner>' +
                '<ID>75aa57f09aa0c8caeab4f8c24e99d10f8e7' +
                'faeebf76c078efc7c6caea54ba06a</ID>' +
                '<DisplayName>mtd@amazon.com</DisplayName>' +
            '</Owner>' +
        '</Contents>' +
        '<Contents>' +
           '<Key>my-third-image.jpg</Key>' +
             '<LastModified>2009-10-12T17:50:30.000Z</LastModified>' +
            '<ETag>&quot;1b2cf535f27731c974343645a3985328&quot;</ETag>' +
            '<Size>64994</Size>' +
            '<StorageClass>STANDARD</StorageClass>' +
            '<Owner>' +
                '<ID>75aa57f09aa0c8caeab4f8c24e99d10f8e7' +
                'faeebf76c078efc7c6caea54ba06a</ID>' +
                '<DisplayName>mtd@amazon.com</DisplayName>' +
            '</Owner>' +
        '</Contents>' +
    '</ListBucketResult>';

  stop();
  request.respond(200, {
    'Content-Type': 'application/xml'
  }, xmlString);
});

test('listFiles (server error)', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var request;
  fakeXhr.onCreate = function(req) {
    request = req;
  };

  fileStore.listFiles(function(filenames, errorInfo) {
    equal(filenames, false,
      'File list return false');

    deepEqual(errorInfo, {
      'code': 'NoSuchKey',
      'message': 'The resource you requested does not exist'
    } , 'Errorinfo');

    fakeXhr.restore();
    start();
  });

  dateStub.restore();
  equal(request.url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/', 'URL is correct');
  equal(request.method, 'GET', 'Method is correct');
  deepEqual(request.requestHeaders, {
    'Authorization': 'AWS FAKE_AWS_KEY:8URyzG5HCrEcDr0yynSS6cXg+4I=',
    'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
  }, 'Header is correct');

  var xmlString = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Error>' +
      '<Code>NoSuchKey</Code>' +
      '<Message>The resource you requested does not exist</Message>' +
      '<Resource>/mybucket/myfoto.jpg</Resource>' +
      '<RequestId>4442587FB7D0A2F9</RequestId>' +
    '</Error>';

  stop();
  request.respond(404, {
    'Content-Type': 'application/xml'
  }, xmlString);
});

test('deleteFile', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var request;
  fakeXhr.onCreate = function(req) {
    request = req;
  };

  fileStore.deleteFile(function(status) {
    ok(status, 'removed');

    fakeXhr.restore();
    start();
  }, 'foobar');

  dateStub.restore();
  equal(request.url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar',
    'URL is correct');
  equal(request.method, 'DELETE', 'Method is correct');
  deepEqual(request.requestHeaders, {
    // From sinon fakeXhr
    'Content-Type': 'text/plain;charset=utf-8',
    'Authorization': 'AWS FAKE_AWS_KEY:qJq7WMl06kerDXInL3l+SU8ZwiE=',
    'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
  }, 'Header is correct');

  stop();
  request.respond(204, {}, '');
});

test('deleteFile (server error)', function() {
  var fileStore = new AmazonS3FileStore();
  fileStore.config = {
    'accessKeyId': 'FAKE_AWS_KEY',
    'bucketName': 'FAKE_BUCKET_NAME',
    'protocol': 'https',
    'secretAccessKey': 'FAKE_AWS_SECRET'
  };

  var RealDate = Date;
  var dateStub = sinon.stub(window, 'Date');
  dateStub.returns(new RealDate(1E12));

  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var request;
  fakeXhr.onCreate = function(req) {
    request = req;
  };

  fileStore.deleteFile(function(status, errorInfo) {
    equal(status, false, 'not removed');

    deepEqual(errorInfo, {
      'code': 'NoSuchKey',
      'message': 'The resource you requested does not exist'
    } , 'Errorinfo');

    fakeXhr.restore();
    start();
  }, 'foobar');

  dateStub.restore();
  equal(request.url, 'https://FAKE_BUCKET_NAME.s3.amazonaws.com/foobar',
    'URL is correct');
  equal(request.method, 'DELETE', 'Method is correct');
  deepEqual(request.requestHeaders, {
    // From sinon fakeXhr
    'Content-Type': 'text/plain;charset=utf-8',
    'Authorization': 'AWS FAKE_AWS_KEY:qJq7WMl06kerDXInL3l+SU8ZwiE=',
    'x-amz-date': 'Sun, 09 Sep 2001 01:46:40 GMT'
  }, 'Header is correct');

  var xmlString = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Error>' +
      '<Code>NoSuchKey</Code>' +
      '<Message>The resource you requested does not exist</Message>' +
      '<Resource>/mybucket/myfoto.jpg</Resource>' +
      '<RequestId>4442587FB7D0A2F9</RequestId>' +
    '</Error>';

  stop();
  request.respond(404, {
    'Content-Type': 'application/xml'
  }, xmlString);
});
