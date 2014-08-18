package UnderAd::Deobfuscation;
  
use strict;
use warnings FATAL => 'all';

use Apache2::RequestRec;
use Apache2::RequestUtil;
use Apache2::Const -compile => qw(DECLINED);
use Crypt::CBC;
use MIME::Base64;

sub handler {
    my $r = shift;
    my $secret = $r->dir_config('secret');
    my $period = int($r->dir_config('period'));
    my $path_pattern = $r->dir_config('path_pattern');

    my $time = int(time()/$period);

    my $cipher = Crypt::CBC->new(
      -key         => "$time$secret",
      -cipher      => 'Crypt::OpenSSL::AES',
      -salt        => 1
    );

    if ($r->uri =~ m/$path_pattern/) {
      my $plaintext = $cipher->decrypt(decode_base64($1));
      $r->uri('/' . $plaintext);
      warn("Rewrote $1 to $plaintext");
    }
    
    return Apache2::Const::DECLINED;
}
1;
