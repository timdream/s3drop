<?php

require('./inc/inc.php');

if (!$DISABLE_LOGIN)
  verifyToken($_POST['access_token']);

move_uploaded_file($_FILES['file']['tmp_name'],
                   '../files/' . $_FILES['file']['name']);

print json_encode(array('filename' => $_FILES['file']['name']));
