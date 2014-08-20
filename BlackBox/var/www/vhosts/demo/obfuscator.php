<?php
require_once('sqaes.php'); 

function obfuscate($path) {
  $secret = 'ab3847dcef228a';
  #$asset_path = '/cache/assets/';
  $asset_path = '/assets/';
  $time_bucket = 600;

  $date=intval(time()/$time_bucket);

  #return $asset_path . hash_hmac('sha1', $date . $path, $secret);
  return $asset_path . sqAES::crypt($date . $secret, $path);
}

?>
