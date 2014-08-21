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

var nativePort;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action === "hashReferences") {
		refHashListeners.push(sender.tab.id);
		hashReferenceImages();
	} else if (request.action === "dataUrl") {
		calcDataUrl(request.src, function(dataUrl) {			
			chrome.tabs.sendMessage(sender.tab.id, {action: "dataUrlCalculated", dataUrl: dataUrl, index: request.index, type: request.type});
		});
	} else if (request.action === "sendToNative") {
		sendVisibilityInfoToNative(request.timestamp, request.url, request.hashCode, request.absPosLeft,
				request.absPosRight, request.absPosTop, request.absPosBottom, request.visible);
	}
});

// As of 2014-08-05 it appears to be impossible to make Chrome search for all files in an extension subdir.
// So we need to name them explicitly (or load them over the web?).
// NOTE: MUST BE MANUALLY UPDATED
var refImages = new Array(
		"ref_images/LEADERSHIP1-largeHorizontal375.jpg",		
        "ref_images/200x90_Banner_Ad_Placholder.png",
        "ref_images/300x250_Banner_Ad_Placholder.png",
        "ref_images/300x125_Banner_Ad_Placholder.png",
        "ref_images/300x150_Banner_Ad_Placholder.png",
        "ref_images/300x250B_Banner_Ad_Placholder.png",
        "ref_images/320x285_Banner_Ad_Placholder.png",
        "ref_images/700x75_Banner_Ad_Placholder.png",
        "ref_images/700x90_Banner_Ad_Placholder.png",
        "ref_images/720x300_Banner_Ad_Placholder.png",
        "ref_images/728x90_Banner_Ad_Placholder.png",
        "ref_images/1000x90_Banner_Ad_Placholder.png",
        "ref_images/9800x250_Banner_Ad_Placholder.png"
);

// Hashes of reference adverts in ref_adverts/. Set<hash>
var refHashList = {};

var hashesCalculated = false;

var refHashListeners = [];

// Calc hashes of references images - the images we're looking out for.
// Populates refHashList:Set<hash>.
function hashReferenceImages() {
	if (!hashesCalculated) {
		hashReferenceImage(0);
	} else {
		onReferenceImagesHashed();
	}
}

function hashReferenceImage(index) {
	var imagePath = refImages[index];
	
	var imageUrl = chrome.extension.getURL(imagePath);
	
	calcDataUrl(imageUrl, function(dataUrl) {			
		onDataUrlCalculated(dataUrl, index);
	});
}

function onReferenceImagesHashed() {
	refHashListeners.forEach(function(tabId) {
		console.log("Sending refHasList of " + Object.keys(refHashList).length);
		chrome.tabs.sendMessage(tabId, {action: "referenceHashList", hashList: refHashList});
	});
	refHashListeners = [];
}

function onDataUrlCalculated(dataUrl, index) {
	var hashCode = dataUrl === null ? null : dataUrl2hashCode(dataUrl);
	var nextIndex = index + 1;
	
	refHashList[hashCode] = true; // add hashcode to set
	
	var limit = refImages.length;
	if (nextIndex < limit) { // more ref images need hashing
		hashReferenceImage(nextIndex);
	} else {
		hashesCalculated = true;
		onReferenceImagesHashed();
	}
}

function sendVisibilityInfoToNative(
		timestamp, url, hashCode, absPosLeft, absPosRight, absPosTop, absPosBottom, visible) {
	if (nativePort === null) {
		nativePort = chrome.runtime.connectNative('com.glassinsight.addetector');
		nativePort.onDisconnect.addListener(onNativeDisconnect);
		nativePort.onMessage.addListener(onNativeMessage);
	}
	
	if (nativePort) {
		nativePort.postMessage({
			timestamp: timestamp,
			url: url,
			hashCode: hashCode,
			absPosLeft: absPosLeft,
			absPosRight: absPosRight,
			absPosTop: absPosTop,
			absPosBottom: absPosBottom,
			visible: visible
		});
	}
}

function onNativeDisconnect() {
	console.log("Native app has disconnected");
	nativePort = null;
}

function onNativeMessage(msg) { // debug only
	console.log("[FROM NATIVE] Received echoed message back from native app: " + JSON.stringify(msg));
}

function calcDataUrl(src, callback) {
	if (!src) {
		callback(null);
		return;
	}
	
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
		
	    if (image.src.contains("10DYLAN1")) {
	    	var aaa = 0;
	    	aaa = aaa + 2; // for breakpoint purposes...
	    }
	    
	    // return data to content script
	    callback(dataUrl);
	});
}

hashReferenceImages();