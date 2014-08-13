import os
from cgi import parse_qs, escape
import json
import base64
import uuid
from pyvirtualdisplay import Display
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

def application(environ, start_response):
    parameters = parse_qs(environ.get('QUERY_STRING', ''))
    status = '200 OK'
    output = get_computed_style('http://www.bloomberg.com', base64.b64decode(parameters['selector'][0]), int(parameters['parents'][0])).encode("utf-8")

    response_headers = [('Content-type', 'application/json; charset=utf-8'),
                        ('Content-Length', str(len(output)))]
    start_response(status, response_headers)

    return [output] 

def get_computed_style(url, selector, parents):
    print "url: %s" % url
    print "selector: %s" % selector
    print "parents: %d" % parents

    display = Display(visible=0, size=(1920, 1200))
    display.start()

    chromedriver = "/opt/chromedriver/chromedriver"
    os.environ["webdriver.chrome.driver"] = chromedriver
    chrome_options = webdriver.chrome.options.Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-java")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--incognito")
    chrome_options.add_argument("--use-mock-keychain")
    chrome_options.add_argument("user-data-dir=/opt/chromedriver/vanilla_profile_%s" % uuid.uuid4())
    chrome = webdriver.Chrome(chromedriver, chrome_options=chrome_options)
    try:
        chrome.set_window_size(1920, 1200)
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
                if (sel[0] === '.') {
                    var pivot = sel.lastIndexOf('#');
                    sel = selector.substr(0, pivot);
                    index = ~~(selector.substr(pivot));
                }
                var el = document.querySelectorAll(sel)[index];
                for (var i=0; i<parents && el !== null; i++) {
                    var css = window.getComputedStyle(el);
                    var style = {};
                    for (var key in css) {
                        if (!isNaN(key)) continue;
                        if (key === 'cssText') continue;
                        if (key === 'length') continue;
                        if (key.indexOf('webkit') !== -1) continue;
                        if (css[key] !== '') style[key] = css[key];
                    }
                    a.push(style);
                    el = el.parentNode;
                }
                return JSON.stringify(a);
            } catch (e) {
                return "[]";
            }
        """ % (parents, selector))
    finally:
        chrome.quit()
        display.stop()
