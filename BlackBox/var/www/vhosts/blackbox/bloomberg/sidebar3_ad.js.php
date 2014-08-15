<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>
// Hide iframes that fail to load so we can detect the failures.
// NOTE: This requires a long timeout and may only be necessary on IE
var iframes = document.getElementsByTagName('iframe');
for(var i=0, l=iframes.length; i < l; i++) {
  var iframe = iframes[i];
  var iframeLoadTimeAllowed = 5000;
  var timeout = setTimeout(function() {
    iframe.style.setProperty('display', 'none');
  }, iframeLoadTimeAllowed);

  iframe.addEventListener('load', function() {
      clearTimeout(timeout);
  });
}

setTimeout(function() {
  var divs = document.getElementsByClassName('google_adwords');
  for (var i=0, l=divs.length; i < l; i++) {
    if (!divs[i].id) divs[i].id = ~~(Math.random()*99999);
    underad('.google_adwords#'+i, '300px', '250px', '<?php echo obfuscate('blackbox/ads/300x250_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
  }
}, 5000);
