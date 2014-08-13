function block(node) {
    if (   (node.nodeName == 'LINK' && node.href == 'data:text/css,') // new style
        || (node.nodeName == 'STYLE' && node.innerText.match(/^\/\*This block of style rules is inserted by AdBlock/)) // old style
        ) {
        node.parentElement.removeChild(node);
        console.log('adblock blocked');
    }
 
}
document.addEventListener("DOMContentLoaded", function() {
    document.addEventListener('DOMNodeInserted', function(e) {
    // disable blocking styles inserted by AdBlock
    block(e.target);
    }, false);
     
}, false);
