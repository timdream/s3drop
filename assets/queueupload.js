'use strict';

/* QueueUpload object includes the queue and the actual upload machinery. */
var QueueUpload = (function initQueueUpload() {
  // Object to hook up all public functions
  var QueueUpload = {
    // max file size allowed, in bytes.
    // falsey value to disable the check.
    max_file_size: 0,

    // key: values to accompany the file when upload.
    form_data: {},

    // post field name to use for the file.
    post_name: 'file',

    // url to upload to.
    url: '',

    // callbacks
    onuploadstart: null,
    onuploadprogress: null,
    onuploadcomplete: null
  };

  // Private Array to place files
  var queue = [];

  // Private Boolean to know if we are currently uploading
  var uploading = false;

  // Public isSupported
  QueueUpload.isSupported = !!(window.FormData &&
                       window.XMLHttpRequest &&
                       Array.prototype.forEach);

  // Public isUploading()
  QueueUpload.isUploading = function isUploading() {
    return uploading;
  };

  // Public getQueueLength
  QueueUpload.getQueueLength = function getQueueLength() {
    return queue.length;
  };

  // Public addQueue()
  // filelist: a [object FileList] containing files to upload
  QueueUpload.addQueue = function addQueue(filelist) {
    if (!filelist || !QueueUpload.isSupported)
      return;

    Array.prototype.forEach.call(filelist, function fileListEach(file) {
      if (QueueUpload.max_file_size &&
          file.size > QueueUpload.max_file_size) {
        alert('File ' + file.name + ' exceeds maximum file size.');
        return;
      }

      queue.push(file);
    });

    if (!uploading)
      startUpload();
  };

  var startUpload = function startUpload() {
    var formData = new FormData(),
      file = queue.shift(),
      xhr = new XMLHttpRequest();

    formData.append(QueueUpload.post_name, file);

    for (var name in QueueUpload.form_data) {
      formData.append(name, QueueUpload.form_data[name]);
    }

    xhr.open('POST', QueueUpload.url);
    uploading = true;

    var callbackResult;
    if (QueueUpload.onuploadstart)
      callbackResult = QueueUpload.onuploadstart(file, xhr);

    if (callbackResult === false) {
      startUpload();
      return;
    }

    xhr.upload.onprogress = function xhrProgress(evt) {
      if (QueueUpload.onuploadprogress)
        QueueUpload.onuploadprogress(file, xhr, evt.loaded, evt.total);
    };

    xhr.onreadystatechange = function xhrStateChange(evt) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      uploading = false;

      var callbackResult;
      if (QueueUpload.onuploadcomplete)
        callbackResult = QueueUpload.onuploadcomplete(file, xhr);

      // Start the next round of upload
      if (queue.length && callbackResult !== false)
        startUpload();
    };

    xhr.send(formData);
  };


  // Return the public APIs
  return QueueUpload;
})();
