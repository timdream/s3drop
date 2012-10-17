<?php

require('./inc/inc.php');

if (!$DISABLE_LOGIN)
  verifyToken($_POST['access_token']);

unlink('../files/' . $_POST['filename']);

print json_encode(array('filename' => $_POST['filename']));
