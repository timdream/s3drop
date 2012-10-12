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
               + 'files/',
    config;

$.getJSON(
  './getconfig.php',
  function (result) {
    if (!result || result.error) {
      alert(result.error || 'Get config failed.');

      return;
    }

    config = result;

    if (config.disable_login) {
      $login.remove();
    } else {
      GO2.init(
        config.google_oauth2_client_id,
        'https://www.googleapis.com/auth/userinfo.email'
      );
    }
  }
);

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

      getList();
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
  if (!config.disable_login && !access_token) {
    alert('You need to login first.');
    return;
  }

  if (!filelist) return;
  $.each(
    filelist,
    function (i, file) {
      if (file.size > config.max_file_size) {
        alert('File ' + file.name + ' exceeds maximum file size.');
        return;
      }

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
  if (!config.disable_login)
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
          addFileToList(data.filename);
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

function getList() {
  $.getJSON(
    './list.php?access_token=' + access_token,
    function (result) {
      if (!result || result.error) {
        alert(result.error || 'Get file list failed.');

        return;
      }

      result.files.forEach(addFileToList);
    }
  );
}

function addFileToList(filename) {
  $('#filelist').append(
    $('<li/>')
      .append($('<a/>').attr('href', baseHref + filename).text(filename))
      .append(' [')
      .append($('<a rel="delete" href="#" />')
        .data('filename', filename)
        .text('delete'))
      .append(']'));
}

$('#filelist').on(
  'click',
  'a[rel="delete"]',
  function (ev) {
    ev.preventDefault();

    if (!window.confirm('Are you sure you want to delete?'))
      return;

    $a = $(this);
    $li = $a.parents('li');
    $li.addClass('pending');
    $.post(
      './delete.php',
      {
        access_token: access_token,
        filename: $a.data('filename')
      },
      function gotResult(result) {
        if (!result || result.error) {
          alert(result.error || 'Server Error');
          $li.removeClass('pending');
          return;

        }

        $li.remove();
      },
      'json'
    );
  }
);

})(jQuery);
