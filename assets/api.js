'use strict';

var DropAPI = function DropAPI() {
  this.config = undefined;
};
DropAPI.prototype = {
  accessToken: '',
  getConfig: function ds_getConfig(callback) {
    $.getJSON('./api/getconfig.php', function gotGetConfigResult(result) {
      if (!result || result.error) {
        alert(result.error || 'Get config failed.');
        if (callback)
          callback.call(this);

        return;
      }

      this.config = result;
      if (callback)
        callback.call(this, result);
    }.bind(this));
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
