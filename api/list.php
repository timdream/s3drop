<?php

require('./inc/inc.php');

if (!$DISABLE_LOGIN)
  verifyToken($_REQUEST['access_token']);

function filter_dot_files($filename) {
  return (substr($filename, 0, 1) !== '.');
}

$files = array_values(array_filter(scandir($dir), 'filter_dot_files'));

print json_encode(array('files' => $files));
