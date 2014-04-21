'use strict';

module('GoogleSpreadsheetAWSS3ConfigStore');

test('object exists', function () {
  ok(!!GoogleSpreadsheetAWSS3ConfigStore, 'Passed!');
});

test('getConfig(success)', function() {
  var configStore = new GoogleSpreadsheetAWSS3ConfigStore();
  configStore.ACCESS_TOKEN = 'FAKE_TOKEN';
  configStore.SPREADSHEET_KEY = 'FAKE_SPREADSHEET_KEY';
  configStore.GOOGLE_SPREADSHEET_API_URL =
    './fake-spreadsheet.json?sp=%spreadsheetKey';

  var getJSONSpy = sinon.spy($, 'getJSON');

  configStore.onconfigready = function(gotConfig) {
    ok(gotConfig, 'gotConfig');
    equal(this, configStore, 'this === configStore instance');

    deepEqual(configStore.config, {
      "accessKeyId": "FAKE_AWS_KEY",
      "bucketName": "FAKE_BUCKET_NAME",
      "protocol": "https",
      "secretAccessKey": "FAKE_AWS_SECRET"
    }, 'config fetched.');

    start();
  };

  configStore.onconfigerror = function() {
    ok(false, 'Should not call onconfigerror().');

    start();
  };

  stop();

  configStore.getConfig();

  ok(
    getJSONSpy.calledWith(
      './fake-spreadsheet.json?sp=FAKE_SPREADSHEET_KEY',
      {
        'min-col': 2,
        'max-col': 2,
        'alt': 'json',
        'access_token': 'FAKE_TOKEN'
      }
    ),'$.getJSON() called with correct parameter');

  getJSONSpy.restore();
});

test('getConfig(error)', function() {
  var configStore = new GoogleSpreadsheetAWSS3ConfigStore();
  configStore.ACCESS_TOKEN = 'FAKE_TOKEN';
  configStore.SPREADSHEET_KEY = 'FAKE_SPREADSHEET_KEY';
  configStore.GOOGLE_SPREADSHEET_API_URL =
    './fake-spreadsheet-404.json?sp=%spreadsheetKey';

  configStore.onconfigready = function(gotConfig) {
    ok(false, 'Should not call onconfigready()');
  };

  configStore.onconfigerror = function(gotConfig) {
    equal(gotConfig, false, 'gotConfig');
    ok(true, 'Should call onconfigerror().');

    start();
  };

  stop();

  configStore.getConfig();
});
