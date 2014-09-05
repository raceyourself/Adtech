package UnderAd::Deobfuscation;

use strict;
use warnings FATAL => 'all';

use Apache2::RequestRec;
use Apache2::RequestUtil;
use Apache2::Const -compile => qw(DECLINED);
use Crypt::CBC;
use Crypt::PBKDF2;
use MIME::Base64;
use Date::Parse;

sub handler {
    my $r = shift;
    my $key_duration_secs = int($r->dir_config('period'));
    my $path_pattern = $r->dir_config('path_pattern');

    my $period = int(time() / $key_duration_secs);

    if ($r->uri =~ m/$path_pattern/) {
      # $1 = encrypted URL
      my $ciphertext = $1;
      # $2 = app server unix time at point of page generation
      my $appServerUnixTime = $2;
      
      my $password = getPassword($appServerUnixTime);
      
      my $pbkdf2 = Crypt::PBKDF2->new(
        hash_class => 'HMACSHA1',
        hash_args => {
          sha_size => 32 * 8,
        },
        iterations => 65000,
        # salt_len => 10, # should be redundant as salt is specified
      );
      
      my $salt = encode_base64("FIXED");
      my $hash = $pbkdf2->generate($period . $password, $salt);
      
      my $cipher = Crypt::CBC->new(
        -key         => $hash,
        -literal-key => 1, # hashing done separately in order to ensure consistent parameters with Java/PHP code
        -cipher      => 'Crypt::OpenSSL::AES',
        #-salt        => encode_base64("FIXED"),
        -iv          => encode_base64("FIXED_1234567890")
      );
      
      my $plaintext = $cipher->decrypt(decode_base64($ciphertext));

      if ($plaintext =~ m/(.*)\?(.*)/) {
        my $path = $1;
        my $query = $2;
        $r->uri('/' . $path);
        $r->args($query);
        warn("$ciphertext rewritten to /$path?$query (has query params)");
      }
      else {
        $r->uri('/' . $plaintext);
        warn("$ciphertext rewritten to /$plaintext (no query params)");
      }
    }
    
    return Apache2::Const::DECLINED;
}

sub getPassword {
    my ($unixTime) = @_;
    my $password = -1;
    open(PASSWORDS, 'passwords.txt') or die("Could not open  file.");
    my $line;
    foreach $line (<PASSWORDS>) {
        chomp $line;
        
        if ($line =~ m/^([0-9]+),(.*)$/) { # ignore header lines/blank lines etc
            my $timestr = $1;
            my $rowTime = str2time($timestr);
            if ($unixTime > $rowTime) {
                $password = $2;
            }
            else {
                last;
            }
        }
    }
    if (isint($password))
        die('No password currently in effect.');
    return $password;
}

1;
