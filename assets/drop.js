'use strict';

/* Actual front-end for Drop */

jQuery(function initDrop($) {
  var $body = $(document.body);

  var queueUpload = new QueueUpload();

  var api = new DropAPI();
  api.CONFIG_STORE = GoogleSpreadsheetAWSS3ConfigStore;
  api.FILE_STORE = AmazonS3FileStore;
  api.start();
  api.configStore.SPREADSHEET_KEY = GOOGLE_SPREADSHEET_KEY;
  api.onconfigready = function configReady() {
    updateFilelist();
  };
  api.onconfigerror = function gotConfig(hasAccess) {
    alert('Your Google account has no access to the spreadsheet ' +
      'specified.\n' +
      'This may be an error, or you may have no access to this service.');

    go2.logout();
  };

  var go2 = new GO2({
    clientId: GOOGLE_OAUTH2_CLIENT_ID,
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://spreadsheets.google.com/feeds/']
  });

  var downloadlinkExpireDate;

  // Allow dropping file to container
  $('#file_container').on('drop', function dropFile(evt) {
    evt.preventDefault();
    $body.removeClass('dragover');

    if (!go2.getAccessToken() || !api.configStore.config) {
      alert('You need to login with the proper Google account first.');

      return;
    }

    queueUpload.addQueue(evt.originalEvent.dataTransfer.files);
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
    if (!go2.getAccessToken() || !api.configStore.config) {
      alert('You need to login with the proper Google account first.');

      this.form.reset();
      return;
    }

    queueUpload.addQueue(this.files);

    // Reset the from to clean up selected files
    // so user may be able to select again.
    this.form.reset();
  });

  // Textual label status
  var $status = $('#status');
  function updateStatus(name, loaded, total) {
    if (!queueUpload.isUploading()) {
      $status.text('Done.');
    } else {
      $status.text(
        'Uploading: ' + name + ', ' +
        (loaded >> 10).toString(10) + '/' + (total >> 10) +
        ' Kbytes (' + (loaded / total * 100).toPrecision(3) + '%)' +
        ', ' + queueUpload.getQueueLength().toString(10) +
        ' file(s) remaining.');
    }
  }
  if (!queueUpload.isSupported || !window.JSON) {
    $status.text('Error: Browser unsupported.');
  }

  // Login label
  var $login = $('#login');
  $login.children('a').on('click', function clickLogin(evt) {
    evt.preventDefault();

    if (go2.getAccessToken())
      return;

    go2.login(false, false);
  });

  var $login_status = $('#login_status');
  function updateLoginStatus() {
    var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' +
      go2.getAccessToken();
    $.getJSON(url, function gotUserInfo(result) {
      if (!result || !result.email)
        return;

      $login_status.text('You are logged in as ' + result.email + '.');
    });
  };

  // List of files and base href of the link to file
  var $filelist = $('#filelist');

  // Delete file when user click on a delete link
  $filelist.on('click', 'a[rel="delete"]', function clickDeleteFile(evt) {
    evt.preventDefault();

    if (!window.confirm('Are you sure you want to delete?'))
      return;

    var $a = $(this);
    var $li = $a.parents('li');
    api.fileStore.deleteFile(function fileDeleteResult(result) {
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
    var href = api.fileStore.getDownloadURL('/' + filename,
                                            downloadlinkExpireDate);
    $li.append($('<a target="_blank" />').attr('href', href).text(filename));

    $li.append(' [')
      .append($('<a rel="delete" href="#" />')
        .data('filename', filename)
        .text('delete'))
      .append(']');

    $filelist.append($li);
  }
  function updateFilelist() {
    $filelist.append($('<li/>').text('...'));
    api.fileStore.listFiles(function listFilesResult(result, errorInfo) {
      $filelist.empty();
      if (!result) {
        if (errorInfo && errorInfo.code === 'RequestTimeTooSkewed') {
          // Try again since the awsTimeOffset should have been updated now.
          api.fileStore.listFiles(listFilesResult);
        } else if (errorInfo) {
          alert('The server returned the following error response:\n\n' +
            errorInfo.code + ':' + errorInfo.message);
        } else {
          alert('Unable to retrieve file list.');
        }
        return;
      }

      result.forEach(addFileToList);
    });
  }

  queueUpload.onuploadstart = function uploadstarted(file, xhr) {
    $body.addClass('uploading');

    var uri = '/' + file.name;
    var uploadInfo = api.fileStore.getUploadInfo(uri, {
      'Content-Type': file.type
    });

    queueUpload.HTTP_METHOD = uploadInfo.method;
    queueUpload.headers = uploadInfo.headers;
    queueUpload.headers['Content-Type'] = file.type;
    queueUpload.headers['Content-Length'] = file.size;
    queueUpload.url = uploadInfo.url;
  };

  // When there is a progress we will update the progress
  queueUpload.onuploadprogress = function uploadprogress(file,
                                                         xhr,
                                                         loaded, total) {
    updateStatus(file.name, loaded, total);
  };

  // When upload is completed we'll process the result from server
  // and decide if we want to continue the upload.
  queueUpload.onuploadcomplete = function uploadcompleted(file, xhr) {
    $body.removeClass('uploading');
    queueUpload.headers = {};
    queueUpload.url = '';

    updateStatus();

    var apiInfo = api.fileStore.handleUploadComplete(xhr);
    if (!apiInfo.success) {
      if (apiInfo.errorInfo) {
        alert('The server returned the following error response:\n\n' +
          apiInfo.errorInfo.code + ':' + apiInfo.errorInfo.message);
      } else {
        alert('Unknown server error.');
      }

      return false;
    }

    addFileToList(file.name);

    return true;
  };

  go2.onlogin = function loggedIn(token) {
    api.configStore.ACCESS_TOKEN = token;
    api.getConfig();

    downloadlinkExpireDate =
      new Date((new Date()).getTime() + LINK_EXPIRES_IN * 1000);

    $body.removeClass('auth_needed');
    updateLoginStatus();
  };
  go2.onlogout = function loggedOut() {
    api.configStore.ACCESS_TOKEN = undefined;
    api.clearConfig();

    $body.addClass('auth_needed');
    $filelist.empty();
    $login_status.empty();
  };

  // Attempt to login silently.
  go2.login(false, true);

  // Start the transition
  $body.removeClass('uninit');

  // There is no pseudo-class like :from() to target for
  // the animation when leaving 'uninit' state.
  // We will have to introduce a new state here.
  $body.addClass('leave-uninit');
  // We should be using animationend & webkitAnimationEnd here, however
  // the event will never be triggered if the animation is interrupted.
  setTimeout(function animationend() {
    $body.removeClass('leave-uninit');
  }, 1010);

  $body.addClass('auth_needed');
});
