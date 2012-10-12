<?php

require('./inc/inc.php');

function return_bytes($val) {
    $val = trim($val);
    $last = strtolower($val[strlen($val)-1]);
    switch($last) {
      // The 'G' modifier is available since PHP 5.1.0
      case 'g':
          $val *= 1024;
      case 'm':
          $val *= 1024;
      case 'k':
          $val *= 1024;
    }

    return intval($val, 10);
}

print json_encode(array(
  'disable_login' => $DISABLE_LOGIN,
  'google_oauth2_client_id' => $GOOGLE_OAUTH2_CLIENT_ID,
  // Just to be careful, we leave 1k of space as headers to the post body.
  'max_file_size' => min((return_bytes(ini_get('post_max_size')) - 1024),
                         return_bytes(ini_get('upload_max_filesize')))
));
