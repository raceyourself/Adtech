import os
from cgi import parse_qs, escape
import json
import base64
import uuid
from pyvirtualdisplay import Display
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

def application(environ, start_response):
    query = environ.get('QUERY_STRING', '')
    if query == '':
        query = environ.get('PATH_INFO', '')[1:]
    query_string = base64.b64decode(query)
    parameters = parse_qs(query_string)

    if 'selector' not in parameters or 'parents' not in parameters:
        status = '400 Bad request'
        output = 'Bad request'
    else:
        # TODO: Cache and lookup computed_style in memcached. Check staleness using a HEAD If-Modified-Since

        status = '200 OK'
        # TODO: Store a whitelist of URLs in a configuration
        output = get_computed_style('http://www.bloomberg.com', base64.b64decode(parameters['selector'][0]), int(parameters['parents'][0])).encode("utf-8")

    # TODO: Also generate ad, link and analytics trackers in this call
    response_headers = [('Content-type', 'application/json; charset=utf-8'),
                        ('Content-Length', str(len(output)))]
    start_response(status, response_headers)

    return [output] 

def get_computed_style(url, selector, parents, width=1920, height=1200):
    # TODO: Keep a persistent queue of displays and browsers running (w/ heartbeats)w/ heartbeats)  )to reduce init time
    display = Display(visible=0, size=(width, height))
    display.start()

    chromedriver = "/opt/chromedriver/chromedriver"
    os.environ["webdriver.chrome.driver"] = chromedriver
    chrome_options = webdriver.chrome.options.Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-java")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--incognito")
    chrome_options.add_argument("--use-mock-keychain")
    chrome_options.add_argument("--disable-web-security") # Required for getMatchedCSSRules
    chrome_options.add_argument("user-data-dir=/opt/chromedriver/vanilla_profile_%s" % uuid.uuid4())
    chrome = webdriver.Chrome(chromedriver, chrome_options=chrome_options)
    try:
        chrome.set_window_size(width, height)
        chrome.maximize_window()
        chrome.get(url)

        try:
            WebDriverWait(chrome, 10).until(lambda d: d.execute_script('return document.readyState') == 'complete')
        except Exception, e:
            print "Timed out waiting for ready state: %s" % str(e)

        return chrome.execute_script("""
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
        """ % (parents, selector))
    finally:
        chrome.quit()
        display.stop()
