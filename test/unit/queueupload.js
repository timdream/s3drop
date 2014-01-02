'use strict';

var useFakeFormData = function useFakeFormData() {
  var fakeFormData = {
    onCreate: null,
    restore: function restore() {
      window.FormData = origFormData;
    },
    formDataInstances: []
  };

  var origFormData = window.FormData;
  window.FormData = function () {
    fakeFormData.formDataInstances.push(this);
    this._files = [];
    this.append = function (name, value) {
      this._files.push({name: name, value: value});
    };
    if (typeof fakeFormData.onCreate == 'function')
      fakeFormData.onCreate.call(this, this);
  };

  return fakeFormData;
}

module('QueueUpload');

test('object exists', function () {
  ok(!!QueueUpload, 'Passed!');
});

test('isSupported', function () {
  var queueUpload = new QueueUpload();
  ok(queueUpload.isSupported, 'Passed!');
});

test('Upload one file', function () {
  var queueUpload = new QueueUpload();
  var fakeFileList = [
    { size: 1234,
      name: 'fakefile.txt' }];

  var fakeFormData = useFakeFormData();
  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var requests = [];
  fakeXhr.onCreate = function (xhrInstance) {
    // Add upload object to fakeXhr
    xhrInstance.upload = {};
    requests.push(xhrInstance);
    setTimeout(function() {
      xhrInstance.upload.onprogress({
        type: 'progress',
        loaded: fakeFileList[0].size / 2,
        total: fakeFileList[0].size + 123
      });
    }, 10);
    setTimeout(function() {
      xhrInstance.respond(200, {}, 'body');
    }, 10);
  };

  stop();

  expect(9);
  queueUpload.onuploadprogress = function (file, xhr, loaded, total) {
    equal(this, queueUpload, 'callback called with correct context');
    strictEqual(file, fakeFileList[0], 'Got file referenced');
    strictEqual(xhr, requests[0], 'Got xhr reference');
    strictEqual(loaded, fakeFileList[0].size / 2, 'Got loaded bytes');
    strictEqual(total, fakeFileList[0].size + 123, 'Got total bytes');
  };
  queueUpload.onuploadcomplete = function (file, xhr) {
    equal(this, queueUpload, 'callback called with correct context');
    strictEqual(fakeFileList[0], file, 'Got File referenced');
    strictEqual(requests[0], xhr, 'Got xhr reference');

    fakeFormData.restore();
    fakeXhr.restore();
    start();
  };
  queueUpload.addQueue(fakeFileList);
  equal(requests.length, 1, 'Made one request');
});

test('Upload 2 files', function () {
  var queueUpload = new QueueUpload();
  var fakeFileList = [
    { size: 1234,
      name: 'fakefile.txt' },
    { size: 2346,
      name: 'fakefile2.txt' }];

  var fakeFormData = useFakeFormData();
  var fakeXhr = sinon.useFakeXMLHttpRequest();
  var requests = [];
  var i = 0;

  fakeXhr.onCreate = function (xhrInstance) {
    // Add upload object to fakeXhr
    xhrInstance.upload = {};
    requests.push(xhrInstance);
    setTimeout(function() {
      xhrInstance.upload.onprogress({
        type: 'progress',
        loaded: fakeFileList[i].size / 2,
        total: fakeFileList[i].size + 123
      });
    }, 10);
    setTimeout(function() {
      xhrInstance.respond(200, {}, 'body');
    }, 10);
  };
  stop();

  expect(17);
  queueUpload.onuploadprogress = function (file, xhr, loaded, total) {
    equal(this, queueUpload, 'callback called with correct context');
    strictEqual(file, fakeFileList[i], 'Got file referenced');
    strictEqual(xhr, requests[i], 'Got xhr reference');
    strictEqual(loaded, fakeFileList[i].size / 2, 'Got loaded bytes');
    strictEqual(total, fakeFileList[i].size + 123, 'Got total bytes');
  };
  queueUpload.onuploadcomplete = function (file, xhr) {
    equal(this, queueUpload, 'callback called with correct context');
    strictEqual(file, fakeFileList[i], 'Got file referenced');
    strictEqual(xhr, requests[i], 'Got xhr reference');
    i++;

    if (i < fakeFileList.length)
      return;

    fakeFormData.restore();
    fakeXhr.restore();
    start();
  };
  queueUpload.addQueue(fakeFileList);
  equal(requests.length, 1, 'Made one request');
});
