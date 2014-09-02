<?php

# Ideally replace this with SHA512. Requires same change on Java side, which in turn means an external lib
# (Bouncy Castle?)
define("PBKDF2_HASH_ALGORITHM", "sha1");
define("PBKDF2_ITERATIONS", 65000);
define("PBKDF2_HASH_BYTE_SIZE", 32);

function password2key($password)
{
    // null salt.
    $salt = base64_encode("FIXED");
    
    return hash_pbkdf2(
            PBKDF2_HASH_ALGORITHM,
            $password,
            $salt,
            PBKDF2_ITERATIONS,
            PBKDF2_HASH_BYTE_SIZE,
            true
        );
}

function encrypt_with_key($plaintext, $key) {
    $plaintext = pkcs5_pad($plaintext, 16);
    return bin2hex(mcrypt_encrypt(MCRYPT_RIJNDAEL_128, $key, $plaintext, MCRYPT_MODE_ECB));
}

function decrypt_with_key($encrypted, $key) {
    $decrypted = mcrypt_decrypt(MCRYPT_RIJNDAEL_128, $key, hex2bin($encrypted), MCRYPT_MODE_ECB);
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
    return encrypt_with_key($plaintext, $key);
}

function decrypt_with_password($password, $encrypted) {
    $key = password2key($password);
    return decrypt_with_key($encrypted, $key);
}

?>
