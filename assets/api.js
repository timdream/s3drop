'use strict';

var DropAPI = function DropAPI() {
};

DropAPI.prototype.CONFIG_STORE = ConfigStoreBase;
DropAPI.prototype.FILE_STORE = FileStoreBase;

DropAPI.prototype.onconfigready = null;
DropAPI.prototype.onconfigerror = null;

DropAPI.prototype.start = function() {
  this.fileStore = new this.FILE_STORE();
  this.configStore = new this.CONFIG_STORE();
};

DropAPI.prototype.stop = function() {
  this.fileStore = null;
  this.configStore = null;
};

DropAPI.prototype.getConfig = function() {
  this.configStore.onconfigready =
    this.configStore.onconfigerror =
    this.handleConfigStoreReady.bind(this);

  this.configStore.getConfig();
};

DropAPI.prototype.clearConfig = function() {
  this.configStore.clearConfig();
  this.fileStore.config = null;
};

DropAPI.prototype.handleConfigStoreReady = function(hasAccess, errorInfo) {
  if (hasAccess) {
    this.fileStore.config = this.configStore.config;
    if (this.onconfigready) {
      this.onconfigready(true);
    }
  } else {
    if (this.onconfigerror) {
      this.onconfigerror(false, errorInfo);
    }
  }
};
