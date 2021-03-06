'use strict';

/* QueueUpload object includes the queue and the actual upload machinery. */
var QueueUpload = function QueueUpload() {
  // Private Array to place files
  this._queue = [];

  // Private Boolean to know if we are currently uploading
  this._uploading = false;
};

QueueUpload.prototype = {
  // max file size allowed, in bytes.
  // falsey value to disable the check.
  max_file_size: 0,

  // Use PUT or POST for uploading
  HTTP_METHOD: 'POST',

  // key: values to accompany the file when upload.
  // Only applicable when the HTTP_METHOD is POST.
  form_data: {},

  // post field name to use for the file.
  // Only applicable when the HTTP_METHOD is POST.
  post_name: 'file',

  // headers to accompany the file when upload.
  headers: {},

  // url to upload to.
  url: '',

  // callbacks
  onuploadstart: null,
  onuploadprogress: null,
  onuploadcomplete: null,

  // Public isSupported
  isSupported: !!(window.FormData &&
                  window.XMLHttpRequest &&
                  Array.prototype.forEach),

  // Public isUploading()
  isUploading: function isUploading() {
    return this._uploading;
  },

  // Public getQueueLength()
  getQueueLength: function getQueueLength() {
    return this._queue.length;
  },

  // Public addQueue()
  // filelist: a [object FileList] containing files to upload
  addQueue: function addQueue(filelist) {
    if (!filelist || !this.isSupported)
      return;

    Array.prototype.forEach.call(filelist, function fileListEach(file) {
      if (this.max_file_size && file.size > this.max_file_size) {
        alert('File ' + file.name + ' exceeds maximum file size.');
        return;
      }

      this._queue.push(file);
    }.bind(this));

    if (!this._uploading)
      this._startUpload();
  },

  // Private startUpload()
  _startUpload: function _startUpload() {
    var file = this._queue.shift(),
      xhr = new XMLHttpRequest();

    var callbackResult;
    if (this.onuploadstart)
      callbackResult = this.onuploadstart(file, xhr);

    if (callbackResult === false) {
      this._startUpload();
      return;
    }

    xhr.open(this.HTTP_METHOD, this.url);
    this._uploading = true;

    xhr.upload.onprogress = function xhrProgress(evt) {
      if (this.onuploadprogress)
        this.onuploadprogress(file, xhr, evt.loaded, evt.total);
    }.bind(this);

    xhr.onreadystatechange = function xhrStateChange(evt) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      this._uploading = false;

      var callbackResult;
      if (this.onuploadcomplete)
        callbackResult = this.onuploadcomplete(file, xhr);

      // Start the next round of upload
      if (this._queue.length && callbackResult !== false)
        this._startUpload();
    }.bind(this);

    for (var name in this.headers) {
      xhr.setRequestHeader(name, this.headers[name]);
    }

    if (this.HTTP_METHOD === 'POST') {
      var formData = new FormData();
      formData.append(this.post_name, file);

      for (var name in this.form_data) {
        formData.append(name, this.form_data[name]);
      }

      xhr.send(formData);
    } else {
      xhr.send(file);
    }
  }
};
