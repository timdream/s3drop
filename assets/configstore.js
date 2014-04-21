'use strict';

var ConfigStoreBase = function() {
  this.config = null;
};
ConfigStoreBase.prototype.onconfigready = null;
ConfigStoreBase.prototype.onconfigerror = null;
ConfigStoreBase.prototype.start = function() {
};
ConfigStoreBase.prototype.stop = function() {

};

var GoogleSpreadsheetAWSS3ConfigStore = function() {
  this.config = null;
};

GoogleSpreadsheetAWSS3ConfigStore.prototype = new ConfigStoreBase;
GoogleSpreadsheetAWSS3ConfigStore.prototype.GOOGLE_SPREADSHEET_API_URL =
  'https://spreadsheets.google.com/feeds/cells/%spreadsheetKey/1/private/basic';

GoogleSpreadsheetAWSS3ConfigStore.prototype.SPREADSHEET_KEY = '';
GoogleSpreadsheetAWSS3ConfigStore.prototype.ACCESS_TOKEN = '';
GoogleSpreadsheetAWSS3ConfigStore.prototype.getConfig = function() {
  $.getJSON(
    this.GOOGLE_SPREADSHEET_API_URL
      .replace('%spreadsheetKey', this.SPREADSHEET_KEY),
    {
      'min-col': 2,
      'max-col': 2,
      'alt': 'json',
      'access_token': this.ACCESS_TOKEN
    }
  ).done(
    function gotConfigResult(result) {
      if (!result) {
        if (this.onconfigerror) {
          this.onconfigerror(false);
        }

        return;
      }

      var config = this.config = {};

      config.bucketName = result['feed']['entry'][0]['content']['$t'];
      config.accessKeyId = result['feed']['entry'][1]['content']['$t'];
      config.secretAccessKey = result['feed']['entry'][2]['content']['$t'];
      config.protocol = result['feed']['entry'][3]['content']['$t'];

      if (this.onconfigready) {
        this.onconfigready(true);
      }
    }.bind(this)
  ).fail(
    function getConfigError() {
      if (this.onconfigerror) {
        this.onconfigerror(false);
      }
    }.bind(this)
  );
};
GoogleSpreadsheetAWSS3ConfigStore.prototype.clearConfig = function() {
  this.config = null;
};
