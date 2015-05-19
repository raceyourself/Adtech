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
	if (request.action === "hashReferences") {
		refHashListeners.push(sender.tab.id);
		hashReferenceImages();
	} else if (request.action === "dataUrl") {
		calcDataUrl(request.src, function(dataUrl) {			
			chrome.tabs.sendMessage(sender.tab.id, {action: "dataUrlCalculated", dataUrl: dataUrl, index: request.index, type: request.type});
		});
	}
});

var confUrl = "http://demo-staging.haystackplatform.com/workspaces/donkDR/display_conf"; // TODO put somewhere sensible?

// Hashes of reference adverts. Set<hash>
// TODO: Cache locally?
var refHashList = [];

var hashesFetching = false;

var refHashListeners = [];

// Calc hashes of references images - the images we're looking out for.
// Populates refHashList:Set<hash>.
function hashReferenceImages() {
	if (refHashList.length === 0) {
		if (!hashesFetching) {
			hashesFetching = true;
			$.getJSON(confUrl, function(data) {
				if (data.reference_hashes && data.reference_hashes.length > 0) {
					refHashList = data.reference_hashes;
					hashesFetching = false;
					console.log("Fetched " + refHashList.length + " reference hashes");
					onReferenceImagesHashed();
				} else {
					console.log("Could not fetch reference hashes: bad response");
				}
			}).fail(function() {
				console.log("Could not fetch reference hashes: network error");
                hashesFetching = false;
			});
		}
	} else {
		onReferenceImagesHashed();
	}
}

function onReferenceImagesHashed() {
	refHashListeners.forEach(function(tabId) {
		console.log("Sending refHasList of " + refHashList.length);
		chrome.tabs.sendMessage(tabId, {action: "referenceHashList", hashList: refHashList});
	});
	refHashListeners = [];
}

function calcDataUrl(src, callback) {
	if (!src) {
		callback(null);
		return;
	}
	
	// Create an empty canvas element
    var canvas = document.createElement("canvas");
    
    var image = new Image();
	image.addEventListener("error", function() {
		callback(null);
	});
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
		
	    if (image.src.contains("10DYLAN1")) {
	    	var aaa = 0;
	    	aaa = aaa + 2; // for breakpoint purposes...
	    }
	    
	    // return data to content script
	    callback(dataUrl);
	});
	image.src = src;
}

hashReferenceImages();