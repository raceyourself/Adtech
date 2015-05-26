var _myfilters = new MyFilters();
_myfilters.init();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'identify_adverts') {
    
    var frameDomain;
    if (sender.url)
      frameDomain = parseUri(sender.url).hostname;
    
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
});