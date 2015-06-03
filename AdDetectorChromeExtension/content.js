/*jshint browser: true, devel: true, sub: true*/
/*global $,jQuery,_,Set,Map,chrome*/

var RESOURCE_TAGS_UNWRAPPED = [
  'IMG',
  'IMAGE',
  'VIDEO',
  'OBJECT'
];
var version = chrome.runtime.getManifest().version;

var pageProcessed = false;

var recordVisibility = false;
var recordImpressions = true;
var recordInteractions = true;

// Images currently at least partially visible on-screen. Set<image>
var visibleResources = new Set();

var advertsInPage = $();

var resourcesInPage = new Map();
var mutations = {};
var mutationId = 0;

var documentUrl;

/** Very useful for debugging to uniquely identify a frame. */
var frameId;

var respondent;

var INJECTION_PROBABILITY = 0.1;
var MAX_INJECTIONS = 1; // per page

var INJECTABLE_ADS = [{
  min_width: 120,
  min_height: 450,
  width: 160,
  height: 600,
  ar_flex: 0.2,
  tag: 'img',
  src: 'images/160x600.png',
  url: 'http://www.houseofcaress.com/',
  location: /^((?!facebook.com).)*$/i,
  title: 'Forever Collection',
  description: "The world's first body wash with fragrance touch technology"
}, {
  min_width: 225,
  min_height: 188,
  width: 300,
  height: 250,
  ar_flex: 0.2,
  tag: 'img',
  src: 'images/300x250.png',
  url: 'http://www.houseofcaress.com/',
  location: /^((?!facebook.com).)*$/i,
  title: 'Forever Collection',
  description: "The world's first body wash with fragrance touch technology"
}, {
  min_width: 546,
  min_height: 68,
  width: 728,
  height: 90,
  ar_flex: 0.2,
  tag: 'img',
  src: 'images/728x90.png',
  url: 'http://www.houseofcaress.com/',
  location: /^((?!facebook.com).)*$/i,
  title: 'Forever Collection',
  description: "The world's first body wash with fragrance touch technology"
}, {
  min_width: 728,
  min_height: 188,
  width: 970,
  height: 250,
  ar_flex: 0.2,
  tag: 'img',
  src: 'images/970x250.png',
  url: 'http://www.houseofcaress.com/',
  location: /^((?!facebook.com).)*$/i,
  title: 'Forever Collection',
  description: "The world's first body wash with fragrance touch technology"
}];

var randomOffset = ~~(Math.random()*INJECTABLE_ADS.length);
var hijacks = 0; // TODO: Per-tab hijacks count

function inIframe() {
  try {
    var isTop = window.self === window.top;
    return !isTop;
  } catch (e) {
    return true;
  }
}

/**
* Extract urls from all potential ad elements
*
* Side-effect: resourcesInPage is updated with potential ad elements
*
* @param context Optional context element for jquery selector
* @param mutationId Optional mutation id for storing selected elements
*/
function extractUrls(context, mutationId) {
  var urls = [];
  var resources = new Map();
  // intentionally local scope! just for sending to background.js
  var unwrappedResourcesInPage = $();
  RESOURCE_TAGS_UNWRAPPED.forEach(function (tag) {
    unwrappedResourcesInPage = unwrappedResourcesInPage.add(tag.toLowerCase(), context);
  });
  unwrappedResourcesInPage.each(function(index, tagInstance) {    
    if (tagInstance.tagName === 'IMG' && tagInstance.naturalHeight === 1) return; // Ignore tracking pixels
    
    var data = elementToDataObj(tagInstance);
    
    if (data.source && data.source.indexOf('data:') !== 0) {
      urls.push({
        tag: tagInstance.tagName,
        src: data.source
      });
      resourcesInPage.set(tagInstance, data.source);
      resources.set(tagInstance, data.source);
    }
  });
  
  if (_.isNumber(mutationId)) mutations[mutationId] = resources;
  
  return urls;
}

function processPage() {
  console.log('WST:Processing ' + (inIframe() ? 'frame: ' + document.URL : "main page"));
  documentUrl = document.URL;
  
  var payload = {
    action: "identify_adverts",
    source: 'pageload',
    frame: inIframe() ? "sub_frame" : "main_frame",
    urls: extractUrls()
  };
  chrome.runtime.sendMessage(payload, onAdvertsAndRespondentIdentified);
}

function processMutation(addedNodes) {  
  var id = mutationId++;
  //console.log('WST:Processing ' + addedNodes.length + ' mutations (#' + id + ') on ' + document.URL);
  
  var payload = {
    action: "identify_adverts",
    source: 'mutation',
    callbackData: {
      mutationId: id
    },
    frame: inIframe() ? "sub_frame" : "main_frame",
    urls: []
  };
  
  for (var i = 0; i < addedNodes.length; ++i) {
    payload.urls.concat(extractUrls(addedNodes[i], id));
  }
  
  if (payload.urls.length > 0) chrome.runtime.sendMessage(payload, onAdvertsAndRespondentIdentified);
  //else console.log('WST:Processed ' + addedNodes.length + ' adless mutations (#' + id + ') on ' + document.URL);
}

/**
* Callback for ad filtering in background script
*
* Called on load and when mutations occur.
*/
function onAdvertsAndRespondentIdentified(response) {
  var advertUrls = response.advertUrls;
  var data = response.callbackData || {};
  respondent = response.respondent;
  frameId = response.frameId;
  var resources = resourcesInPage;
  if (data.mutationId) {
    resources = mutations[data.mutationId] || [];
    delete mutations[data.mutationId];
  }
  
  var toAdd = [];
  resources.forEach(function (url, tagInstance) {
    if (_.contains(advertUrls, url)) {
      toAdd.push(tagInstance);
      console.log('WST:Advert URL=' + url + ' found for elem', tagInstance);
    }
  });
  //if (data.mutationId) console.log('WST:Processed mutation #' + data.mutationId + ' on ' + document.URL);
  //else console.log('WST:Processed pageload on ' + document.URL);
  
  // Track mouse movement in/out of adverts and inject ads if configured  
  toAdd.forEach(function(advert) {
    var jAdvert = $(advert);
    if (advert.tagName === 'OBJECT') { // flash-specific hacks.
      
      // attach mouse listeners to parent. wrapping new div around the object crashes Flash in Chrome.
      jAdvert = jAdvert.parent();
      if (_.contains(['DIV', 'SPAN', 'BODY'], jAdvert[0].tagName)) {
        // put wrapping element in front of child
        jAdvert.css({
          'z-index': 99999,
          'position': 'relative'
        });
      }
      // click listener not fired on Flash.
      jAdvert.mousedown(function(event) {
        if (event.which !== 1) return;
        var data = elementToDataObj(advert);
        recordClickInfo(advert, data, event);
      });
    }
    else {
      var hijacked = false;
      var width = jAdvert.width(), height = jAdvert.height();
      var random = Math.random();
      if (random <= INJECTION_PROBABILITY && hijacks < MAX_INJECTIONS && height !== 0) {
        var ar = width/height;
        var subset = _.filter(INJECTABLE_ADS, function(ad) {
          if ('location' in ad && !window.self.location.href.match(ad.location)) { // TODO: Bypass window.top.location.href CORS 
            return false; 
          }
          var _ar = ad.width/ad.height;
          return advert.tagName.toLowerCase() === ad.tag.toLowerCase() && 
                  Math.abs(ar-_ar) < (ad.ar_flex || 0.05) && 
                  width >= (ad.min_width || 0) && height >= (ad.min_height || 0);
        });
        if (subset.length > 0) {
          // Hijack ad
          var ad = subset[(randomOffset+hijacks)%subset.length];
          advert.src = chrome.extension.getURL(ad.src);
          jAdvert.mousedown(function(event) {
            if (event.which !== 1) return;
            window.open(ad.url, '_blank');
            event.stopPropagation();
            event.preventDefault();
          });
          // Custom Facebook rewrite
          if ('location' in ad && 'www.facebook.com'.match(ad.location)) {
            var emu = jAdvert.closest('.fbEmuImage');
            if (emu.length !== 0) {
              var parent = emu.parent().parent();
              parent.find('div').contents().filter(function() { return this.nodeType == Node.TEXT_NODE; }).remove();
              var caption = parent.find('[title]');
              caption.attr('title', ad.title || ad.url);
              caption.find('strong').text(ad.title || ad.url);
              parent.find('span').text(ad.description || '');
              var anchor = parent.parent();
              var url = ad.url;
              if (url.indexOf('?') === -1) url = url + '?fbhack';
              anchor.attr('href', url);
              anchor.removeAttr('onmousedown');
              anchor.mousedown(function() {
                if (event.which !== 1) return;
                window.open(ad.url, '_blank');
                event.stopPropagation();
                event.preventDefault();
              });
            }
          }
          advert.style['max-width'] = width;
          advert.style['max-height'] = height;
          hijacked = true;
          hijacks++;
        }
      }
      jAdvert.click(function(event) {
        var data = elementToDataObj(advert);
        recordClickInfo(advert, data, event);
        if (hijacked) {
          event.stopPropagation();
          event.preventDefault();
        }
      });
    }
    
    jAdvert.mouseleave(function(event) {
      // NOTE: This does not fire until the mouse moves, if we need perfect accuracy
      //     we would need to do our own visibility tracking.
      var data = elementToDataObj(advert);
      recordInteractionInfo(advert, data, false, event);
    });
    jAdvert.mouseenter(function(event) {
      var data = elementToDataObj(advert);
      recordInteractionInfo(advert, data, true, event);
    });
  });
  
  console.log('AIP.onidentify: length=' + advertsInPage.length + ' before adding ' + toAdd.length + '; frameId=' + frameId);
  advertsInPage = advertsInPage.add(toAdd);
  console.log('AIP.onidentify: length=' + advertsInPage.length + ' after adding ' + toAdd.length + '; frameId=' + frameId);
  
  if (!pageProcessed) {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(function(mutations, observer) {
        // fired when a mutation occurs
        var i, node, wrapper;
        mutations.forEach(function(mutation) {
          var addedNodes = mutation.addedNodes;
          if (addedNodes.length > 0) {
            // Process mutation after any subscripts have had a chance to load
            setTimeout(processMutation.bind(null, addedNodes), 5000);
          }
          var removedNodes = mutation.removedNodes;
          for (i = 0; i < removedNodes.length; ++i) {
            node = removedNodes[i];
            if (_.contains(RESOURCE_TAGS_UNWRAPPED, node.nodeName)) {
              console.log('AIP.mutate: length=' + advertsInPage.length + ' before removing an elem; frameId=' + frameId);
              advertsInPage = advertsInPage.not(node);
              console.log('AIP.mutate: length=' + advertsInPage.length + ' after removing an elem; frameId=' + frameId);
            }
          }
        });
    });
    // define what element should be observed by the observer and what types of mutations trigger the callback
    observer.observe(document, {
      subtree: true,  
      childList: true
    });  
  
    /*(function() {
        // Check visibility change when browser window has moved
        // TODO add args to recordVisibilityChanges() call
        var windowX = window.screenX;
        var windowY = window.screenY;
        setInterval(function() {
          if (windowX !== window.screenX || windowY !== window.screenY) {
            recordVisibilityChanges();
          }
          windowX = window.screenX;
          windowY = window.screenY;
        }, 1000);
    }());*/
  }
    
  pageProcessed = true;
}

if (inIframe()) {
  $(document).ready(function() {
    setTimeout(processPage, 5000);
  });
  //$(document).load();
}
else { // main frame
  $(document).ready(processPage);

  // TODO consider cases where child frames are scrollable
  $(window).on('DOMContentLoaded load resize scroll', function() {
    if (pageProcessed)
      notifyFramesToCheckVisibilityChangesFromTop();
  });
  
  $(window).unload(function() {
    clearVisible();
  });
}

/** Possibly ugly way of communicating a resize/scroll event to frames within the page: bounce it off background.js. */
function notifyFramesToCheckVisibilityChangesFromTop() {
  var payload = {
    action: 'check_visibility',
    topWindow: {
      width: $(window).width(),
      height: $(window).height()
    }
  };
  notifyFramesToCheckVisibilityChanges(payload);
}

function notifyFramesToCheckVisibilityChanges(payload) {
  var iframes = $('iframe');
  iframes.each(function(index, iframe) {
    var rect = iframe.getBoundingClientRect();
    var iframePayload = {
      action: payload.action,
      topWindow: payload.topWindow,
      frame: {
        top:    rect.top,
        bottom: rect.bottom,
        left:   rect.left,
        right:  rect.right
      }
    };
    if (payload.frame) {
      iframePayload.frame.top += payload.frame.top;
      iframePayload.frame.bottom += payload.frame.bottom;
      iframePayload.frame.left += payload.frame.left;
      iframePayload.frame.right += payload.frame.right;
    }
    
    iframe.contentWindow.postMessage(iframePayload, '*');
  });
}

window.addEventListener('message', function(event) {
  var request = event.data;
  
  if (request.action === 'check_visibility') {
    recordVisibilityChanges(request.topWindow, request.frame);
    
    notifyFramesToCheckVisibilityChanges(request);
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

function recordVisibilityChanges(topWindow, frame) {
  //console.log("WST:recordVisibilityChanges - document.URL=" + document.URL + (!inIframe() ? " (top)" : " (frame)"));
  console.log('recordVisibilityChanges for frameId=' + frameId);
  advertsInPage.each(function(index, image) {
    var data = elementToDataObj(image);
    //console.log('WST:Checking visibility of ' + data.source);
    
    if (visibleResources.has(image)) {
      if (checkVisible(image, topWindow, frame)) { // image still in viewport
        recordVisibilityInfo(image, data, true);
      }
      else { // image has left viewport
        recordVisibilityInfo(image, data, false);        
        recordImpressionInfo(image, data, false);
        
        visibleResources.delete(image);
      }
    }
    else { // not previously visible.
      if (checkVisible(image, topWindow, frame)) { // has image entered viewport?
        recordVisibilityInfo(image, data, true);
        recordImpressionInfo(image, data, true);
        
        visibleResources.add(image);
      }
    }
  });
}

// Determines whether an element is within the browser viewport.
function checkVisible(el, topWindow, frame) {
  if (typeof jQuery === "function" && el instanceof jQuery) {
      el = el[0];
  }

  var rect = el.getBoundingClientRect();
  var rectJ = {
    top:    rect.top,
    bottom: rect.bottom,
    left:   rect.left,
    right:  rect.right,
    height: rect.height,
    width:  rect.width
  };
  
  var rectInViewport = {
    top:    rect.top    + frame.top,
    bottom: rect.bottom + frame.top,
    left:   rect.left   + frame.left,
    right:  rect.right  + frame.left
  };
  
  var topVisible    = rectInViewport.top    >= 0 && rectInViewport.top    <= topWindow.height;
  var bottomVisible = rectInViewport.bottom >= 0 && rectInViewport.bottom <= topWindow.height;
  var leftVisible   = rectInViewport.left   >= 0 && rectInViewport.left   <= topWindow.width;
  var rightVisible  = rectInViewport.right  >= 0 && rectInViewport.right  <= topWindow.width;
  
  var visible = (topVisible || bottomVisible) && (leftVisible || rightVisible);

  //console.log('WST:checkVisible() for doc=' + document.URL + ' ;visible=' + visible + ';rectJ=' + JSON.stringify(rectJ) + ';frame=' + JSON.stringify(frame) + ';rectInViewport=' + JSON.stringify(rectInViewport) + ';el=' + el.outerHTML);
  
  if (frame.top === 0 && frame.bottom === 0 && frame.left === 0 && frame.right === 0) {
    // values all go to zero when it's off screen.
    // possibly due to a bug, the values are ALSO zero when right at the top of the page. so some underreporting of adverts.
    return false;
  }
  
  return visible;
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
  else if (element.nodeName === 'OBJECT') { // flash
    var unwrappedElement = element;
    
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
    visible: isVisible,
    respondent: respondent,
    version: version
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
function recordInteractionInfo(element, data, isOver, event) {
  if (!recordInteractions) return;
  
  var type = isOver ? 'mouse_enter' : 'mouse_leave';
  
  record(type, data, event);
}

/** Record whether element is in viewport at all or not (binary). */
function recordImpressionInfo(element, data, isVisible) {
  if (!recordImpressions) return;
  
  var type = isVisible ? 'viewport_enter' : 'viewport_leave';
  
  record(type, data, {});
}

function recordClickInfo(element, data, event) {
  record("click", data, event);
}

function record(type, data, event) {
  var timestamp = moment().format();
  var trackedEvent = {
    type: type,
    timestamp: timestamp,
    source: data.source,
    attribute: data.attr,
    respondent: respondent,
    version: version,
    // take these with pinch of salt. if in iframe, is relative to that.
    xCoord: event.clientX,
    yCoord: event.clientY
  };
  
  trackEvent(trackedEvent);
}

function trackEvent(event) {
  console.log('WST:Advert event: ' + JSON.stringify(event));
  
  var payload = {
    action: 'track_event',
    event: event
  };
  chrome.runtime.sendMessage(payload);
}
