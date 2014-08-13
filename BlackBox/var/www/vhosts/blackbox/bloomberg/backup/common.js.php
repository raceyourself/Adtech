<?php require_once('cloner.js'); ?>
function underad(id, width, height, url, link){
  var underad = null;
  var d = document.getElementById(id);
  if (d === null) return; // TODO: Recreate from server-side template
  if (hidden(d)) underad = recreate(d); 
  if (underad !== null) {
    var img = document.createElement('img');
    img.style.width = width;
    img.style.height = height;
    img.src = url;
    underad.appendChild(img);
    /*underad.style.width = width;
    underad.style.height = height;
    underad.style.backgroundImage = "url('" + url + "')";
    underad.style.backgroundPosition = '50% 50%';
    underad.style.backgroundRepeat = 'no-repeat';
    */
    underad.style.cursor = 'pointer';
    underad.addEventListener('click', function() {
      window.location = link;
    });
  }
};
