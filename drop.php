<?php

require('inc/config.inc.php');

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
set_error_handler('errorhandler');

setlocale(LC_ALL, 'en_US', 'english_us'); // U*IX, Windows

header('Content-type: text/javascript; charset=utf-8');

if (!$DISABLE_LOGIN) {
  // Ask Google if this this user is logged in
  $API_URL = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=';
  $email = json_decode(file_get_contents($API_URL . $_POST['access_token']))->{'email'};
  if (!in_array($email, $ALLOWED_USERS)) {
    print json_encode(array('error' => 'You are not allowed to use this service.'));
    exit;
  }
}

move_uploaded_file($_FILES['file']['tmp_name'], './files/' . $_FILES['file']['name']);

print json_encode(array('filename' => $_FILES['file']['name']));

?>
