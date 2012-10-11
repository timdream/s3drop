(function ($) {
$(function () {
  $('#file_containor').bind(
    'drop',
    function (ev) {
      $(this).removeClass('dragover');
      addQueue(ev.originalEvent.dataTransfer.files);
      return false;
    }
  ).bind(
    'dragover',
    function () {
      return false;
    }
  ).bind(
    'dragenter',
    function () {
      $(this).addClass('dragover');
      return false;
    }
  ).bind(
    'dragleave',
    function () {
      $(this).removeClass('dragover');
      return false;
    }
  );

  $(window).bind(
    'drop',
    function () {
      return false;
    }
  ).bind(
    'dragover',
    function () {
      return false;
    }
  );

  $('#files').bind(
    'change',
    function (ev) {
      addQueue(this.files);
      this.form.reset();
    }
  );
});

var queue = [],
    uploading = false,
    $status = $('#status'),
    $login = $('#login'),
    access_token,
    $filelist = $('#filelist'),
    baseHref = window.location.href.substr(0,
                                           window.location.href.lastIndexOf('/') + 1)
               + 'files/';

if (!disable_login && !window.google_oauth2_client_id) {
  alert('You need to supply your Google OAuth2 Client ID in config.js.');
}

if (disable_login) {
  $login.remove();
} else {
  GO2.init(
    window.google_oauth2_client_id,
    'https://www.googleapis.com/auth/userinfo.email'
  );
}

$login.children('a').on(
  'click',
  function (ev) {
    ev.preventDefault();

    if (access_token)
      return;

    GO2.getToken(function gotToken(token) {
      if (!token)
        return;

      access_token = token;
      $login.remove();
    });
  }
);

if (!window.FormData || !window.XMLHttpRequest || !window.JSON) {
  $status.text('Error: Browser unsupported.');
}

function updateStatus(loaded, total) {
  if (!uploading) $status.text('Done.');
  else {
    $status.text(
      'Uploading: ' + (loaded >> 10).toString(10) + '/' + (total >> 10) + ' Kbytes (' + (loaded/total*100).toPrecision(3)  + '%)'
      + ', ' + queue.length.toString(10) + ' file(s) remaining.'
    );
  }
}

function xhrProgressHandler(ev) {
  updateStatus(ev.loaded, ev.total);
}

function addQueue(filelist) {
  if (!disable_login && !access_token) {
    alert('You need to login first.');
    return;
  }

  if (!filelist) return;
  $.each(
    filelist,
    function (i, file) {
      queue.push(file);
    }
  );
  if (!uploading) startUpload();
}

function startUpload() {
  var formData = new FormData(),
      file = queue.shift(),
      xhr = new XMLHttpRequest();

  formData.append("file", file);
  if (!disable_login)
    formData.append("access_token", access_token);

  xhr.open("POST", './drop.php');
  uploading = true;
  //updateStatus(0, file.size);
  xhr.upload.onprogress = xhrProgressHandler;
  xhr.onreadystatechange = function xhrStateChangeHandler(ev) {
    if (xhr.readyState == 4) {
      uploading = false;
      updateStatus();
      if(xhr.status == 200) {
        var data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) { }

        if (data && data.filename) {
          $('#filelist').append(
            $('<li/>').append(
              $('<a/>').attr('href', baseHref + data.filename).text(data.filename)));

          if (queue.length) startUpload();
        } else {
          var label = 'File ' + file.name + ' upload failed.';
          if (data && data.error)
            label = 'Error:' + data.error;

          alert('Upload Error:' + label);
        }
      } else {
        alert('Upload failed!');
      }
    }
  };
  xhr.send(formData);
}

})(jQuery);
