function dataUrl2hashCode(dataUrl) {
	var base64 = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
	var hashCode = base64.hashCode();
	return hashCode;
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.hashCode = function() {
	var hash = 0, i, chr, len;
	if (this.length == 0)
		return hash;
	for (i = 0, len = this.length; i < len; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

String.prototype.contains = function(needle) {
	return this.indexOf(needle) > -1;
};

//Stolen from FireBug source.
function getXPath(element) {
 if (element && element.id)
     return '//*[@id="' + element.id + '"]';
 else
     return this.getElementTreeXPath(element);
};

//Stolen from FireBug source.
function getElementTreeXPath(element)
{
 var paths = [];

 // Use nodeName (instead of localName) so namespace prefix is included (if any).
 for (; element && element.nodeType == 1; element = element.parentNode)
 {
     var index = 0;
     for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
     {
         // Ignore document type declaration.
         if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
             continue;

         if (sibling.nodeName == element.nodeName)
             ++index;
     }

     var tagName = element.nodeName.toLowerCase();
     var pathIndex = (index ? "[" + (index+1) + "]" : "");
     paths.splice(0, 0, tagName + pathIndex);
 }

 return paths.length ? "/" + paths.join("/") : null;
};
