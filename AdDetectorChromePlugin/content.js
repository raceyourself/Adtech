$(document).ready(function() {
	hashReferenceImages(); // TODO make this one-off init on plugin load.
	
	initForNewPage();
	hashImagesInPageAsync();
});
$(window).scroll(function() {
	if (hashesCalculated == true)
		checkVisibilityChange();
});
$(window).unload(function() {
	if (hashesCalculated == true)
		clearVisible();
});

// As of 2014-08-05 it appears to be impossible to make Chrome search for all files in an extension subdir.
// So we need to name them explicitly (or load them over the web?).
var refImagePaths = {
	//"/ref_images/nytimes_internal_ad_163x90.jpg":"163x90",
	"/ref_images/07comet-cnd-mediumFlexible177-v3.jpg":"177x100",
	"/ref_images/mag-10Economy-t_CA0-mediumSquare149.jpg":"149x149"
};

// Hashes of reference adverts in ref_adverts/. Set<hash>
var refHashList = {};

// All images in page. Map<xpath,hash>
var pageHashesByXPath = {};

// Images currently at least partially visible on-screen. Set<xpath>
var visibleImageXPaths = {};

var hashesCalculated;

// TODO is this needed or will everything be wiped on page load anyway?
// If so, make sure refHashList/refImagePaths remain as-is.
function initForNewPage() {
	pageHashesByXPath = {};
	visibleImageXPaths = {};
	hashesCalculated = false;
}

// Calc hashes of references images - the images we're looking out for.
// Populates refHashList:Set<hash>.
function hashReferenceImages() {
	$.each(refImagePaths, function(imagePath, sizeStr) {
		// load sample image
		var imageUrl = chrome.extension.getURL(imagePath);
		var img = new Image();
		img.src = imageUrl;
		var size = sizeStr.split("x");
		img.width = size[0];
		img.height = size[1];
		var hashCode = img2hashCode(img);
		refHashList[hashCode] = true;
	});
}

// Calc hashes of all instances of the reference images on the page. put in Map<img.src,hash>.
// Populates pageHashesBySrc:Map<img.src,hashCode>.
function hashImagesInPageAsync() {
	chrome.runtime.sendMessage({action: "init", refHashList: refHashList}, function(response) {
		hashImagesInPageAsyncContd();
	});
}

function hashImagesInPageAsyncContd() {
	var pageImages = $(document).find("img");
	
	var imageObjs = [];
	pageImages.each(function(index, pageImage) {
		imageObjs.push({
			imageSrc: pageImage.src,
			imageWidth: pageImage.width,
			imageHeight: pageImage.height
		});
	});
	
	chrome.runtime.sendMessage({action: "getHashes", imageObjs: imageObjs}, function(response) {
		$.each(response.hashes, function(index, hash) {
			var pageImage = pageImages[index];
			
			if (hash != null) {
				// FIXME isn't always returning unique xpath.
				var xPath = getXPath(pageImage);
				pageHashesByXPath[xPath] = hash;
			}
		});
		
		hashesCalculated = true;
		checkVisibilityChange();
	});
}

// Record "not_visible" entries for everything currently visible before navigating to next page to clean up.
function clearVisible() {
	$.each(visibleImageXPaths, function(imageXPath, dummy) {
		var image = $(document.body).xpath(imageXPath);
		var hashCode = pageHashesByXPath(imageXPath);
		recordVisibilityChange(visibleImage.src, hashCode, false);
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
			if (typeof ($(image).offset()) == 'undefined') {
				console.log("odd..." + $(image));
			}
			
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
