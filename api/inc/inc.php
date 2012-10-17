<?php

require('./inc/config.inc.php');

# Path to ./file/ dir relative to ./api/ dir.
$dir = '../files/';

function errorhandler($errno = null,
                      $errstr = 'Unknown Error.',
                      $errfile = null, $errline = null, $errcontext = null) {
  $E = array('error' => $errstr);
  if (isset($errno)) $E['errno'] = $errno;
  if (isset($errfile)) $E['errfile'] = $errfile;
  if (isset($errline)) $E['errline'] = $errline;
  print json_encode($E);
  exit();
  return true; /* Don't execute PHP internal error handler */
}

error_reporting(E_ALL | E_STRICT);
set_error_handler('errorhandler');
setlocale(LC_ALL, 'en_US', 'english_us'); // U*IX, Windows

function verifyToken($access_token) {
  global $ALLOWED_USERS;

  // Ask Google if this this user is logged in
  $API_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';
  $email = json_decode(file_get_contents($API_URL . $access_token))->{'email'};
  if (!in_array($email, $ALLOWED_USERS)) {
    print json_encode(array(
      'error' => 'You are not allowed to use this service.'));

    exit;
  }
}

header('Content-type: text/javascript; charset=utf-8');
