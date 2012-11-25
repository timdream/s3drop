'use strict';

/* Actual front-end for Drop */

jQuery(function initDrop($) {
  // ==== Remote Server functions
  // (doesn't include upload)
  var Server = {
    // get config
    getConfig: function getConfig(callback) {
      $.getJSON('./api/getconfig.php', function gotGetConfigResult(result) {
        if (!result || result.error) {
          alert(result.error || 'Get config failed.');
          if (callback)
            callback();

          return;
        }

        Server.config = result;
        if (callback)
          callback();
      });
    },
    // list files on the server
    listFiles: function listFiles(callback) {
      var url = './api/list.php?access_token=' + GO2.getAccessToken();
      $.getJSON(url, function gotListFilesResult(result) {
        if (!result || result.error || !result.files) {
          alert(result.error || 'Get file list failed.');

          if (callback)
            callback();

          return;
        }

        if (callback)
          callback(result.files);
      });
    },
    // delete file on the server
    deleteFile: function deleteFile(callback, filename) {
      $.post('./api/delete.php', {
          access_token: GO2.getAccessToken(),
          filename: filename
        },
        function gotResult(result) {
          if (!result || result.error) {
            alert(result.error || 'Server Error');
            if (callback)
              callback(false);

            return;
          }

          callback(true);
        },
        'json'
      );
    }
  };

  // ==== Front-end Controls
  (function init() {
    var $body = $(document.body);

    // Allow dropping file to container
    $('#file_container').on('drop', function dropFile(evt) {
      evt.preventDefault();
      $body.removeClass('dragover');

      if (!Server.config.disable_login && !GO2.getAccessToken()) {
        alert('You need to login first.');
        return;
      }

      QueueUpload.addQueue(evt.originalEvent.dataTransfer.files);
    }).on('dragover', function dragoverFile(evt) {
      evt.preventDefault();
    }).on('dragenter', function dragenterFile(evt) {
      $body.addClass('dragover');
      evt.preventDefault();
    }).on('dragleave', function dragleaveFile(evt) {
      $body.removeClass('dragover');
      evt.preventDefault();
    });

    // Prevent user from leaving page when drop
    // a file outside of container accidentally
    $(window).on('drop', function dropFile(evt) {
      evt.preventDefault();
    }).on('dragover', function dragoverFile(evt) {
      evt.preventDefault();
    });

    // Allow user to select files from the control
    $('#files').on('change', function changeFiles(evt) {
      if (!Server.config.disable_login && !GO2.getAccessToken()) {
        alert('You need to login first.');

        this.form.reset();
        return;
      }

      QueueUpload.addQueue(this.files);

      // Reset the from to clean up selected files
      // so user may be able to select again.
      this.form.reset();
    });

    // Textual label status
    var $status = $('#status');
    function updateStatus(name, loaded, total) {
      if (!QueueUpload.isUploading()) {
        $status.text('Done.');
      } else {
        $status.text(
          'Uploading: ' + name + ', ' +
          (loaded >> 10).toString(10) + '/' + (total >> 10) +
          ' Kbytes (' + (loaded / total * 100).toPrecision(3) + '%)' +
          ', ' + QueueUpload.getQueueLength().toString(10) +
          ' file(s) remaining.');
      }
    }
    if (!QueueUpload.isSupported || !window.JSON) {
      $status.text('Error: Browser unsupported.');
    }

    // Login label
    var $login = $('#login');
    $login.children('a').on('click', function clickLogin(evt) {
      evt.preventDefault();

      if (GO2.getAccessToken())
        return;

      GO2.login(false, false);
    });

    var $login_status = $('#login_status');
    function updateLoginStatus() {
      var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' +
        GO2.getAccessToken();
      $.getJSON(url, function gotUserInfo(result) {
        if (!result || !result.email)
          return;

        $login_status.text('You are logged in as ' + result.email + '.');
      });
    };

    // List of files and base href of the link to file
    var $filelist = $('#filelist');
    var baseHref = window.location.href.substr(0,
                                               window.location.href
                                               .lastIndexOf('/') + 1);

    // Delete file when user click on a delete link
    $filelist.on('click', 'a[rel="delete"]', function clickDeleteFile(evt) {
      evt.preventDefault();

      if (!window.confirm('Are you sure you want to delete?'))
        return;

      var $a = $(this);
      var $li = $a.parents('li');
      Server.deleteFile(function fileDeleteResult(result) {
        if (result) {
          $li.remove();
        } else {
          $li.removeClass('pending');
        }
      }, $a.data('filename'));

      $li.addClass('pending');
    });
    function addFileToList(filename) {
      var $li = $('<li/>');
      $li.append($('<a/>').attr('href', baseHref + 'files/' + filename)
                          .text(filename));

      if (!Server.config.disable_login) {
        $li.append(' [')
          .append($('<a rel="delete" href="#" />')
            .data('filename', filename)
            .text('delete'))
          .append(']');
      }

      $filelist.append($li);
    }
    function updateFilelist() {
      Server.listFiles(function listFilesResult(files) {
        if (!files)
          return;

        files.forEach(addFileToList);
      });
    }

    QueueUpload.post_name = 'file';
    QueueUpload.url = './api/drop.php';

    // We don't need this
    // QueueUpload.onuploadstart =

    // When there is a progress we will update the progress
    QueueUpload.onuploadprogress = function uploadprogress(file,
                                                           xhr,
                                                           loaded, total) {
      updateStatus(file.name, loaded, total);
    };

    // When upload is completed we'll process the result from server
    // and decide if we want to continue the upload.
    QueueUpload.onuploadcomplete = function uploadcomplete(file, xhr) {
      if (xhr.status !== 200) {
        alert('Upload failed!');
        return false;
      }

      updateStatus();

      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) { }

      if (!data) {
        alert('Server error!');
        return false;
      }

      if (data.error || !data.filename) {
        alert('Upload Error: ' + (data.error || 'Unknown error'));
        return false;
      }

      addFileToList(data.filename);

      return true;
    };

    Server.getConfig(function gotConfig() {
      if (!Server.config)
        return;

      $body.removeClass('uninit');

      QueueUpload.max_file_size = Server.config.max_file_size;

      // Login not required, remove login label
      if (Server.config.disable_login) {
        $login.remove();

        return;
      }

      $body.addClass('auth_needed');

      // Initialize GO2
      GO2.onlogin = function loggedIn(token) {
        QueueUpload.form_data.access_token = token;

        $body.removeClass('auth_needed');
        updateLoginStatus();
        updateFilelist();
      };
      GO2.onlogout = function loggedOut() {
        QueueUpload.form_data.access_token = undefined;

        $body.addClass('auth_needed');
        $filelist.empty();
        $login_status.empty();
      };
      GO2.init({
        client_id: Server.config.google_oauth2_client_id,
        scope: 'https://www.googleapis.com/auth/userinfo.email'
      });

      // Attempt to login silently.
      GO2.login(false, true);
    });
  })();
});
