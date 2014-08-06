
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

function img2hashCode(img) {
	var base64 = getBase64Image(img);
	return base64.hashCode();
}

function getBase64Image(img) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    
    // not bomb-proof...
    var format = img.src.endsWith("jpg") ? "image/jpg" : "image/png";
    
    var dataURL = canvas.toDataURL(format);

    // toDataURL gives us the Base64-encoded data, preceded by some metadata - strip this.
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
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
