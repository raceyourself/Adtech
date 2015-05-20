// TODO: Generate unique ids for each element as src+hashCode may not be unique. 

var eventQueue = [];
var DEFAULT_SEND_DELAY = 1000; // milliseconds
var sendDelay = DEFAULT_SEND_DELAY;
var sendTimeout = false; // setTimeout reference
var eventUrl = "https://www.glassinsight.co.uk/api/display_events";

var recordVisibility = false;
var recordImpressions = true;
var recordInteractions = true;

// Hashes of reference adverts. Set<hash>
var refHashList = {};

// For each image that occurs in the page, this contains a mapping to its hash.
var imageOccurrenceHashes = new WeakMap();
var imageOccurrenceHashKeys = []; // WeakMap keys required for iteration

// Set<Image> - all reference image occurrences in the page.
var refImageOccurrenceHashKeys = [];

// Images currently at least partially visible on-screen. Set<image>
var visibleImages = new WeakSet();
var visibleImageKeys = []; // WeakSet keys required for iteration

// Required for callbacks from background script.
var tabId;

var imagesInPage;

var hashesCalculated = false;

var documentUrl;

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
/*
window.addEventListener('message', function(event) {
    imagesInPage = imagesInPage.concat(event.data);
});*/

function processPage() {
    documentUrl = document.URL;
    
    imagesInPage = $(document).find("img");
    
    /*
    if (inIframe()) { // in an iframe.
        window.parent.postMessage(imagesInPage);
        return;
    }
    */
    
    /*var frame;
    for (var i = 0; i < window.frames.length; i++) {
        frame = window.frames[i];
    //window.frames.forEach(function(frame) {
        var imagesInIframe = $(frame).find("img");
        imagesInPage = imagesInPage.concat(imagesInIframe);
//    });
    }*/
    
	// Request reference hashes from background.js (callback starts hashing of page images)
	chrome.runtime.sendMessage({action: "hashReferences"});
	
	MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(function(mutations, observer) {
		// fired when a mutation occurs
		mutations.forEach(function(mutation) {
			var nodeList = mutation.addedNodes;
			for (var i = 0; i < nodeList.length; ++i) {
				var node = nodeList[i];
				if (node.nodeName == 'IMG') {
					imagesInPage.push(node);
					if (hashesCalculated) {
						hashImageInPage(imagesInPage.length-1);
					}
				}
			}
		});
	});
	// define what element should be observed by the observer and what types of mutations trigger the callback
	observer.observe(document, {
	  subtree: true,	
	  childList: true
	});	
	
	(function() {
		// Check visibility change when browser window has moved
		var windowX = window.screenX;
		var windowY = window.screenY;
		setInterval(function() {
			if (hashesCalculated && windowX !== window.screenX || windowY !== window.screenY) {
					recordVisibilityChanges();
			}
			windowX = window.screenX;
			windowY = window.screenY;
		}, 1000);
	}());
}

if (inIframe()) {
    setTimeout(processPage, 2000);
    //$(document).load();
}
else {
    $(document).ready(processPage);
}

$(window).scroll(function() {
	if (hashesCalculated === true)
		recordVisibilityChanges();
});
$(window).resize(function() {
	if (hashesCalculated === true)
		recordVisibilityChanges();
});
$(window).unload(function() {
	if (hashesCalculated === true)
		clearVisible();
	if (eventQueue.length > 0) {
		// TODO: Move to background.js?
		if (sendTimeout) clearTimeout(sendTimeout);
		sendEvents();
	}
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action === "dataUrlCalculated") {
		onDataUrlCalculated(request.dataUrl, request.index, request.type);
	} else if (request.action === "referenceHashList") {
		onReferenceHashList(request.hashList);
	}
});

function onReferenceHashList(hashList) {
	refHashList = {};
	// Convert array to set/hash for faster lookup
	hashList.forEach(function(hash, index, hashList) {
		refHashList[hash] = true;
	});
	console.log("received " + Object.keys(refHashList).length + " reference hashes");
	if (!hashesCalculated) hashImagesInPage();
}

function onDataUrlCalculated(dataUrl, index, type) {
	var hashCode = dataUrl === null ? null : dataUrl2hashCode(dataUrl);
	var nextIndex = index + 1;
    var pageImage;
	
	if (type === "page") {
        try {
            // record mouseEnter/mouseLeave for this image (TODO: use AdBlock blacklist to distinguish adverts from other images)
            pageImage = imagesInPage[index];
            $(pageImage).mouseleave(function(event) {
                // NOTE: This does not fire until the mouse moves, if we need perfect accuracy
                //       we would need to do our own visibility tracking.
                recordInteractionInfo(pageImage, hashCode, false)
            });
            $(pageImage).mouseenter(function(event) {
                recordInteractionInfo(pageImage, hashCode, true)
            });
            imageOccurrenceHashes.set(pageImage, hashCode);
            imageOccurrenceHashKeys.push(pageImage);

            // only add if this in-page image matches one of our reference images.
            if (hashCode in refHashList) {
                refImageOccurrenceHashKeys.push(pageImage);
            }

            var limit = imagesInPage.length;
            if (nextIndex < limit)
                hashImageInPage(nextIndex);
            else {
                hashesCalculated = true;
                console.log(imageOccurrenceHashKeys.length + " images tracked, of which " + refImageOccurrenceHashKeys.length + " are ref images");
                recordVisibilityChanges();
            }
        } catch (err) {
          var bar = documentUrl;
          var foo = $(document).find("img");
          console.log("onDataUrlCalculated() error:" + err + 
                    ";imagesInPage:" + imagesInPage +
                    ";index:" + index +
                    ";documentUrl:" + documentUrl);
        }
	}
}

// Calc hashes of all instances of the reference images on the page.
// Populates pageHashesBySrc:Map<img.src,hashCode>.
function hashImagesInPage() {
	console.log("hashing " + imagesInPage.length + " images");
	hashImageInPage(0);
}

var debugLastLogTimestamp = new Date().getTime();

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

	var timestamp = new Date().getTime();
  
    // condition stops console being flooded
	if (index === 0 || timestamp > debugLastLogTimestamp + 1000 || (index+1) === imagesInPage.length) {
		console.log("hashing image " + (index+1) + '/' + imagesInPage.length);
		debugLastLogTimestamp = timestamp;
	}
	
	chrome.runtime.sendMessage({action: "dataUrl", type: "page", index: index, src: image});
}
	
// Record "not_visible" entries for everything currently visible before navigating to next page to clean up.
function clearVisible() {
	visibleImageKeys.forEach(function(image, index, visibleImageKeys) {
		var hashCode = imageOccurrenceHashes.get(image);
		
		recordVisibilityInfo(image, hashCode, false);
		recordImpressionInfo(image, hashCode, false);
	});
}

function recordVisibilityChanges() {
	imageOccurrenceHashKeys.forEach(function(image, index, imageOccurrenceHashKeys) {
		var hashCode = imageOccurrenceHashes.get(image);
        var isReference = _.includes(refImageOccurrenceHashKeys, image);
        
		if (visibleImages.has(image)) {
			if (checkVisible(image)) { // image still in viewport
				recordVisibilityInfo(image, hashCode, true);
			}
			else { // image has left viewport
				recordVisibilityInfo(image, hashCode, false);				
				recordImpressionInfo(image, hashCode, false);
              
				visibleImages.delete(image);
				var index = visibleImageKeys.indexOf(image);
				if (index > -1) visibleImageKeys.splice(index, 1); // remove from visibleImageKeys
			}
		}
		else { // not previously visible.
			if (checkVisible(image)) { // has image entered viewport?
				recordVisibilityInfo(image, hashCode, true);
				recordImpressionInfo(image, hashCode, true);
              
				visibleImages.add(image);
				var index = visibleImageKeys.indexOf(image);
				if (index < 0) visibleImageKeys.push(image);
			}
		}
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

////////////////////////////////// RECORDING //////////////////////////////////

/** Record dimensions of image in viewport. */
function recordVisibilityInfo(image, hashCode, isVisible) {
	if (!recordVisibility) return;
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
	
    var event = {
        type: "visibility",
        timestamp: timestamp,
        source: source,
        hash: hashCode,
        visible: isVisible
    };
    
	if (isVisible) {
      _.extend(event, {
        left: sLeft,
        right: sRight,
        top: sTop,
        bottom: sBottom
      });
    }
	
	trackEvent(event);
}

/** Record mouse movement in/out of image. */
function recordInteractionInfo(image, hashCode, isOver) {
	if (!recordInteractions) return;
	
    var type = isOver ? 'mouse_enter' : 'mouse_leave';
	
    record(type, image.src, hashCode);
}

/** Record whether image is in viewport at all or not (binary). */
function recordImpressionInfo(image, hashCode, isVisible) {
	if (!recordImpressions) return;
	
	var type = isVisible ? 'viewport_enter' : 'viewport_leave';
	
    record(type, image.src, hashCode);
}

function record(type, source, hashCode) {
	var timestamp = (new Date()).getTime();
    var event = {
		type: type,
		timestamp: timestamp,
		source: source,
		hash: hashCode
	};
    
    trackEvent(event);
  
    console.log(JSON.stringify(event));
}

function trackEvent(event) {
	eventQueue.push(event);
	if (!sendTimeout) setTimeout(sendEvents, sendDelay);
}

/** Sends queue of events to API. */
function sendEvents() {
	var queue = eventQueue;
	eventQueue = [];
	$.post(eventUrl, queue, function() {
		console.log("Sent " + queue.length + " events");		
		sendDelay = DEFAULT_SEND_DELAY;
		sendTimeout = false;
	}).fail(function() {
		eventQueue.concat(queue);
		sendDelay *= 4;
		sendTimeout = setTimeout(sendEvents, sendDelay);
	});
}
