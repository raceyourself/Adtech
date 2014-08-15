<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>
document.addEventListener('readystatechange', function() {
  if(document.readyState === 'complete') {
    var divs = document.getElementsByClassName('static_bbg_ad');
    for (var i=0, l=divs.length; i < l; i++) {
      if (!divs[i].id) divs[i].id = ~~(Math.random()*99999);
      underad('.static_bbg_ad#' + i, '300px', '250px', '<?php echo obfuscate('blackbox/ads/300x250_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
    }
  }
});
