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

var EVENTS_KEY           = config.queues.caress_advert_events           || 'caress_advert_events_test';
var PROCESSED_EVENTS_KEY = config.queues.caress_advert_events_processed || 'caress_advert_events_resource_fetched_test';

var FILENAME_UNSAFE_FILENAME_REGEX = /[^a-zA-Z0-9.-]/g;

var MAX_EVENTS_PER_POLL = 10;

var MAX_FILENAME_LENGTH = 100;

var REQUEST_TIMEOUT = 1000 * 60; // 90 seconds
  
var INSERT_GSHEET_ROW_TARGET = {
  protocol: 'https:',
  host: 'script.google.com',
  path: '/macros/s/AKfycbzMwgg2_0ZlUL3bOd3aNPx2SPAV7yt-39aTHLr4TyTqHYJkLak/exec'
}

function nextJob() {
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
  
  redisClient.hexists(URLS_RETRIEVED_KEY, source, function(error, exists) {
    if (exists) {
      console.error('Source already fetched: ' + source);
      
      process.nextTick(nextJob);
    }
    else {
      fetchResource(source);
    }
  });
  addEventInGoogleSheets(event);
}

function addEventInGoogleSheets(event) {
  var eventData = querystring.stringify(event);
  console.log('data:    ' + eventData);
  
  var requestOptions = {
    method: 'POST',
    protocol: INSERT_GSHEET_ROW_TARGET.protocol,
    host: INSERT_GSHEET_ROW_TARGET.host,
    port: INSERT_GSHEET_ROW_TARGET.port,
    path: INSERT_GSHEET_ROW_TARGET.path,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': eventData.length
    }
  };
  
  var request = https.request(requestOptions, function onResourceDownloaded(response) {
    console.log('Added to Google Sheets: ' + event.source);
  }).on('error', function(err) {
    console.error('Failed to add to Google Sheets: ' + event.source + ' - cause: ' + err);
  });
  request.write(eventData);
  request.end();
}

function fetchResource(source) {
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
    console.error('Protocol not http(s), so skipping: ' + parsedUrl.protocol);
    
    process.nextTick(nextJob);
    return;
  }
  
  prot.get(requestOptions, function onResourceDownloaded(response) {
    var contentType = response.headers['content-type'];
    console.log('Got response. Content-Type=' + contentType);

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

    var sanitisedUniquePath = path.join(RES_PATH, sanitisedUniqueFilename);

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
      fs.writeFile(sanitisedUniquePath, resourceBinary, 'binary', function(error) {
        if (error) {
          console.log('Unable to write resource to ' + sanitisedUniquePath + ': ' + error);
        }
        else {
          console.log('Wrote file ' + sanitisedUniquePath);

          redisClient.hsetnx(URLS_RETRIEVED_KEY, source, sanitisedUniquePath);
        }
        process.nextTick(nextJob);
      });
    });
  }).on('error', function(err) {
    console.log('Connection timed out. Moving on to the next.');
    
    process.nextTick(nextJob);
  });
}

nextJob();
