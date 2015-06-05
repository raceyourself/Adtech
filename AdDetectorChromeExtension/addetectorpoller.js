/*jshint node: true, devel: true, sub: true*/
'use strict';
var fs = require('fs');
var path = require('path');
var redis = require('redis');
var util = require('util');
var url = require('url');
var http = require('http');
var https = require('https');
var mime = require('mime-types');
var querystring = require('querystring');
var request = require('request');

var config = {};
try {
  config = require('./config.js');
} catch(e) {
  if (e instanceof Error && e.code === 'MODULE_NOT_FOUND') console.log('No config.js. Using defaults');
  else throw e;
}

config.redis = config.redis || {};
var redisClient = redis.createClient(config.redis.port || 6379,
                                config.redis.host || '127.0.0.01',
                                config.redis.options || {});

config.queues = config.queues || {};

var RES_PATH = './ad_resources/';

var URLS_RETRIEVED_KEY   = config.queues.caress_advert_urls_retrieved   || 'caress_advert_urls_retrieved';
//var EVENTS_KEY           = config.queues.caress_advert_events           || 'caress_advert_events';
//var PROCESSED_EVENTS_KEY = config.queues.caress_advert_events_processed || 'caress_advert_events_resource_fetched';

var EVENTS_KEY           = config.queues.caress_advert_events           || 'caress_advert_events_test_2';
var PROCESSED_EVENTS_KEY = config.queues.caress_advert_events_processed || 'caress_advert_events_processed_test';

var FILENAME_UNSAFE_FILENAME_REGEX = /[^a-zA-Z0-9.-]/g;

var MAX_EVENTS_PER_POLL = 10;

var MAX_FILENAME_LENGTH = 100;

var REQUEST_TIMEOUT = 1000 * 60; // 90 seconds
  
var INSERT_GSHEET_ROW_TARGET = {
  protocol: 'https:',
  host: 'script.google.com',
  path: '/macros/s/AKfycbzDBhztjGQOxmoaihPW77QcXoBap8PmNUm70ApZxP6JQ_-L6BuL/exec'
};

function nextJob() {
  console.log('nextJob');
  redisClient.brpoplpush(EVENTS_KEY, PROCESSED_EVENTS_KEY, 0, function(error, event) {
    if (error) {
      console.log('Failed to pop element from ' + EVENTS_KEY + 'and move to ' + PROCESSED_EVENTS_KEY);
      return;
    }
    processEvent(event);
  });
}

function processEvent(eventStr) {
  var event = JSON.parse(eventStr);
  var source = event.source;
  
  redisClient.hget(URLS_RETRIEVED_KEY, source, function(error, value) {
    if (value) {
      event.path = value;
      keepCalmAndEatACupcake(event, false, 'Source already fetched: ' + source);
    }
    else {
      fetchResource(event);
    }
  });
}

function fetchResource(event) {
  var source = event.source;
  var parsedUrl = url.parse(source);
  var urlPath = parsedUrl.path;

  var requestOptions = {};
  requestOptions.host = parsedUrl.host;
  requestOptions.port = parsedUrl.port;
  requestOptions.path = parsedUrl.path;
  if (parsedUrl.search) {
    requestOptions.path += parsedUrl.search;
  }
  
  console.log('Sending request: ' + JSON.stringify(requestOptions));
  
  var prot;
  if (parsedUrl.protocol === 'https:') {
    prot = https;
  }
  else if (parsedUrl.protocol === 'http:') {
    prot = http;
  }
  else if (parsedUrl.protocol === 'chrome-extension:') {
    // Injected image from extension.
    redisClient.hsetnx(URLS_RETRIEVED_KEY, source, urlPath);
    
    process.nextTick(nextJob);
    return;
  }
  else {
    keepCalmAndEatACupcake(event, true, 'Protocol not http(s), so skipping: ' + parsedUrl.protocol);
    return;
  }
  
  prot.get(requestOptions, function onResourceDownloaded(response) {
    var contentType = response.headers['content-type'];
    console.log('Got response. Content-Type=' + contentType);

    addPath(event, contentType);
    
    response.setEncoding('binary'); // this

    var resourceBinary = '';
    response.on('error', function(err) {
      console.log("Error during HTTP request");
      console.log(err.message);

      process.nextTick(nextJob);
    });

    response.on('data', function(chunk) {
        return resourceBinary += chunk;
    });
    response.on('end', function() {
      fs.writeFile(event.path, resourceBinary, 'binary', function(error) {
        if (error) {
          console.error('Unable to write resource to ' + event.path + ': ' + error);
        }
        else {
          console.log('Wrote file ' + event.path);

          redisClient.hsetnx(URLS_RETRIEVED_KEY, source, event.path);
        }
        addEventInGoogleSheets(event);
      });
    });
  }).on('error', function(err) {
    keepCalmAndEatACupcake(event, true, 'Connection timed out. Moving on to the next.');
  });
}

function keepCalmAndEatACupcake(event, err, msg) {
  if (err)
    console.error(msg);
  else
    console.log(msg);
  addEventInGoogleSheets(event);
}

function addPath(event, contentType) {
  var source = event.source;
  var parsedUrl = url.parse(source);
  var urlPath = parsedUrl.path;
  
  // TODO in an ideal world, we'd check for an existing correct extension before adding on a new one.
  if (urlPath.length > MAX_FILENAME_LENGTH) {
    urlPath = urlPath.substring(0, MAX_FILENAME_LENGTH);
  }
  var extension = mime.extension(contentType);
  if (extension) {
    extension = '.' + extension;
  }
  else {
    console.log('Unrecognised content type: ' + contentType);
    extension = '';
  }
  var sanitisedUniqueFilename = new Date().getTime() + '_' + urlPath.replace(FILENAME_UNSAFE_FILENAME_REGEX, '_') + extension;

  event.path = path.join(RES_PATH, sanitisedUniqueFilename);
}

var googleSheetsEventQueue = [];

function addEventInGoogleSheets(event) {
  var eventData = querystring.stringify(event);
  console.log('data:    ' + eventData);
  
  var requestOptions = {
    url: 'https://script.google.com/macros/s/AKfycbzDBhztjGQOxmoaihPW77QcXoBap8PmNUm70ApZxP6JQ_-L6BuL/exec',
    form: event
  };

  console.log('Requesting add to Google Sheets via request: ' + eventData);
  request.post(requestOptions, function(err, httpResponse, body) {
    if (err) {
      console.error('Failed to add to Google Sheets: ' + eventData + ' - cause: ' + err);
    }
    else {
      console.log('Added to Google Sheets: ' + eventData);// + '; httpResponse=' + JSON.stringify(httpResponse) + '; body=' + body);
    }
    process.nextTick(nextJob);
  });
}

nextJob();
