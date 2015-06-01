/*jshint browser: true, devel: true, sub: true*/
/*global $,chrome,parseUri,ElementTypes,_myfilters*/

var KILL_SWITCH_URL = 'https://demo.haystackplatform.com/workspaces/demo/_kill_';
var KILL_SWITCH_POLL_INTERVAL = 10 * 60 * 1000; // every .5 minutes.

var EVENT_URL = "http://insight-staging.glassinsight.co.uk/advert_events";

var DEFAULT_SEND_DELAY = 1000; // milliseconds

var sendDelay = DEFAULT_SEND_DELAY;
var sendTimeout = false; // setTimeout reference

var eventQueue = [];

var respondent;

////////////// INITIAL SETUP //////////////

var firstRun = false;
if (!localStorage['first_launch']) {
  firstRun = true;
  localStorage['first_launch'] = '1';
  
  chrome.tabs.create({url: "options.html"});
}

////////////// COMMS WITH CONTENT SCRIPT //////////////

function identifyAdverts(frameUrl, urls, callbackData) {
  var frameDomain = frameUrl ? parseUri(frameUrl).hostname : '';

  var payload = {};
  payload.respondent = respondent;
  payload.advertUrls = [];
  payload.callbackData = callbackData || {};
  //console.log('WST:Checking ' + urls.length + ' urls against blacklist; frameDomain=' + frameDomain);
  urls.forEach(function(url) {
    try {
      var elType = ElementTypes.fromOnBeforeRequestType(url.tag.toLowerCase()) || ElementTypes.image;

      var blacklisted = _myfilters.blocking.matches(url.src, elType, frameDomain) || _myfilters.blocking.matches(url.src, ElementTypes.other, frameDomain) || onCustomBlacklist(url.src);

      if (blacklisted) {
        payload.advertUrls.push(url.src);
      }
      
      console.log((blacklisted ? 'Is blacklisted' : 'Not blacklisted') + ': ' + url.src);
      
    } catch (e) {
      console.log('WST:Error checking blacklist for url=' + url.src + ' ; elType=' + elType + ' ; frameDomain=' + frameDomain + ': ' + e);
    }
  });
  return payload;
}

function onCustomBlacklist(url) {
  // TODO reuse AdBlock code for this
  // For Facebook ads.
  return url.indexOf('//tpc.googlesyndication.com/simgad/') !== -1; //url.indexOf('safe_image.php') !== -1;
}

/** best if it's in background script because it's an HTTP request, and content scripts in pages served via HTTPS can't POST
 * via HTTP. Also allows for retries after page has been left. */
function sendEvents() {
  var payload = {
    events: eventQueue
  };
  eventQueue = [];
  
  $.ajax({
    type: 'POST',
    url:  EVENT_URL,
    data: JSON.stringify(payload),
    contentType: 'application/json',
    processData: false
  }).done(function() {
    console.log("WST:Sent " + payload.events.length + " events");    
    sendDelay = DEFAULT_SEND_DELAY;
    sendTimeout = false;
  }).fail(function(msg) {
    console.log("WST:Failed to send " + payload.events.length + " events: " + msg);    
    eventQueue.concat(payload.events);
    sendDelay *= 4;
    sendTimeout = setTimeout(sendEvents, sendDelay);
  });
}

function trackEvent(event) {
  eventQueue.push(event);
  if (!sendTimeout) {
    sendTimeout = setTimeout(sendEvents, sendDelay);
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'identify_adverts') {
    sendResponse(identifyAdverts(sender.url, request.urls, request.callbackData));
  }
  else if (request.action === 'track_event') {
    trackEvent(request.event);
  }
});

function performChecks() {
  chrome.storage.sync.get('respondent', function(items) {
    respondent = items.respondent;
  });
  
  ////////////// KILL SWITCH //////////////
  
  $.get(KILL_SWITCH_URL, function success(data) {
    console.log('Kill switch on.');
    chrome.management.uninstallSelf(); // will not prompt user.
  }).fail(function() {
    //console.log('Kill switch off.');
  });
}

performChecks();
setInterval(performChecks, KILL_SWITCH_POLL_INTERVAL);

chrome.runtime.onUpdateAvailable.addListener(function() {
  chrome.runtime.reload(); // force refresh of this extension when available
});