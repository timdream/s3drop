'use strict';

var FileStoreBase = function() {
};
FileStoreBase.prototype.getDownloadURL = function(uri) {
  throw new Error('Not implemented.');
};
FileStoreBase.prototype.getUploadInfo = function(uri) {
  throw new Error('Not implemented.');
};
FileStoreBase.prototype.handleUploadComplete = function(xhr) {
  throw new Error('Not implemented.');
};
FileStoreBase.prototype.listFiles = function(callback) {
  throw new Error('Not implemented.');
};
FileStoreBase.prototype.deleteFile = function(callback, filename) {
  throw new Error('Not implemented.');
};

var AmazonS3FileStore = function() {
  this.awsTimeOffset = 0;
};

AmazonS3FileStore.prototype = new FileStoreBase;

AmazonS3FileStore.prototype.AWS_BUCKET_URL =
  '%protocol://%bucketname.s3.amazonaws.com%uri';

AmazonS3FileStore.prototype.getDownloadURL = function(uri, expireDate) {
  var config = this.config;

  var expires;
  if (this.awsTimeOffset === 0) {
    expires = Math.floor(expireDate.getTime() / 1000);
  } else {
    expires = Math.floor((expireDate.getTime() + this.awsTimeOffset) / 1000);
  }
  var url = this._getAWSBucketObjectURL(uri, config.protocol);
  var stringToSign =
    /* HTTP-Verb */ 'GET\n' +
    /* Content-MD5 */ '\n' +
    /* Content-Type */ '\n' +
    /* Expires */ + expires + '\n' +
    /* CanonicalizedAmzHeaders */ '' +
    /* CanonicalizedResource */ '/' +
      config.bucketName + encodeURI(uri);

  var signature =
    CryptoJS.HmacSHA1(stringToSign, this.config.secretAccessKey)
      .toString(CryptoJS.enc.Base64);

  url += '?AWSAccessKeyId=' + config.accessKeyId +
    '&Signature=' + encodeURIComponent(signature) +
    '&Expires=' + expires;

  return url;
};

AmazonS3FileStore.prototype.getUploadInfo = function(uri, extraHeaders) {
  return {
    url: this._getAWSBucketObjectURL(uri),
    headers: this._getAWSAuthorizationInfo('PUT', uri, extraHeaders),
    method: 'PUT'
  }
};

AmazonS3FileStore.prototype.handleUploadComplete = function(xhr) {
  this._updateAWSTimeOffset(xhr.getResponseHeader('Date'));

  var xmlDoc = xhr.responseXML;
  if (xmlDoc) {
    var errorInfo = this._getAWSErrorInfo(xmlDoc);
    if (errorInfo) {
      return {
        success: false,
        errorInfo: errorInfo
      };
    }
  }

  if (xhr.status !== 200) {
    return {
      success: false
    };
  }

  return {
    success: true
  };
};

AmazonS3FileStore.prototype.listFiles = function(callback) {
  var url = this._getAWSBucketObjectURL('/');
  var headers = this._getAWSAuthorizationInfo('GET', '/');

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);

  for (var name in headers) {
    xhr.setRequestHeader(name, headers[name]);
  }

  xhr.onreadystatechange = function xhrStateChange(evt) {
    if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      this._updateAWSTimeOffset(xhr.getResponseHeader('Date'));
    }

    if (xhr.readyState !== XMLHttpRequest.DONE)
      return;

    var xmlDoc = xhr.responseXML;
    if (!xmlDoc) {
      callback.call(this, false);

      return;
    }

    var errorInfo = this._getAWSErrorInfo(xmlDoc);
    if (errorInfo) {
      callback.call(this, false, errorInfo);

      return;
    }

    // Example response can be found at
    // http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGET.html
    var filenamesNodeList = xmlDoc.firstChild.getElementsByTagName('Key');
    var filenames =
      Array.prototype.map.call(filenamesNodeList, function(filename) {
        return filename.textContent;
      });

    callback.call(this, filenames);
  }.bind(this);
  xhr.send();
};

AmazonS3FileStore.prototype.deleteFile = function(callback, filename) {
  var uri = '/' + filename;
  var url = this._getAWSBucketObjectURL(uri);
  var headers = this._getAWSAuthorizationInfo('DELETE', uri);

  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', url);

  for (var name in headers) {
    xhr.setRequestHeader(name, headers[name]);
  }

  xhr.onreadystatechange = function xhrStateChange(evt) {
    if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
      this._updateAWSTimeOffset(xhr.getResponseHeader('Date'));
    }

    if (xhr.readyState !== XMLHttpRequest.DONE)
      return;

    var xmlDoc = xhr.responseXML;

    if (xmlDoc) {
      var errorInfo = this._getAWSErrorInfo(xmlDoc);
      if (errorInfo) {
        callback.call(this, false, errorInfo);

        return;
      } else if (xhr.status !== 204) {
        callback.call(this, false);

        return;
      }
    }

    callback.call(this, (xhr.status === 204));
  }.bind(this);
  xhr.send();
};

AmazonS3FileStore.prototype._updateAWSTimeOffset = function(dateString) {
  if (!dateString)
    return;

  var currentTime = (new Date()).getTime();
  var awsTime = (new Date(dateString)).getTime();

  var offset = awsTime - currentTime;
  if (offset > 1000)
    this.awsTimeOffset = offset;
};

AmazonS3FileStore.prototype._getAWSDate = function() {
  if (this.awsTimeOffset === 0) {
    return (new Date());
  }
  return new Date((new Date()).getTime() + this.awsTimeOffset);
};

AmazonS3FileStore.prototype._getAWSAuthorizationInfo = function(method, uri,
                                                                headers) {
  var config = this.config;
  var headers = headers || {};
  var dateString = this._getAWSDate().toUTCString();
  var stringToSign =
    /* HTTP-Verb */ method + '\n' +
    /* Content-MD5 */ (headers['Content-MD5'] || '') + '\n' +
    /* Content-Type */ (headers['Content-Type'] || '') + '\n' +
    /* Date */ '\n' +
    /* CanonicalizedAmzHeaders */ 'x-amz-date:' + dateString + '\n' +
    /* CanonicalizedResource */ '/' +
      config.bucketName + encodeURI(uri);

  var auth = 'AWS ' + config.accessKeyId + ':' +
    CryptoJS.HmacSHA1(stringToSign, this.config.secretAccessKey)
      .toString(CryptoJS.enc.Base64);

  return {
    'Authorization': auth,
    'x-amz-date': dateString
  };
};

AmazonS3FileStore.prototype._getAWSBucketObjectURL = function(uri, protocol) {
  var config = this.config;
  var url = this.AWS_BUCKET_URL
    .replace('%protocol', protocol || 'https')
    .replace('%bucketname', config.bucketName)
    .replace('%uri', uri);

  return url;
};

AmazonS3FileStore.prototype._getAWSErrorInfo = function(xmlDoc) {
  var xmlRoot = xmlDoc.firstChild;
  if (xmlRoot.nodeName !== 'Error')
    return '';
  // Example response can be found at
  // http://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#RESTErrorResponses
  return {
    code: xmlRoot.getElementsByTagName('Code')[0].textContent,
    message: xmlRoot.getElementsByTagName('Message')[0].textContent
  };
};
