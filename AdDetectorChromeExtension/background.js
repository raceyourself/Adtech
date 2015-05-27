chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'identify_adverts') {
    
    var frameDomain = sender.url ? parseUri(sender.url).hostname : '';
    
    var elType = ElementTypes.fromOnBeforeRequestType(request.frame);
    
    var advertUrls = [];
    request.urls.forEach(function(url) {
      var blacklisted = _myfilters.blocking.matches(url, elType, frameDomain);
      
      if (blacklisted) {
        advertUrls.push(url);
      }
    });
    
    sendResponse(advertUrls);
  }
  else if (request.action === 'check_visibility') {
    // broadcast to all frames that they should check the visibility of tracked adverts.
    var payload = _.pick(request, ['action', 'topWindowWidth', 'topWindowHeight']);
    chrome.tabs.sendMessage(sender.tab.id, payload);
  }
});
