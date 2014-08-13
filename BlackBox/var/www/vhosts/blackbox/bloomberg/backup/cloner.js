function recreate(e) {
  if (e === null || !hidden(e)) return null;
  console.log('recreating ' + e.id);
  var el = recursefindhighestblocked(e);
  var c = el.cloneNode(true);
  console.log(c);
  var ce = null;
  c.className = '';
  if (c.id && c.id === e.id) ce = c;
  c.id = '';
  clonestyle(el, c);
  if (c.style) {
    c.style.display = 'block';
    c.style.visibility = 'visible';
    if (c.style.height) {
      c.style.minHeight = c.style.height;
      c.style.height = '';
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
    clonestyle(child, template);
    if (child.style) {
      child.style.display = 'block';
      child.style.visibility = 'visible';
    }
  }
  var p = el.parentNode;
  p.insertBefore(c, el.nextElementSibling);
  ce.style.display = 'inline-block';
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
