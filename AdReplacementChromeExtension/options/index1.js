var page = "options/general.html";
var folder = (SAFARI ? "catblock/" : "");
document.getElementById("iframe").src = chrome.extension.getURL(folder + page);
