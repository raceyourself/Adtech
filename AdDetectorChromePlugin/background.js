/*
 * content.js runs in the DOM context of the page.
 * 
 * Due to cross-origin resource sharing (CORS) restrictions, we can't retrieve image data in the page's
 * DOM context. So we do it here.
 */

var refHashList = {};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action == "init") {
		refHashList = request.refHashList;
		sendResponse(); // ACK
	}
	else if (request.action == "getHashes") {
		var hashCodes = [];
		
		$.each(request.imageObjs, function(index, imageObj) {
			var pageImage = new Image();
			pageImage.src = imageObj.imageSrc;
			pageImage.width = imageObj.imageWidth;
			pageImage.height = imageObj.imageHeight;
			
			var hashCode = hashImage(pageImage);
			hashCodes.push(hashCode);
		});
		
		sendResponse({hashes : hashCodes});
	}
});

function hashImage(pageImage) {
	var hashCode = img2hashCode(pageImage);
	if (hashCode in refHashList) {
		
		hashCode = img2hashCode(pageImage);
		
		// only add if it's one of the images that interests us.
		return hashCode;
	}
	return null;
}
