<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>

document.addEventListener('readystatechange', function() {
  if(document.readyState === 'complete') underad('#ad-top', '728px', '90px', '<?php echo obfuscate('blackbox/ads/728x90_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
});
