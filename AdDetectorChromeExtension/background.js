////////////// INITIAL SETUP //////////////

var firstRun = false;
if (!localStorage['ran_before']) {
  firstRun = true;
  localStorage['ran_before'] = '1';
}

////////////// COMMS WITH CONTENT SCRIPT //////////////

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'identify_adverts') {
    
    var frameDomain = sender.url ? parseUri(sender.url).hostname : '';
    
    var elType = ElementTypes.fromOnBeforeRequestType(request.frame);
    
    var advertUrls = [];
    request.urls.forEach(function(url) {
      try {
        var blacklisted = _myfilters.blocking.matches(url, elType, frameDomain);

        if (blacklisted) {
          advertUrls.push(url);
        }
      } catch (e) {
        console.log('Error checking blacklist for url=' + url + ' ; elType=' + elType + ' ; frameDomain=' + frameDomain + ': ' + e);
      }
    });
    
    sendResponse(advertUrls);
  }
});

////////////// KILL SWITCH //////////////

var KILL_SWITCH_URL = 'https://demo.haystackplatform.com/workspaces/demo/_kill_';
var KILL_SWITCH_POLL_INTERVAL = 10 * 60 * 1000; // every .5 minutes.

/** Check a URL to determine whether the extension should be uninstalled. */
setInterval(function checkKillSwitch() {
  $.get(KILL_SWITCH_URL, function success(data) {
    console.log('Kill switch on.');
    chrome.management.uninstallSelf(); // will not prompt user.
  }).fail(function() {
    //console.log('Kill switch off.');
  });
}, KILL_SWITCH_POLL_INTERVAL);
