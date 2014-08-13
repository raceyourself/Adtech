var d = document.getElementById('banner1');
if (d === null || d.offsetParent === null) {
  d = document.createElement('div');
  d.style.width = '300px';
  d.style.height = '250px';
  d.id = 'r'+Math.random();
  var c = document.getElementById('container');
  c.insertBefore(d, c.firstChild);
}
d.style.backgroundImage = "url('http://placekitten.com/300/250')";
d.style.cursor = 'pointer';
d.addEventListener('click', function() {
  window.location = 'http://www.amazon.co.uk/Hawkins-Bazaar-Kitten-Walks-And-Meows/dp/B004DJ8O02/';
});   
