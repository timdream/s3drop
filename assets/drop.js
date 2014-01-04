'use strict';

/* Actual front-end for Drop */

jQuery(function initDrop($) {
  var $body = $(document.body);

  var queueUpload = new QueueUpload();
  var api = new DropAPI();
  var go2 = new GO2({
    clientId: GOOGLE_OAUTH2_CLIENT_ID,
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://spreadsheets.google.com/feeds/']
  });

  queueUpload.HTTP_METHOD = 'PUT';
  api.spreadsheetKey = GOOGLE_SPREADSHEET_KEY;

  // Allow dropping file to container
  $('#file_container').on('drop', function dropFile(evt) {
    evt.preventDefault();
    $body.removeClass('dragover');

    if (!go2.getAccessToken() || !api.hasS3Access()) {
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
    if (!go2.getAccessToken() || !api.hasS3Access()) {
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
    api.deleteFile(function fileDeleteResult(result) {
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

    $li.append(' [')
      .append($('<a rel="delete" href="#" />')
        .data('filename', filename)
        .text('delete'))
      .append(']');

    $filelist.append($li);
  }
  function updateFilelist() {
    api.listFiles(function listFilesResult(result, errorInfo) {
      if (!result) {
        if (errorInfo) {
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
    queueUpload.headers = api.getAWSAuthorizationInfo('PUT', uri, {
      'Content-Type': file.type
    });
    queueUpload.headers['Content-Type'] = file.type;
    queueUpload.headers['Content-Length'] = file.size;
    queueUpload.url = api.getAWSBucketObjectURL(uri);
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

    var xmlDoc = xhr.responseXML;
    if (xmlDoc) {
      var errorInfo = api.getAWSErrorInfo(xmlDoc);
      if (errorInfo) {
        alert('The server returned the following error response:\n\n' +
          errorInfo.code + ':' + errorInfo.message);

        return false;
      } else if (xhr.status !== 200) {
        alert('Unknown server error.');

        return;
      }
    }

    if (xhr.status !== 200) {
      alert('Unknown server error.');

      return false;
    }

    addFileToList(file.name);

    return true;
  };

  go2.onlogin = function loggedIn(token) {
    api.accessToken = token;
    api.getConfig(function gotConfig(hasAccess) {
      if (!hasAccess) {
        alert('Your Google account has no access to the spreadsheet ' +
          'specified.\n' +
          'This may be an error, or you may have no access to this service.');

        setTimeout(function() {
          go2.logout();
        });
        return;
      }

      updateFilelist();
    });

    $body.removeClass('auth_needed');
    updateLoginStatus();
  };
  go2.onlogout = function loggedOut() {
    api.accessToken = undefined;
    api.awsConfig = undefined;

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
