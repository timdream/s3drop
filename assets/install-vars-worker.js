'use strict';

self.importScripts('vars.js?_=' + Date.now());

self.postMessage({
  GOOGLE_OAUTH2_CLIENT_ID: GOOGLE_OAUTH2_CLIENT_ID,
  GOOGLE_SPREADSHEET_KEY: GOOGLE_SPREADSHEET_KEY,
  LINK_EXPIRES_IN: LINK_EXPIRES_IN
});
