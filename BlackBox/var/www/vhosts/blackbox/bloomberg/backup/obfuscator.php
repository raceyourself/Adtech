<?php

function obfuscate($path) {
  $secret = 'ab3847dcef228a';
  $asset_path = '/cache/assets/';
  $time_bucket = 600;
  $max_delay = 60;

  $date=intval((time()+$max_delay)/$time_bucket);

  return $asset_path . hash_hmac('sha1', $date . $path, $secret);
}

?>
