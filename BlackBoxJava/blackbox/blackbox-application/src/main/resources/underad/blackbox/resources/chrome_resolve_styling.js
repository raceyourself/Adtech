try {
    var a = [];
    var parents = %d;
    var selector = '%s';
    var sel = selector;
    var index = 0;
    // Custom 'n-th class result' selector
    if (sel[0] === '.') {
        var pivot = sel.lastIndexOf('#');
        sel = selector.substr(0, pivot);
        index = ~~(selector.substr(pivot));
    }
    var el = document.querySelectorAll(sel)[index];
    if (el === null) throw {name: 'Custom Exception', message: 'Could not find '+selector};
    for (var d=0; d<parents && el !== null; d++) {
        var rules = window.getMatchedCSSRules(el);
        if (rules === null) throw {name: 'Custom Exception', message: 'Could not find rules for '+selector + ' depth ' + d};
        var style = {};
        // Extract all CSS into a single inline style
        for (var i=0, il=rules.length; i<il; i++) {
            var css = rules[i].style;
            for (var j=0, jl=css.length; j<jl; j++) {
                var key = css[j];
                if (!isNaN(key)) continue;
                if (key === 'cssText') continue;
                if (key === 'length') continue;
                if (key.indexOf('webkit') !== -1) continue;
                // TODO: Correct CSS specificity order?
                if (css[key] !== '') style[key] = css[key];
            }
        }
        a.push(style);
        el = el.parentNode;
    }
    return JSON.stringify(a);
} catch (e) {
    throw e;
    return "[]";
}
