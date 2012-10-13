'use strict';

/* Actual front-end for Drop */

jQuery(function initDrop($) {
  // Token needed to access the server.
  // Shared by all functions.
  var access_token;

  // ==== Remote Auth functions
  var Auth = {
    init: function init(client_id, loginCallback, logoutCallback) {
      // Attach callbacks
      GO2.onlogin = loginCallback;
      GO2.onlogout = logoutCallback;

      // Init
      GO2.init({
        client_id: client_id,
        scope: 'https://www.googleapis.com/auth/userinfo.email'
      });

      // Attempt to login silently.
      GO2.login(false, true);
    },
    login: function login() {
      GO2.login(false, false);
    },
    logout: function logout() {
      GO2.logout();
    }
  };

  // ==== Remote Server functions
  // (doesn't include upload)
  var Server = {
    // get config
    getConfig: function getConfig(callback) {
      $.getJSON(
        './getconfig.php',
        function gotGetConfigResult(result) {
          if (!result || result.error) {
            alert(result.error || 'Get config failed.');
            if (callback)
              callback();

            return;
          }

          Server.config = result;
          if (callback)
            callback();
        }
      );
    },
    // list files on the server
    listFiles: function listFiles(callback) {
      $.getJSON(
        './list.php?access_token=' + access_token,
        function gotListFilesResult(result) {
          if (!result || result.error || !result.files) {
            alert(result.error || 'Get file list failed.');

            if (callback)
              callback();

            return;
          }

          if (callback)
            callback(result.files);
        }
      );
    },
    // delete file on the server
    deleteFile: function deleteFile(callback, filename) {
      $.post('./delete.php', {
          access_token: access_token,
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
    $('#file_containor').on('drop',
      function dropFile(evt) {
        evt.preventDefault();
        $(this).removeClass('dragover');

        if (!Server.config.disable_login && !access_token) {
          alert('You need to login first.');
          return;
        }

        QueueUpload.addQueue(ev.originalEvent.dataTransfer.files);
      }
    ).on('dragover',
      function dragoverFile(evt) {
        evt.preventDefault();
      }
    ).on('dragenter',
      function dragenterFile(evt) {
        $(this).addClass('dragover');
        evt.preventDefault();
      }
    ).on('dragleave',
      function dragleaveFile(evt) {
        $(this).removeClass('dragover');
        evt.preventDefault();
      }
    );

    // Prevent user from leaving page when drop
    // a file outside of container accidentally
    $(window).on('drop',
      function dropFile(evt) {
        evt.preventDefault();
      }
    ).on('dragover',
      function dragoverFile(evt) {
        evt.preventDefault();
      }
    );

    // Allow user to select files from the control
    $('#files').on('change',
      function changeFiles(evt) {
        if (!Server.config.disable_login && !access_token) {
          alert('You need to login first.');

          this.form.reset();
          return;
        }

        QueueUpload.addQueue(this.files);

        // Reset the from to clean up selected files
        // so user may be able to select again.
        this.form.reset();
      }
    );

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
    $login.children('a').on('click',
      function clickLogin(evt) {
        evt.preventDefault();

        if (access_token)
          return;

        Auth.login();
      }
    );

    // List of files and base href of the link to file
    var $filelist = $('#filelist'),
      baseHref = window.location.href.substr(0,
                                             window.location.href
                                               .lastIndexOf('/') + 1);

    // Delete file when user click on a delete link
    $filelist.on('click', 'a[rel="delete"]',
      function clickDeleteFile(evt) {
        evt.preventDefault();

        if (!window.confirm('Are you sure you want to delete?'))
          return;

        $a = $(this);
        $li = $a.parents('li');
        Server.deleteFile(function fileDeleteResult(result) {
          if (result) {
            $li.remove();
          } else {
            $li.removeClass('pending');
          }
        }, $a.data('filename'));

        $li.addClass('pending');
      }
    );
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
    QueueUpload.url = './drop.php';

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

      // Initialize Auth
      Auth.init(
        Server.config.google_oauth2_client_id,
        function loggedIn(token) {
          access_token = token;
          QueueUpload.form_data.access_token = token;

          $body.removeClass('auth_needed');
          updateFilelist();
        },
        function loggedOut() {
          access_token = undefined;
          QueueUpload.form_data.access_token = undefined;

          $body.addClass('auth_needed');
          $filelist.empty();
        }
      );
    });
  })();
});
