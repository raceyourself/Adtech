function recreate(e,created) {
  if (e === null || !hidden(e)) return null;
  console.log('recreating ' + e.id);
  var el = recursefindhighestblocked(e);
  var depth = recursefinddepthblocked(e);
  console.log(depth);
  var c = el.cloneNode(true);
  var ce = null;
  c.className = '';
  if (c.id && c.id === e.id) ce = c;
  c.id = '';
  //clonestyle(el, c);
  if (c.style) {
    c.style.display = 'block';
    c.style.visibility = 'visible';
    c.style.textAlign = 'center';
    if (c.style.height) {
      c.style.minHeight = c.style.height;
      c.style.height = '';
    }
    if (c.style.width) {
      c.style.minWidth = c.style.width;
      c.style.width = '';
    }
  }
  var children = c.getElementsByTagName(e.tagName);
  var templates = el.getElementsByTagName(e.tagName);
  for (var i=0, l=children.length; i < l; i++) {
    var child = children[i];
    var template = templates[i];
    child.className = '';
    if (child.id && child.id === e.id) ce = child;
    child.id = '';
    //clonestyle(child, template);
    if (child.style) {
      child.style.display = 'inline-block';
      child.style.visibility = 'visible';
      if (child.style.height) {
        child.style.minHeight = child.style.height;
        child.style.height = '';
      }
      if (child.style.width) {
        child.style.minWidth = child.style.width;
        child.style.width = '';
      }
    }
  }
  var p = el.parentNode;
  p.insertBefore(c, el.nextElementSibling);
  ce.style.display = 'inline-block';
  ce.id = 'bob' + ~~(Math.random() * 9999)
  if (e.id) jQuery.getJSON('http://demo.glassinsight.co.uk/bob_generator?selector=' + btoa(e.id) + '&parents=' + depth, function(data) {
    console.log('restyling ' + e.id + ' ' + ce.id);
    var node = document.getElementById(ce.id); 
    for (var i=0, l = data.length; i < l; i++) {
      node.removeAttribute('style');
      for (var key in data[i]) { 
        node.style[key] = data[i][key]; 
      } 
      node = node.parentNode; 
    }
    created(ce);
  }).error(function() {
    console.error('could not restyle ' + e.id + ' ' + ce.id);
    created(ce);
  });
  return ce;
}

function hidden(el) {
  var selfhidden = (el === null || el.offsetParent === null || el.offsetHeight === 0 || el.offsetWidth === 0);
  if (selfhidden) return selfhidden;
  var children = el.children;
  if (children.length === 0) return selfhidden;
  for (var i=0, l=children.length; i < l; i++) {
    if (!hidden(children[i])) return false;
  }
  return true;
}

function findhighestblocked(id) {
  var el = document.getElementById(id);
  return recursefindhighestblocked(el); 
}

function recursefinddepthblocked(el,depth) {
  depth = depth || 1;
  if (el === null) return depth;
  if (!hidden(el)) {
    return depth;
  }
  if (el.parentNode === null) {
    return depth;
  }
  var pel = el.parentNode;
  if (!hidden(pel)) {
    return depth;
  }
  return recursefinddepthblocked(pel,depth+1);
}

function recursefindhighestblocked(el) {
  if (el === null) return null;
  if (!hidden(el)) {
    return el;
  }
  if (el.parentNode === null) {
    return el;
  }
  var pel = el.parentNode;
  if (!hidden(pel)) {
    return el;
  }
  return recursefindhighestblocked(pel);
}

function getChildNumber(node) {
  return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}

function clonestyle(from,to)
            {
                var cs = false;
                if (from.currentStyle)
                     cs = from.currentStyle;
                else if (window.getComputedStyle)
                     cs = document.defaultView.getComputedStyle(from,null);
                if(!cs)
                    return null;
            for(var prop in cs)
                {
                        if(cs[prop] != undefined && cs[prop].length > 0 && typeof cs[prop] !== 'object' && typeof cs[prop] !== 'function' && prop != parseInt(prop))
                        {
                                to.style[prop] = cs[prop];

                        }   
                }   
            }
