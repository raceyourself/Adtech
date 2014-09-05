<?php

# Ideally replace this with SHA512. Requires same change on Java side, which in turn means an external lib
# (Bouncy Castle?)
define("PBKDF2_HASH_ALGORITHM", "sha1");
define("PBKDF2_ITERATIONS", 65000);
define("PBKDF2_HASH_BYTE_SIZE", 32);

function password2key($password)
{
    # null salt.
    $salt = base64_encode("FIXED");
    
    #error_log("FOOO PHP sal=$salt");
    
    $key = hash_pbkdf2(
            PBKDF2_HASH_ALGORITHM,
            $password,
            $salt,
            PBKDF2_ITERATIONS,
            PBKDF2_HASH_BYTE_SIZE,
            true
        );
    $key = base64_encode($key);
    
    # TODO HAXXX. difficult getting php-perl-java to align with pbkdf2, so just concatenating the period+password then truncating to 32bytes/256bits for AES
    $altKey = "";
    for ($i = 0; $i < 10; $i++) {
    	$altKey = $altKey . $password;
    }
    $altKey = substr($altKey, 0, 32);
    #$key = $altKey;
    # END HAXXX
    
    return $key;
}

function encrypt_with_key($key, $plaintext) {
    $plaintext = pkcs5_pad($plaintext, 16);
    $ciphertext = mcrypt_encrypt(MCRYPT_RIJNDAEL_128, $key, $plaintext, MCRYPT_MODE_CBC, "FIXED_1234567890");
    return base64_encode($ciphertext);
}

function decrypt_with_key($key, $encrypted) {
    $decrypted = mcrypt_decrypt(MCRYPT_RIJNDAEL_128, $key, $encrypted, MCRYPT_MODE_CBC, "FIXED_1234567890");
    $padSize = ord(substr($decrypted, -1));
    return substr($decrypted, 0, $padSize*-1);
}

function pkcs5_pad($text, $blocksize)
{
    $pad = $blocksize - (strlen($text) % $blocksize);
    return $text . str_repeat(chr($pad), $pad);
}

function encrypt_with_password($password, $plaintext) {
    $key = password2key($password);
    
    error_log("FOOO PHP p=$password;k=$key");
    
    return encrypt_with_key($key, $plaintext);
}

function decrypt_with_password($password, $encrypted) {
    $key = password2key($password);
    return decrypt_with_key($key, $encrypted);
}

?>
