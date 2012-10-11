<?php

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

move_uploaded_file($_FILES['file']['tmp_name'], './files/' . $_FILES['file']['name']);

print json_encode(array('filename' => $_FILES['file']['name']));

?>
