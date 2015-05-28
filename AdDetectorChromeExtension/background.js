var KILL_SWITCH_URL = 'https://demo.haystackplatform.com/workspaces/demo/_kill_';
var KILL_SWITCH_POLL_INTERVAL = 10 * 60 * 1000; // every .5 minutes.

var respondent;

////////////// INITIAL SETUP //////////////

var firstRun = false;
if (!localStorage['first_launch']) {
  firstRun = true;
  localStorage['first_launch'] = '1';
  
  chrome.tabs.create({url: "options.html"});
}

////////////// COMMS WITH CONTENT SCRIPT //////////////

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'identify_adverts') {
    
    var frameDomain = sender.url ? parseUri(sender.url).hostname : '';
    
    var elType = ElementTypes.fromOnBeforeRequestType(request.frame);
    
    var payload = {};
    payload.respondent = respondent;
    payload.advertUrls = [];
    request.urls.forEach(function(url) {
      try {
        var blacklisted = _myfilters.blocking.matches(url, elType, frameDomain);

        if (blacklisted) {
          payload.advertUrls.push(url);
        }
      } catch (e) {
        console.log('Error checking blacklist for url=' + url + ' ; elType=' + elType + ' ; frameDomain=' + frameDomain + ': ' + e);
      }
    });
    
    sendResponse(payload);
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
