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
