<?php require_once('cloner.js'); ?>
function underad(id, width, height, url, link){
  var d = document.getElementById(id);
  if (d === null) return; // TODO: Recreate from server-side template
  if (hidden(d)) recreate(d, function(underad) { 
    //if (underad.offsetWidth >= parseInt(width) && underad.offsetHeight >= parseInt(height)) {
    if (true) {
      var img = document.createElement('img');
      img.style.width = width;
      img.style.height = height;
      img.src = url;
      underad.appendChild(img);
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
