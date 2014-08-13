function recreate(e) {
  if (e === null || !hidden(e)) return null;
  var el = recursefindhighestblocked(e);
  var c = el.cloneNode(true);
  var ce = null;
  c.className = '';
  if (c.id && c.id === e.id) ce = c;
  c.id = '';
  clonestyle(el, c);
  c.style.display = 'block';
  c.style.visibility = 'visible';
  var children = c.getElementsByTagName('div');
  var templates = el.getElementsByTagName('div');
  for (var i=0, l=children.length; i < l; i++) {
    var child = children[i];
    var template = templates[i];
    child.className = '';
    if (child.id && child.id === e.id) ce = child;
    child.id = '';
    clonestyle(child, template);
    child.style.display = 'block';
    child.style.visibility = 'visible';
  }
  el.parentNode.insertBefore(c, el.nextElementSibling);
  return ce;
}

function hidden(el) {
  return (el === null || el.offsetParent === null || el.offsetHeight === 0 || el.offsetWidth === 0);
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
                        if(cs[prop] != undefined && cs[prop].length > 0 && typeof cs[prop] !== 'object' && typeof cs[prop] !== 'function' && prop != parseInt(prop) && prop.indexOf('webkit') === -1 && cs[prop].indexOf('webkit') === -1)
                        {
                                to.style[prop] = cs[prop];

                        }   
                }   
            }
