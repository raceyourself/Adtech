<?php require_once('obfuscator.php'); ?>
var d = document.getElementById('banner2');
if (d === null || d.offsetParent === null) {
  d = document.createElement('div');
  d.style.width = '728px';
  d.style.height = '90px';
  document.getElementById('container').appendChild(d);
}
d.style.backgroundImage = "url('<?php echo obfuscate('blackbox/Example-Print-Ads.jpg');?>')";
d.style.cursor = 'pointer';
d.addEventListener('click', function() {
  window.location = 'http://www.amazon.co.uk/UK-6-inch-Pepper-Beanie-Boo/dp/B004L0VB9O/';
});
