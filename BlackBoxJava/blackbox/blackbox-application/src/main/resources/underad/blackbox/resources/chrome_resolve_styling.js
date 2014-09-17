try {
    var blockedAbsXpath = arguments[0];
    var advertRelXpath = arguments[1];
    
    return getInlineStyle(blockedAbsXpath, advertRelXpath);
} catch (e) {
//    throw e;
    var comment = document.createComment('Error: ' + e);
    return comment;
}

// returns blockedAbsElement : WebElement - element found at blockedAbsXpath, but with flattened CSS style info.
function getInlineStyle(blockedAbsXpath, advertRelXpath) {
    var blockedElem = document.evaluate(blockedAbsXpath, document, null, XPathResult.ANY_TYPE, null);
    var advertElem = document.evaluate(advertAbsXpath, document, null, XPathResult.ANY_TYPE, null);
    
    var advertAbsXpath = blockedAbsXpath;
    if (!endsWith(blockedAbsXpath, '/'))
        advertAbsXpath = advertAbsXpath + '/';
    advertAbsXpath = advertAbsXpath + advertRelXpath;
    
    // Go through every element between blockedAbsXpath (inclusive) and advertAbsXpath (inclusive).
    // Retrieve associated CSS styling and inline it so it can be returned as a flat HTML.
    var advertXpathElems = advertRelXpath.split('/');
    var currentElem = blockedElem;
    for (var i = 0; i < advertPathElems.length; i++) {
        var style = getStyle(currentElem);
        
        currentElem.removeAttribute('style');
        for (var key in style) { 
            node.style.setProperty(key, style[key]); 
        }
        
        if (currentElem == advertElem) {
            // Advert injected later (this function is done 'offline', prior to the browser requesting it)
        }
        else {
            var advertPathElem = advertPathElems[i];
            currentElem = document.evaluate(advertPathElem, currentElem, null, XPathResult.ANY_TYPE, null);
        }
    }
    
    return blockedElem;
}

function getStyle(elem) {
    var rules = window.getMatchedCSSRules(elem);
    if (rules === null)
        throw {name: 'Custom Exception', message: 'Could not find rules for ' + elem};
    var style = {};
    // Extract all CSS into a single inline style
    for (var i = 0, il = rules.length; i < il; i++) {
        var css = rules[i].style;
        for (var j = 0, jl = css.length; j < jl; j++) {
            var key = css[j];
            if (isApplicable(key))
                style[key] = css[key];
            if (css[key] !== '')
            	style[key] = css[key];
        }
    }
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
    return css[key] !== '';
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
