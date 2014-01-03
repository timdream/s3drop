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

        awsConfig.bucketURL = result['feed']['entry'][0]['content']['$t'];
        awsConfig.s3AccessKey = result['feed']['entry'][1]['content']['$t'];
        awsConfig.s3secret = result['feed']['entry'][2]['content']['$t'];

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

  // list files on the server
  listFiles: function ds_listFiles(callback) {
    var url = './api/list.php?access_token=' + this.accessToken;
    $.getJSON(url, function gotListFilesResult(result) {
      if (!result || result.error || !result.files) {
        alert(result.error || 'Get file list failed.');

        if (callback)
          callback();

        return;
      }

      if (callback)
        callback.call(this, result.files);
    }.bind(this));
  },

  // delete file on the server
  deleteFile: function ds_deleteFile(callback, filename) {
    $.post('./api/delete.php', {
        access_token: this.accessToken,
        filename: filename
      },
      function gotResult(result) {
        if (!result || result.error) {
          alert(result.error || 'Server Error');
          if (callback)
            callback.call(this, false);

          return;
        }

        callback.call(this, true);
      }.bind(this),
      'json'
    );
  }
};
