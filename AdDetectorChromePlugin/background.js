/*
 * content.js runs in the DOM context of the page.
 * 
 * Due to cross-origin resource sharing (CORS) restrictions, we can't retrieve image data in the page's
 * DOM context. So we do it here.
 * 
 * See:
 * 
 * http://stackoverflow.com/questions/19894948/canvas-has-been-tainted-by-cross-origin-data-via-local-chrome-extension-url/19906874#19906874
 * https://code.google.com/p/chromium/issues/detail?id=161471
 */

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	calcDataUrl(request.type, request.index, request.src, sender.tab.id);
});

function calcDataUrl(type, index, src, tabId) {
	// Create an empty canvas element
    var canvas = document.createElement("canvas");
    
    var image = new Image();
	image.src = src;
	image.addEventListener("load", function() {
		// now that the image has loaded, we can find out its real dimensions ('natural' dimensions. Not dimensions
		// declared in HTML/CSS.)
		canvas.width = image.width;
	    canvas.height = image.height;
		
		// drawing must happen after the image has been loaded from the src URL, or we get a blank canvas
		canvas.getContext("2d").drawImage(image, 0, 0);
		
		// not bomb-proof...
	    var format = image.src.endsWith("jpg") ? "image/jpg" : "image/png";
	    var dataUrl = canvas.toDataURL(format);
		
	    // return data to content script
	    chrome.tabs.sendMessage(tabId, {dataUrl: dataUrl, index: index, type: type});
	});
}
