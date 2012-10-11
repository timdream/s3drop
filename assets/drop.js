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
    $filelist = $('#filelist'),
    baseHref = window.location.href.substr(0,
                                           window.location.href.lastIndexOf('/') + 1)
               + 'files/';

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

        if (data) {
          $('#filelist').append(
            $('<li/>').append(
              $('<a/>').attr('href', baseHref + data.filename).text(data.filename)));
        } else {
          $('#filelist').append(
            $('<li/>').text('File ' + file.name + ' upload failed.'));
          if (window.console)
            window.console.log(xhr.responseText);
        }

        if (queue.length) startUpload();
      } else {
        alert('Upload failed!');
      }
    }
  };
  xhr.send(formData);
}

})(jQuery);
