$(document).ready(function() {
	// Start hashing after a 3s timeout so ready-handlers have time to change the DOM
	// TODO: Stop using XPaths as identifiers as they may change when the DOM changes
	setTimeout(function() {
		chrome.runtime.sendMessage({action: "hashReferences"});
	}, 3000);

	(function() {
		// Check visibility change when browser window has moved
		var windowX = window.screenX;
		var windowY = window.screenY;
	setInterval(function() {
		if (hashesCalculated && windowX !== window.screenX || windowY !== window.screenY) {
				checkVisibilityChange();
		}
		windowX = window.screenX;
		windowY = window.screenY;
	}, 1000);
	}());
});
$(window).scroll(function() {
	if (hashesCalculated === true)
		checkVisibilityChange();
});
$(window).resize(function() {
	if (hashesCalculated === true)
		checkVisibilityChange();
});
$(window).unload(function() {
	if (hashesCalculated === true)
		clearVisible();
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action === "dataUrlCalculated") {
		onDataUrlCalculated(request.dataUrl, request.index, request.type);
	} else if (request.action === "referenceHashList") {
		onReferenceHashList(request.hashList);
	}
});

// Hashes of reference adverts in ref_adverts/. Set<hash>
var refHashList = {};

// All images in page. Map<xpath,hash>
var pageHashesByXPath = {};

// Images currently at least partially visible on-screen. Set<xpath>
var visibleImageXPaths = {};

// Required for callbacks from background script.
var tabId;

var imagesInPage;

var hashesCalculated = false;

function onReferenceHashList(hashList) {
	refHashList = hashList;
	console.log("received " + Object.keys(refHashList).length + " reference hashes");
	if (!hashesCalculated) hashImagesInPage();
}

function onDataUrlCalculated(dataUrl, index, type) {
	var hashCode = dataUrl === null ? null : dataUrl2hashCode(dataUrl);
	var nextIndex = index + 1;
	
	if (type === "page") {
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
			console.log(Object.keys(pageHashesByXPath).length + " images tracked");
			checkVisibilityChange();
		}
	}
}

// Calc hashes of all instances of the reference images on the page.
// Populates pageHashesBySrc:Map<img.src,hashCode>.
function hashImagesInPage() {
	imagesInPage = $(document).find("img");
	console.log("hashing " + imagesInPage.length + " images");
	hashImageInPage(0);
}

function hashImageInPage(index) {
	var pageImage = imagesInPage[index];
	
	var image = null;
	if (pageImage.src) {
		image = pageImage.src;
	}
	else {
		var background = $(pageImage).css("background");
		var urlRegex = /url\((.*)\)/g;
		var match = urlRegex.exec(background);
		if (match && match[1])
			image = match[1];
	}

	if (index === 0 || ((index+1) % 20) === 0 || (index+1) === imagesInPage.length) {
		console.log("hashing image " + (index+1) + '/' + imagesInPage.length);
	}
	
	chrome.runtime.sendMessage({action: "dataUrl", type: "page", index: index, src: image});
}
	
// Record "not_visible" entries for everything currently visible before navigating to next page to clean up.
function clearVisible() {
	$.each(visibleImageXPaths, function(imageXPath, dummy) {
		var images = $(document.body).xpath(imageXPath);
		var hashCode = pageHashesByXPath(imageXPath);
		
		// FIXME see checkVisibilityChange() below on why this loop needs removing. 
		$.each(images, function(index, image) {
			recordVisibilityInfo(image, hashCode, false);
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
//			console.log("xpath non-unique :(");
		}
		
		// FIXME real answer is to find out why xpath is non-unique. for now though, we accept false-positives by using
		// a loop. once xpath is guaranteed to give exactly one element, the loop can be removed.
		$.each(images, function(index, image) {
			if (imageXPath in visibleImageXPaths) {
				if (checkVisible(image)) { // image still in viewport
					recordVisibilityInfo(image, hashCode, true);
				}
				else { // image has left viewport
					recordVisibilityInfo(image, hashCode, false);
					delete visibleImageXPaths[imageXPath];
				}
			}
			else { // not previously visible.
				if (checkVisible(image)) { // has image entered viewport?
					recordVisibilityInfo(image, hashCode, true);
					visibleImageXPaths[imageXPath] = true;
				}
			}
		});
	});
};

// Determines whether an element is within the browser viewport.
function checkVisible(element) {
    var viewportHeight = $(window).height();
    var scrollTop = $(window).scrollTop();
    var elementTop = $(element).offset().top;
    var elementHeight = $(element).height();
    
    var withinBottomBound = (elementTop < (viewportHeight + scrollTop));
    var withinTopBound = (elementTop > (scrollTop - elementHeight));
    
    var viewportWidth = $(window).width();
    var scrollLeft = $(window).scrollLeft();
    var elementLeft = $(element).offset().left;
    var elementWidth = $(element).width();

    var withinLeftBound = (elementLeft < (viewportWidth + scrollLeft));
    var withinRightBound = (elementLeft > (scrollLeft - elementWidth));
    
	return withinBottomBound && withinTopBound && withinLeftBound && withinRightBound;
}

// Produce the output - visibility information.
function recordVisibilityInfo(image, hashCode, isVisible) {
	var timestamp = (new Date()).getTime();
	var source = image.src;

	var vpDocOffsetTop = $(window).scrollTop();
	var vpDocOffsetBottom = vpDocOffsetTop + $(window).height();
	var vpDocOffsetLeft = $(window).scrollLeft();
	var vpDocOffsetRight = vpDocOffsetLeft + $(window).width();
	
	// Position of element within document.
	var offset = $(image).offset();
	var dLeft = offset.left;
	var dRight = dLeft + $(image).width();
	var dTop = offset.top;
	var dBottom = dTop + $(image).height();
	
	// Account for partial visibility.
	dLeft = Math.max(dLeft, vpDocOffsetLeft);
	dRight = Math.min(dRight, vpDocOffsetRight);
	dTop = Math.max(dTop, vpDocOffsetTop);
	dBottom = Math.min(dBottom, vpDocOffsetBottom);
	
	// Map document positions to viewport positions.
	var vpTop = dTop - vpDocOffsetTop;
	var vpBottom = dBottom - vpDocOffsetTop;
	var vpLeft = dLeft - vpDocOffsetLeft;
	var vpRight = dRight - vpDocOffsetLeft;
	
	// Window position (not viewport position :( )
	var screenY = (window.screenY | window.screenTop); // screenTop/Left are for MSIE
	var screenX = (window.screenX | window.screenLeft);
	// Determine how much of the screen is taken up by tabs, toolbars, scrollbars etc
	var browserNonViewportY = window.outerHeight - window.innerHeight;
	var browserNonViewportX = window.outerWidth - window.innerWidth;
	
	// Determining screen or window position of an element, as opposed to viewport position,
	// appears impossible as of 2014-08-07. Detail:
	// http://stackoverflow.com/questions/2337795/screen-coordinates-of-a-element-via-javascript
	
	// We can get:
	// 1. Browser window position,
	// 2. An element's viewport position,
	// 3. Viewport size, and
	// 4. Browser size.
	// What we don't have is viewport POSITION. That is, we don't know whether the difference between the height of (3)
	// and (4) is due to browser UI components above or below the viewport. This isn't so obvious, as the following go
	// on the bottom:
	//   a. Firefox's search bar.
	//   b. Chrome's inspector.
	//   c. Chrome's downloads.
	// IE and Opera will put the scrollbar on the left in right-to-left locales (Arabic, Hebrew, ...).
	
	// We approximate screen positions by:
	// 1. Adding screen position of browser to element position.
	// 2. Assuming any difference between 'outer' (window) and 'inner' (viewport) size of browser is on the top and
	// right.
	var sTop = vpTop + screenY + browserNonViewportY;
	var sBottom = vpBottom + screenY + browserNonViewportY;
	var sLeft = vpLeft + screenX - browserNonViewportX;
	var sRight = vpRight + screenX - browserNonViewportX;

	// Alternative: hard-code height of browser content above viewport. With default font sizes etc, this is as follows:
	// Chrome: 76px
	// Firefox: 87px
	// MSIE: 54px

	// Because of the hacky approximations above, we need to ensure we've not gone outside screen coordinates.
	sTop = Math.max(0, sTop);
	sBottom = Math.min(screen.height - 1, sBottom);
	sLeft = Math.max(0, sLeft);
	sRight = Math.min(screen.width - 1, sRight);
	
	logVisibilityInfo(timestamp, source, hashCode, sLeft, sRight, sTop, sBottom, isVisible);
	sendVisibilityInfoToNative(timestamp, source, hashCode, sLeft, sRight, sTop, sBottom, isVisible);
}

function logVisibilityInfo(timestamp, source, hashCode, sLeft, sRight, sTop, sBottom, isVisible) {
	var out = "[ADVERT] " +
	"ts=" + timestamp +
	",src=" + source +
	",hash=" + hashCode;

	if (isVisible)
		out += ",left=" + sLeft +
			",right=" + sRight +
			",top=" + sTop +
			",bottom=" + sBottom;
	
	out += ",visible=" + isVisible;
	
	console.log(out);
}

function sendVisibilityInfoToNative(timestamp, source, hashCode, sLeft, sRight, sTop, sBottom, isVisible) {
	// Content scripts can't directly send to native - must go via background script.
	chrome.runtime.sendMessage({
		action: "sendToNative",
		timestamp: timestamp,
		url: source,
		hashCode: hashCode,
		absPosLeft: sLeft,
		absPosRight: sRight,
		absPosTop: sTop,
		absPosBottom: sBottom,
		visible: isVisible
	});
}
