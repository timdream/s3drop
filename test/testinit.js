'use strict';

var server = sinon.fakeServer.create();
server.respondWith('GET',
  './api/getconfig.php',
  [200,
    { 'Content-Type': 'text/javascript' },
    '{"disable_login":false,' +
      '"google_oauth2_client_id":"google_oauth2_client_id",' +
      '"max_file_size":1024}']);
/*
server.respondWith('POST', './api/delete.php',
  { 'Content-Type': 'text/javascript' },
  '{"disable_login":false,' +
    '"google_oauth2_client_id":"google_oauth2_client_id",' +
    '"max_file_size":1024}');
*/
// Overwrite the $.getJSON method, simulate getConfig
/*var stubGetJSON = sinon.stub($, 'getJSON');

stubGetJSON.once().callsArgWith(1, {
    'disable_login':false,
    'google_oauth2_client_id':'google_oauth2_client_id',
    'max_file_size':1024
  });
*/

var GetJSONSpy = sinon.spy($, 'getJSON');
var GO2Mock = sinon.mock(GO2);
GO2Mock.expects('init').once().withArgs({
  client_id: 'google_oauth2_client_id',
  scope: 'https://www.googleapis.com/auth/userinfo.email'
});
