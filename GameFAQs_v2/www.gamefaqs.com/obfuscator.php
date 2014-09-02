<?php
require_once('sqaes.php'); 

function obfuscate($path, $time) {
    $password = getPassword($time); # TODO
    $asset_path = '/assets/';
    $time_bucket = 600;

    $period = intval($time / $time_bucket);

    # Timestamp as unencrypted param so that reverse proxy knows what key to use.
    return $asset_path . encrypt_with_password($period . $password, $path)  . "?$time";
}

function getPassword($time) {
    $password;
    for (row in rows) {
        if (!row startswith(0-9))
            continue;
        
        rowTime = strtotime(row.split(",")[0]);
        if ($time > rowTime) {
            $password = row.substring(row.indexof(",") + 1);
        }
        else {
            return $password;
        }
    }
    throw exception "no appropriate password"
}

?>
