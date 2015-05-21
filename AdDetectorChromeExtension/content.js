// TODO: Generate unique ids for each element as src+hashCode may not be unique. 

var DEFAULT_SEND_DELAY = 1000; // milliseconds
var RESOURCE_TAGS_UNWRAPPED = [
  'IMG',
  'IMAGE',
  'VIDEO'
];
var RESOURCE_TAGS_WRAPPED = [
  //'OBJECT'
];
var RESOURCE_TAGS = RESOURCE_TAGS_UNWRAPPED.concat(RESOURCE_TAGS_WRAPPED);

var eventQueue = [];
var sendDelay = DEFAULT_SEND_DELAY;
var sendTimeout = false; // setTimeout reference
var eventUrl = "https://www.glassinsight.co.uk/api/display_events";

var pageProcessed = false;

var recordVisibility = false;
var recordImpressions = true;
var recordInteractions = true;

// Images currently at least partially visible on-screen. Set<image>
var visibleResources = new Set();

var resourcesInPage;

var documentUrl;

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function processPage() {
    documentUrl = document.URL;
    
    resourcesInPage = $();
    RESOURCE_TAGS_UNWRAPPED.forEach(function (tag) {
        resourcesInPage = resourcesInPage.add(tag);
    });
    RESOURCE_TAGS_WRAPPED.forEach(function (tag) {
        // we wrap tags like Flash objects because they can't have mouse listeners on them directly.
        var tagInstances = $(tag.toLowerCase());
        
        var wrappedTagInstances = $();
        tagInstances.each(function(index, tagInstance) {
            wrappedTagInstances = wrappedTagInstances.add($(tagInstance).wrap('<div></div>'));
        });
        
        resourcesInPage = resourcesInPage.add(wrappedTagInstances);
    });
    
    resourcesInPage.each(function(index, pageImage) {
        var jPageImage = $(pageImage);
        
        jPageImage.mouseleave(function(event) {
            // NOTE: This does not fire until the mouse moves, if we need perfect accuracy
            //       we would need to do our own visibility tracking.
            var data = elementToDataObj(pageImage);
            recordInteractionInfo(pageImage, data, false);
        });
        jPageImage.mouseenter(function(event) {
            var data = elementToDataObj(pageImage);
            recordInteractionInfo(pageImage, data, true);
        });
    });
    
	MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(function(mutations, observer) {
		// fired when a mutation occurs
		mutations.forEach(function(mutation) {
			var addedNodes = mutation.addedNodes;
			for (var i = 0; i < addedNodes.length; ++i) {
				var node = addedNodes[i];
				if (_.contains(RESOURCE_TAGS_UNWRAPPED, node.nodeName)) {
					resourcesInPage = resourcesInPage.add(node);
				}
                else if (_.contains(RESOURCE_TAGS_WRAPPED, node.nodeName)) {
					resourcesInPage = resourcesInPage.add($(node).wrap('<div></div>'));
				}
			}
            var removedNodes = mutation.removedNodes;
			for (var i = 0; i < removedNodes.length; ++i) {
				var node = removedNodes[i];
				if (_.contains(RESOURCE_TAGS_UNWRAPPED, node.nodeName)) {
					resourcesInPage = resourcesInPage.not(node);
				}
                else if (_.contains(RESOURCE_TAGS_WRAPPED, node.nodeName)) {
					resourcesInPage = resourcesInPage.not($(node).wrap('<div></div>'));
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
			if (windowX !== window.screenX || windowY !== window.screenY) {
					recordVisibilityChanges();
			}
			windowX = window.screenX;
			windowY = window.screenY;
		}, 1000);
	}());
  
    pageProcessed = true;
}

if (inIframe()) {
    $(document).ready(function() {
        setTimeout(processPage, 5000);
    });
    //$(document).load();
}
else {
    $(document).ready(processPage);
}

$(window).scroll(function() {
    if (pageProcessed)
        recordVisibilityChanges();
});
$(window).resize(function() {
	if (pageProcessed)
        recordVisibilityChanges();
});
$(window).unload(function() {
	clearVisible();
	if (eventQueue.length > 0) {
		// TODO: Move to background.js?
		if (sendTimeout) clearTimeout(sendTimeout);
		sendEvents();
	}
});

// Record "not_visible" entries for everything currently visible before navigating to next page to clean up.
function clearVisible() {
	visibleResources.forEach(function(image) {
		var data = elementToDataObj(image);
        
        recordVisibilityInfo(image, data, false);
		recordImpressionInfo(image, data, false);
	});
}

function recordVisibilityChanges() {
	resourcesInPage.each(function(index, image) {
        var data = elementToDataObj(image);
        
        if (visibleResources.has(image)) {
			if (checkVisible(image)) { // image still in viewport
				recordVisibilityInfo(image, data, true);
			}
			else { // image has left viewport
				recordVisibilityInfo(image, data, false);				
				recordImpressionInfo(image, data, false);
              
				visibleResources.delete(image);
			}
		}
		else { // not previously visible.
			if (checkVisible(image)) { // has image entered viewport?
				recordVisibilityInfo(image, data, true);
				recordImpressionInfo(image, data, true);
              
				visibleResources.add(image);
			}
		}
	});
}

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

function elementToDataObj(element) {
    var data = {};
    
    if (element.nodeName === 'IMG') {
        data.source = element.src;
        data.attr = 'img/@src';
        if (!data.source) {
          data.source = element.srcset;
          data.attr = 'img/@srcset';
        }
    }
    else if (element.nodeName === 'VIDEO') {
        data.source = element.src;
        data.attr = 'video/@src';
        if (!data.source) {
            var videoSource = $('source', $(element)).first()[0];
            if (videoSource) {
                data.source = videoSource.src;
                data.attr = 'video/source[0]/@src';
            }
            else {
                // TODO deal with cases like these. Maybe it's dynamically loaded after the fact?
                // <video class="video-stream html5-main-video" style="width: 300px; height: 167px; left: 0px; top: -167px; transform: none;"></video>
                data.source = 'unknown';
                data.attr = 'video/unknown';
            }
        }
    }
    else if (element.nodeName.toUpperCase() === 'IMAGE') { // toUpperCase() necessary here because this is an SVG element, not an HTML element.
        data.source = element.getAttribute('xlink:href');
        data.attr = 'image/@xlink:href';
        if (!data.source) {
            data.source = element.src;
            data.attr = 'image/@src';
        }
    }
    else if (element.nodeName === 'OBJECT') { // flash (/oldschool video?)
        var unwrappedElement = $(element).children()[0];
        
        data.source = unwrappedElement.data;
        data.attr = 'object/@data';
        
        if (!data.source) {
            var objectParam;
            objectParam = $("param[name='movie']", $(unwrappedElement)).first()[0];
            data.attr = "object/param[name='movie']/@value";
            if (!objectParam) {
                objectParam = $("param[name='src']", $(unwrappedElement)).first()[0];
                data.attr = "object/param[name='src']/@value";
            }

            if (objectParam) {
                data.source = objectParam.value;
            }
            else {
                var objectEmbed = $("embed", $(unwrappedElement))[0];
                if (objectEmbed) {
                    data.source = objectEmbed.src;
                    data.attr = "object/embed[src]/@value";
                }
                else {
                    data.source = 'unknown';
                    data.attr = 'object/unknown';
                }
            }
        }
    }
    return data;
}

////////////////////////////////// RECORDING //////////////////////////////////

/** Record dimensions of image in viewport. */
function recordVisibilityInfo(element, data, isVisible) {
	if (!recordVisibility) return;
	var timestamp = (new Date()).getTime();
	var source = data.source;

	var vpDocOffsetTop = $(window).scrollTop();
	var vpDocOffsetBottom = vpDocOffsetTop + $(window).height();
	var vpDocOffsetLeft = $(window).scrollLeft();
	var vpDocOffsetRight = vpDocOffsetLeft + $(window).width();
	
	// Position of element within document.
	var offset = $(element).offset();
	var dLeft = offset.left;
	var dRight = dLeft + $(element).width();
	var dTop = offset.top;
	var dBottom = dTop + $(element).height();
	
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

/** Record mouse movement in/out of element. */
function recordInteractionInfo(element, data, isOver) {
	if (!recordInteractions) return;
	
    var type = isOver ? 'mouse_enter' : 'mouse_leave';
	
    record(type, data.source);
}

/** Record whether element is in viewport at all or not (binary). */
function recordImpressionInfo(element, data, isVisible) {
	if (!recordImpressions) return;
	
	var type = isVisible ? 'viewport_enter' : 'viewport_leave';
	
    record(type, data.source);
}

function record(type, source) {
	var timestamp = (new Date()).getTime();
    var event = {
		type: type,
		timestamp: timestamp,
		source: source
	};
    
    trackEvent(event);
  
    console.log(JSON.stringify(event));
}

function trackEvent(event) {
	eventQueue.push(event);
	if (!sendTimeout) setTimeout(sendEvents, sendDelay);
}

/** Sends queue of events to API. */
function sendEvents() {/*
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
	});*/
}
