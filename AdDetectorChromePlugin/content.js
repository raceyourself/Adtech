$(document).ready(function() {
	initForNewPage();
	
	hashReferenceImages();
});
$(window).scroll(function() {
	if (hashesCalculated == true)
		checkVisibilityChange();
});
$(window).unload(function() {
	if (hashesCalculated == true)
		clearVisible();
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	onDataUrlCalculated(request.dataUrl, request.index, request.type);
});


// As of 2014-08-05 it appears to be impossible to make Chrome search for all files in an extension subdir.
// So we need to name them explicitly (or load them over the web?).
// NOTE: MUST BE MANUALLY UPDATED (including sizes)
var refImages = new Array(
	"/ref_images/07BLOCKS1-mediumSquare149-v2.jpg",
	"/ref_images/STEINFELD-thumbStandard.jpg",
	"/ref_images/CITYHALL1-thumbStandard.jpg",
	"/ref_images/07oped-thumbStandard.jpg",
	"/ref_images/0727MARIJUANA-thumbStandard.jpg"
);

// Hashes of reference adverts in ref_adverts/. Set<hash>
var refHashList = {};

// All images in page. Map<xpath,hash>
var pageHashesByXPath = {};

// Images currently at least partially visible on-screen. Set<xpath>
var visibleImageXPaths = {};

// Required for callbacks from background script.
var tabId;

var imagesInPage;

var hashesCalculated;

// TODO is this needed or will everything be wiped on page load anyway?
function initForNewPage() {
	pageHashesByXPath = {};
	visibleImageXPaths = {};
	hashesCalculated = false;
}

// Calc hashes of references images - the images we're looking out for.
// Populates refHashList:Set<hash>.
function hashReferenceImages() {
	hashReferenceImage(0);
}

function hashReferenceImage(index) {
	var imagePath = refImages[index];
	
	var imageUrl = chrome.extension.getURL(imagePath);
	
	chrome.runtime.sendMessage({type: "ref", index: index, src: imageUrl});
}

function onDataUrlCalculated(dataUrl, index, type) {
	var hashCode = dataUrl2hashCode(dataUrl);
	var nextIndex = index + 1;
	
	if (type == "ref") {
		refHashList[hashCode] = true; // add hashcode to set
		
		var limit = refImages.length;
		if (nextIndex < limit) // more ref images need hashing
			hashReferenceImage(nextIndex);
		else
			hashImagesInPage(); // start hashing images in page
	}
	else if (type == "page") {
		// only add if this in-page image matches one of our reference images.
		if (hashCode in refHashList) {
			var pageImage = imagesInPage[index];
			var xPath = getXPath(pageImage);
			pageHashesByXPath[xPath] = hashCode;
		}
		var limit = imagesInPage.length;
		if (nextIndex < limit)
			hashImageInPage(nextIndex);
		else {
			hashesCalculated = true;
			checkVisibilityChange();
		}
	}
	else {
		console.log("AdDetector extension error: unexpected data URL type '" + type + "'");
	}
}

// Calc hashes of all instances of the reference images on the page. put in Map<img.src,hash>.
// Populates pageHashesBySrc:Map<img.src,hashCode>.
function hashImagesInPage() {
	imagesInPage = $(document).find("img");
	hashImageInPage(0);
}

function hashImageInPage(index) {
	var pageImage = imagesInPage[index];
	
	chrome.runtime.sendMessage({type: "page", index: index, src: pageImage.src});
}

function dataUrl2hashCode(dataUrl) {
	var base64 = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
	var hashCode = base64.hashCode();
	return hashCode;
}

// Record "not_visible" entries for everything currently visible before navigating to next page to clean up.
function clearVisible() {
	$.each(visibleImageXPaths, function(imageXPath, dummy) {
		var images = $(document.body).xpath(imageXPath);
		var hashCode = pageHashesByXPath(imageXPath);
		
		// FIXME see checkVisibilityChange() below on why this loop needs removing. 
		$.each(images, function(index, image) {
			recordVisibilityChange(image.src, hashCode, false);
		});
	});
}

function checkVisibilityChange() {
	$.each(pageHashesByXPath, function(imageXPath, hashCode) {
		// this xpath function appears to ignore some (all?) indexes. E.g. a lookup for xpath:
		// /html/body/div[3]/main/section/div/div/div[2]/ol/li[2]/section/article/a/div/img
		// will also return an element at:
		// /html/body/div[3]/main/section/div/div/div[2]/ol/li[6]/section/article/a/div/img
		// is this a bug/limitation in the jQuery-xpath library or incorrect usage/understanding?
		var images = $(document.body).xpath(imageXPath);
		
		if (images.length > 1) {
			console.log("xpath non-unique :(");
		}
		
		// FIXME real answer is to find out why xpath is non-unique. for now though, we accept false-positives by using
		// a loop. once xpath is guaranteed to give exactly one element, the loop can be removed.
		$.each(images, function(index, image) {
			if (imageXPath in visibleImageXPaths) {
				if (!checkVisible(image)) { // has image gone out of viewport?
					recordVisibilityChange(image.src, hashCode, false);
					delete visibleImageXPaths[imageXPath];
				}
			}
			else { // not previously visible.
				if (checkVisible(image)) { // has image entered viewport?
					recordVisibilityChange(image.src, hashCode, true);
					visibleImageXPaths[imageXPath] = true;
				}
			}
		});
	});
};

function checkVisible(element, eval) {
    eval = eval || "visible";
    var viewportHeight = $(window).height(),
        scrollTopY = $(window).scrollTop(),
        elementTopY = $(element).offset().top,
        elementHeight = $(element).height();
    
    if (eval == "visible")
    	return (elementTopY < (viewportHeight + scrollTopY)) && (elementTopY > (scrollTopY - elementHeight));
    if (eval == "above")
    	return elementTopY < (viewportHeight + scrollTopY);
}

function recordVisibilityChange(imgSrc, hashCode, isVisible) {
	var ts = (new Date()).getTime();
	var visibilityStr = isVisible ? "visible" : "not_visible";
	
	// TODO replace with message passing.
	console.log("[ADVERT]" + ts + "," + imgSrc + "," + hashCode + "," + visibilityStr);
}
