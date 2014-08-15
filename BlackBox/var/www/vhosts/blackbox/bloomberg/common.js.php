<?php require_once('cloner.js.php'); ?>
function underad(selector, width, height, url, link){
  var sel = selector;
  var index = 0;
  if (sel[0] === '.') {
    var pivot = sel.lastIndexOf('#');
    sel = selector.substr(0, pivot);
    index = ~~(selector.substr(pivot))
  }
  console.log('selector: ' + sel + ' index: ' + index);
  var d = document.querySelectorAll(sel)[index];
  if (d === null) return; // TODO: Recreate from server-side template
  if (hidden(d)) recreate(selector, d, function(underad) { 
    //if (underad.offsetWidth >= parseInt(width) && underad.offsetHeight >= parseInt(height)) {
    if (true) {
      underad.innerHTML = '';
      var img = document.createElement('img');
      img.style.width = width;
      img.style.height = height;
      img.src = url;
      underad.appendChild(img);
      if (hidden(img)) {
        var el = img;
        while (el !== null) {
          if (el.style && el.style.display === 'none') {
            el.style.removeProperty('display');
          }
          el = el.parentNode;
        }
      }
    }
    /*
    underad.style.width = width;
    underad.style.height = height;
    underad.style.backgroundImage = "url('" + url + "')";
    underad.style.backgroundPosition = '50% 50%';
    underad.style.backgroundRepeat = 'no-repeat';
    */
    underad.style.cursor = 'pointer';
    underad.addEventListener('click', function() {
      window.location = link;
    });
  });
};
