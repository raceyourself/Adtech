<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>

document.addEventListener('readystatechange', function() {
  if(document.readyState === 'complete') underad('#ad-right2', '300px', '250px', '<?php echo obfuscate('blackbox/ads/300x250_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
});
