<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>
setTimeout(function() {
  var divs = document.getElementsByClassName('google_adwords');
  for (var i=0, l=divs.length; i < l; i++) {
    if (!divs[i].id) divs[i].id = ~~(Math.random()*99999);
    underad('.google_adwords#'+i, '300px', '250px', '<?php echo obfuscate('blackbox/ads/300x250_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
  }
}, 1500);
