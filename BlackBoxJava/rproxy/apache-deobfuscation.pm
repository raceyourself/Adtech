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
      my $appServerUnixTime = $r->args;
      my $password = getPassword($appServerUnixTime);
      #warn("FOOO appserver_unixtime=$appServerUnixTime;$password"); # TODO DELETEME
      
      my $pbkdf2 = Crypt::PBKDF2->new(
        hash_class => 'HMACSHA1',
        hash_args => {
          sha_size => 32 * 8,
        },
        iterations => 65000,
        # salt_len => 10, # should be redundant as salt is specified
      );
      
      my $salt = encode_base64("FIXED");
      #warn("FOOO Perl sal=$salt");
      my $key = $pbkdf2->generate($period . $password, $salt);
      
      # TODO HAXXX. difficult getting php-perl-java to align with pbkdf2, so just concatenating the period+password then truncating to 32bytes/256bits for AES
      my $altKey = "";
      for (my $i = 0; $i < 10; $i++) {
        $altKey = $altKey . $period . $password;
      }
      $altKey = substr $altKey, 0, 32;
      $key = $altKey;
      # END HAXXX
      
      warn("FOOO Perl p=$period$password;k=$key"); # TODO DELETEME
      
      # hashing done separately in order to ensure consistent parameters with Java/PHP code
      my $cipher = Crypt::CBC->new(
        -key         => $key,
        -literal_key => 1,
        -cipher      => 'Crypt::OpenSSL::AES',
        -iv          => "FIXED_1234567890",
        -header      => 'none'
      );
      
      my $rawCiphertext = decode_base64($ciphertext);
      
      warn("FOOO Perl raw ciphertext first 16 bytes: " . substr($rawCiphertext, 0, 16));
      
      my $plaintext = $cipher->decrypt($rawCiphertext);

      if ($plaintext =~ m/(.*)\?(.*)/) {
        my $path = $1;
        my $query = $2;
        $r->uri('/' . $path);
        $r->args($query);
        warn("$ciphertext?$appServerUnixTime rewritten to /$path?$query (has query params)");
      }
      else {
        $r->uri('/' . $plaintext);
        warn("$ciphertext?$appServerUnixTime rewritten to /$plaintext (no query params)");
      }
    }
    
    return Apache2::Const::DECLINED;
}

sub getPassword {
    my ($unixTime) = @_;
    my $password = "";
    open(PASSWORDS, '/opt/obfuscator/passwords.txt') or die("Could not open  file.");
    my $line;
    foreach $line (<PASSWORDS>) {
        chomp $line;
        
        if ($line =~ m/^([0-9].+),(.*)$/) { # ignore header lines/blank lines etc
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
    close PASSWORDS;
    die "No password currently in effect." if ($password eq "");
    return $password;
}
1;
