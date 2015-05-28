// Setup/method dependencies required to keep AdBlock 'filtering/*.js' code happy.
// Largely these are stubbed versions of definitions AdBlock has in its background.js.

function get_custom_filters_text() { // dummy method, just to avoid code changes to 'filtering/*.js'.
  return void 0;
}

function get_settings() { // defaults are fine for our purposes.
  return {};
}

// Called when Chrome blocking needs to clear the in-memory cache.
// No-op for Safari.
function handlerBehaviorChanged() {
  if (SAFARI)
    return;
  try {
    chrome.webRequest.handlerBehaviorChanged();
  } catch (ex) {
  }
}

var STATS = {
  version: '2.7.10'
};

var _myfilters = new MyFilters();
_myfilters.init();
