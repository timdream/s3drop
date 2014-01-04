'use strict';

var DropAPI = function DropAPI() {
  // AWS config (to be retrieved from GSpreadSheet)
  this.awsConfig = undefined;
  this.spreadsheetKey = '';
};
DropAPI.prototype = {
  GOOGLE_SPREADSHEET_API_URL: 'https://spreadsheets.google.com/',

  // Google OAuth2 token
  accessToken: '',

  awsConfig: null,

  hasS3Access: function ds_hasS3Access() {
    return !!this.awsConfig;
  },

  getConfig: function ds_getConfig(callback) {
    $.getJSON(
      this.GOOGLE_SPREADSHEET_API_URL + 'feeds/cells/' +
        this.spreadsheetKey + '/1/private/basic',
      {
        'min-col': 2,
        'max-col': 2,
        'alt': 'json',
        'access_token': this.accessToken
      }
    ).done(
      function gotConfigResult(result) {
        if (!result) {
          if (callback)
            callback.call(this, false);

          return;
        }

        var awsConfig = this.awsConfig = {};

        awsConfig.bucketName = result['feed']['entry'][0]['content']['$t'];
        awsConfig.accessKeyId = result['feed']['entry'][1]['content']['$t'];
        awsConfig.secretAccessKey = result['feed']['entry'][2]['content']['$t'];
        awsConfig.protocol = result['feed']['entry'][3]['content']['$t'];

        if (callback)
          callback.call(this, true);
      }.bind(this)
    ).fail(
      function getConfigError() {
        if (callback)
          callback.call(this, false);
      }
    );
  },

  getAWSAuthorizationInfo: function ds_getAWSAuthorizationInfo(method, uri,
                                                               headers) {
    var awsConfig = this.awsConfig;
    var headers = headers || {};
    var dateString = (new Date()).toUTCString();
    var stringToSign =
      /* HTTP-Verb */ method + '\n' +
      /* Content-MD5 */ (headers['Content-MD5'] || '') + '\n' +
      /* Content-Type */ (headers['Content-Type'] || '') + '\n' +
      /* Date */ '\n' +
      /* CanonicalizedAmzHeaders */ 'x-amz-date:' + dateString + '\n' +
      /* CanonicalizedResource */ '/' +
        awsConfig.bucketName + encodeURI(uri);

    var auth = 'AWS ' + awsConfig.accessKeyId + ':' +
      CryptoJS.HmacSHA1(stringToSign, this.awsConfig.secretAccessKey)
        .toString(CryptoJS.enc.Base64);

    return {
      'Authorization': auth,
      'x-amz-date': dateString
    };
  },

  getAWSSignedBucketObjectURL: function ds_getAWSSignedBucketObjectURL(uri, expires) {
    var awsConfig = this.awsConfig;
    var url = this.getAWSBucketObjectURL(uri);
    var stringToSign =
      /* HTTP-Verb */ 'GET\n' +
      /* Content-MD5 */ '\n' +
      /* Content-Type */ '\n' +
      /* Expires */ + expires + '\n' +
      /* CanonicalizedAmzHeaders */ '' +
      /* CanonicalizedResource */ '/' +
        awsConfig.bucketName + encodeURI(uri);

    var signature =
      CryptoJS.HmacSHA1(stringToSign, this.awsConfig.secretAccessKey)
        .toString(CryptoJS.enc.Base64);

    url += '?AWSAccessKeyId=' + awsConfig.accessKeyId +
      '&Signature=' + encodeURIComponent(signature) +
      '&Expires=' + expires;

    return url;
  },

  getAWSBucketObjectURL: function ds_getAWSBucketObjectURL(uri) {
    var awsConfig = this.awsConfig;
    var url = awsConfig.protocol + '://' +
      awsConfig.bucketName + '.s3.amazonaws.com' + uri;

    return url;
  },

  getAWSErrorInfo: function ds_getAWSErrorInfo(xmlDoc) {
    var xmlRoot = xmlDoc.firstChild;
    if (xmlRoot.nodeName !== 'Error')
      return '';
    // Example response can be found at
    // http://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#RESTErrorResponses
    return {
      code: xmlRoot.getElementsByTagName('Code')[0].textContent,
      message: xmlRoot.getElementsByTagName('Message')[0].textContent
    };
  },

  // list files on the server
  listFiles: function ds_listFiles(callback) {
    var url = this.getAWSBucketObjectURL('/');
    var headers = this.getAWSAuthorizationInfo('GET', '/');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);

    for (var name in headers) {
      xhr.setRequestHeader(name, headers[name]);
    }

    xhr.onreadystatechange = function xhrStateChange(evt) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      var xmlDoc = xhr.responseXML;
      if (!xmlDoc) {
        callback.call(this, false);

        return;
      }

      var errorInfo = this.getAWSErrorInfo(xmlDoc);
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
  },

  // delete file on the server
  deleteFile: function ds_deleteFile(callback, filename) {
    var uri = '/' + filename;
    var url = this.getAWSBucketObjectURL(uri);
    var headers = this.getAWSAuthorizationInfo('DELETE', uri);

    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', url);

    for (var name in headers) {
      xhr.setRequestHeader(name, headers[name]);
    }

    xhr.onreadystatechange = function xhrStateChange(evt) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      var xmlDoc = xhr.responseXML;

      if (xmlDoc) {
        var errorInfo = this.getAWSErrorInfo(xmlDoc);
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
  }
};
