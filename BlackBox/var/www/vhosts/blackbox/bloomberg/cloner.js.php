<?php require_once('obfuscator.php'); ?>

// Recreate element e matching selector selector
function recreate(selector, e, callback) {
  if (e === null || !hidden(e)) return null; 
  console.log('recreating ' + selector);

  // TODO: figure out a way to find the cloned element that doesn't rely on easy (detectable) identifiers
  if (!e.id) e.id = 'tmp_'+~~(Math.random() * 99999);

  // Find patient zero
  var patientZero = recurseFindHighestBlocked(e);
  var el = patientZero.element;
  var depth = patientZero.depth;

  // Clone patient zero and all its children
  var c = el.cloneNode(true);
  // Cloned element (a child of patient zero)
  var ce = null;

  // Remove blockable identifiers from clones
  c.removeAttribute('class');
  // Find cloned element
  if (c.id && c.id === e.id) ce = c;
  c.removeAttribute('id');
  var children = c.getElementsByTagName('*');
  for (var i=0, l=children.length; i < l; i++) {
    var child = children[i];
    child.removeAttribute('class')
    // Find cloned element
    if (child.id && child.id === e.id) ce = child;
    child.removeAttribute('id');
  }

  // Insert clones next to patient zero
  var p = el.parentNode;
  p.insertBefore(c, el.nextElementSibling);

  // Fetch clean style from server
  jQuery.getJSON('<?php echo obfuscate('blackbox/bob_generator'); ?>?' + btoa('selector=' + btoa(selector) + '&parents=' + depth), function(data) {
    console.log('restyling ' + selector + ' depth: ' + (data.length-1));
    var node = ce;
    for (var i=0, l = data.length; i < l; i++) {
      node.removeAttribute('style');
      for (var key in data[i]) { 
        node.style.setProperty(key, data[i][key]); 
      } 
      node = node.parentNode; 
    }
    callback(ce);
  }).error(function() {
    console.error('could not restyle ' + selector);
    callback(ce);
  });
  return ce;
}

// Is this element hidden or are all its children hidden?
function hidden(el) {
  var selfhidden = (el === null || el.offsetParent === null || el.offsetHeight === 0 || el.offsetWidth === 0);
  if (selfhidden) return selfhidden;

  if (el.tagName.toLowerCase() === 'img' && !isImageOk(el)) return true;   

  // Adblock may have denied access to an ad resource
  var children = el.children;
  if (children.length === 0) return selfhidden;
  for (var i=0, l=children.length; i < l; i++) {
    if (!hidden(children[i])) return false;
  }
  return true;
}

function isImageOk(img) {
    // During the onload event, IE correctly identifies any images that
    // weren’t downloaded as not complete. Others should too. Gecko-based
    // browsers act like NS4 in that they report this incorrectly.
    if (!img.complete) {
        return false;
    }

    // However, they do have two very useful properties: naturalWidth and
    // naturalHeight. These give the true size of the image. If it failed
    // to load, either of these should be zero.

    if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
        return false;
    }

    // No other way of checking: assume it’s ok.
    return true;
}

// Recurse through parents until we find an element that isn't hidden
function recurseFindHighestBlocked(el, d) {
  if (el === null) throw {name: 'NullReferenceException', message: 'argument el is Null'};
  d = d || 0;
  if (!hidden(el)) {
    return {element: el, depth: d};
  }
  if (el.parentNode === null) {
    return {element: el, depth: d};
  }
  var pel = el.parentNode;
  if (!hidden(pel)) {
    return {element: el, depth: d};
  }
  return recurseFindHighestBlocked(pel, 1+d);
}
