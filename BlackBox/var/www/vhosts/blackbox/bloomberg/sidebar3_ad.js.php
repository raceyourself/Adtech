<?php require_once('obfuscator.php'); ?>
<?php require_once('common.js.php'); ?>
// Hide iframes that fail to load so we can detect the failures.
var iframes = document.getElementsByTagName('iframe');
for(var i=0, l=iframes.length; i < l; i++) {
  var iframe = iframes[i];

  var hide = function() {
    if(document.readyState === 'complete') iframe.style.setProperty('display', 'none');
  };
  document.addEventListener('readystatechange', hide);

  iframe.addEventListener('load', function() {
    document.removeEventListener('readystatechange', hide);
  });
}

document.addEventListener('readystatechange', function() {
  if(document.readyState === 'complete') {
    setTimeout(function() {
      var divs = document.getElementsByClassName('google_adwords');
      for (var i=0, l=divs.length; i < l; i++) {
        if (!divs[i].id) divs[i].id = ~~(Math.random()*99999);
        underad('.google_adwords#'+i, '300px', '250px', '<?php echo obfuscate('blackbox/ads/300x250_banner_add_placholder.png'); ?>', 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/');
      }
    }, 100);
  }
});
