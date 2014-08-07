
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

function calcDataUrl(type, index, src, width, height, tabId) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    var image = new Image();
	image.src = src;
	image.width = width;
	image.height = height;
	image.addEventListener("load", function() {
		// drawing must happen after the image has been loaded from the src URL, or we get a blank canvas
		canvas.getContext("2d").drawImage(image, 0, 0);
		
		// not bomb-proof...
	    var format = image.src.endsWith("jpg") ? "image/jpg" : "image/png";
	    var dataUrl = canvas.toDataURL(format);
	    
	    // return data to content script
	    chrome.tabs.sendMessage(tabId, {dataUrl: dataUrl, index: index, type: type});
	});
}

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
