if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        return this.indexOf(str) == 0;
    };
}
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str) {
    	return this.indexOf(str, this.length - str.length) !== -1;
    };
}

try {
    var blockedAbsXpath = arguments[0];
    var advertRelXpath = arguments[1];
    var widthWithUnit = arguments[2];
    var heightWithUnit = arguments[3];
    
    var out = getInlineStyle(blockedAbsXpath, advertRelXpath, widthWithUnit, heightWithUnit);
    console.log("Got inline style. Out=" + out);
    return out;
} catch (e) {
	console.log("Failed to get inline style. Error=" + e);
//    throw e;
    var comment = document.createComment('Failed to get inline style. Error=' + e);
    return comment;
}

// returns blockedAbsElement : WebElement - element found at blockedAbsXpath, but with flattened CSS style info.
function getInlineStyle(blockedAbsXpath, advertRelXpath, widthWithUnit, heightWithUnit) {
    var blockedElemResult = document.evaluate(blockedAbsXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var blockedElem = blockedElemResult.singleNodeValue;
    
    var advertAbsXpath = blockedAbsXpath;
    if (!blockedAbsXpath.endsWith('/'))
        advertAbsXpath = advertAbsXpath + '/';
    if (advertRelXpath.startsWith('/'))
    	advertRelXpath = advertRelXpath.substring(1);
    advertAbsXpath = advertAbsXpath + advertRelXpath;
    console.log("advertAbsXpath="+advertAbsXpath);
    
    var advertElemResult = document.evaluate(advertAbsXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    var advertElem = advertElemResult.singleNodeValue;
    console.log("blockedElem="+blockedElem+";advertElem="+advertElem);
    
    // Go through every element between blockedAbsXpath (inclusive) and advertAbsXpath (inclusive).
    // Retrieve associated CSS styling and inline it so it can be returned as a flat HTML.
    var advertXpathElems = getNodes('/' + advertRelXpath);
    
    console.log("advertXpathElems="+advertXpathElems);
    var currentElem = blockedElem;
    for (var i = 0; i <= advertXpathElems.length; i++) {
    	console.log("["+i+"] currentElem="+currentElem);
    	var style = getStyle(currentElem);
        console.log("["+i+"] style for "+currentElem+" is "+style);
    	
        currentElem.removeAttribute('style');
        for (var key in style) {
        	currentElem.style.setProperty(key, style[key]);
        	console.log("["+i+"] property set");
        }
        
        console.log("currentElem="+currentElem+";advertElem="+advertElem);
        if (currentElem == advertElem) {
        	console.log("At advert element. Adding Yoshi.");
        	// TODO Advert injected later (all this is to be executed 'offline', prior to the browser requesting the page).
            // Should use /adbrain
            currentElem.style.width = widthWithUnit;
        	currentElem.style.height = heightWithUnit;
        	currentElem.style.backgroundImage = "url('http://img3.wikia.nocookie.net/__cb20130809134512/mario/fr/images/7/75/Yoshi-gymnasticd-yoshi-31522962-900-1203.png')";
        	currentElem.style.cursor = 'pointer';
        	currentElem.addEventListener('click', function() {
              window.location = 'http://en.wikipedia.org/wiki/Yoshi';
            });
        }
        else {
            var advertPathElem = advertXpathElems[i];
            console.log("["+i+"] pre xpath lookup. advertPathElem="+advertPathElem+";currentElem="+currentElem);
            var currentElemResult = document
            	.evaluate(advertPathElem, currentElem, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            currentElem = currentElemResult.singleNodeValue;
            console.log("["+i+"] post xpath lookup. advertPathElem="+advertPathElem+";currentElem="+currentElem);
        }
    }
    return blockedElem;
}

// Can't just split xpath by '/' as some assholes put '/' inside predicates.
function getNodes(xpath) {// element_name_____   predicate__
	var xpathNodeRegex = /\/([a-z][a-z0-9_\-]*(?:\[[^\]]+\])?)/g;
    var nodes = [];
    var match = xpathNodeRegex.exec(xpath);
    console.log((match == null ? "Didn't find" : "Found") + " first node in xpath=" + xpath + " with regex=" + xpathNodeRegex);
    while (match != null) {
    	console.log("match[1]=" + match[1]);
    	nodes.push(match[1]);
    	console.log("updated xpath nodes=" + nodes);
    	match = xpathNodeRegex.exec(xpath);
    	console.log((match == null ? "Didn't find" : "Found") + " another node in xpath=" + xpath + " with regex=" + xpathNodeRegex);
    }
    console.log("xpath nodes=" + nodes);
    return nodes;
}

function getStyle(elem) {
    var rules = window.getMatchedCSSRules(elem);
    var style = {};
    if (rules === null)    	
//        throw {name: 'Custom Exception', message: 'Could not find rules for ' + elem};
    	return style; // sadly if zero styles are matched, getMatchedCSSRules returns null, not an empty list. 
    
    // Extract all CSS into a single inline style
    for (var i = 0, il = rules.length; i < il; i++) {
        var css = rules[i].style;
        for (var j = 0, jl = css.length; j < jl; j++) {
            var key = css[j];
            if (isApplicable(key) && css[key] !== '')
                style[key] = css[key];
        }
    }
    return style;
}

function isApplicable(key) {
    if (!isNaN(key))
        return false;
    if (key === 'cssText')
        return false; // TODO break cssText into a Map<K,V>
    if (key === 'length')
        return false;
    if (key.indexOf('webkit') !== -1) // ignore expermental properties. TODO why?
        return false;
	    // TODO: Correct CSS specificity order?
	return true;
}
