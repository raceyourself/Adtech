<?php
require_once('sqaes.php');
// Use UTC everywhere for consistency.
date_default_timezone_set('UTC');

function obfuscate($path, $time) {
    $password = getPassword($time); # TODO
    $asset_path = '/assets/';
    $key_duration_secs = 600; # 10 mins

    $period = intval($time / $key_duration_secs);

    # Timestamp as unencrypted param so that reverse proxy knows what key to use.
    return $asset_path . encrypt_with_password($period . $password, $path)  . "?$time";
}

function getPassword($time) {
    $password = -1;
    $file_lines = file('passwords.txt');
    foreach ($file_lines as $file_index => $file_line) {
        if (!preg_match("/^[0-9]/", $file_line))
            continue; # ignore header lines/blank lines etc
        
        $timestr = split(",", $file_line)[0];
        $rowTime = strtotime($timestr);
        if ($time > $rowTime) {
            $password = after(',', $file_line);
        }
        else {
            break;
        }
    }
    if ($password === -1)
        throw new Exception('No password currently in effect.');
    return $password;
}

function after($this, $inthat) {
    if (!is_bool(strpos($inthat, $this)))
        return substr($inthat, strpos($inthat,$this) + strlen($this));
};
    
?>
