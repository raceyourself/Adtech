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
var NEXT_EVENT_KEY       = config.queues.caress_next_event_seq          || 'caress_next_event_seq';
//var EVENTS_KEY           = config.queues.caress_advert_events           || 'caress_advert_events';
var EVENTS_KEY           = config.queues.caress_advert_events_copy           || 'caress_advert_events';
var PROCESSED_EVENTS_KEY = config.queues.caress_advert_events_processed || 'caress_advert_events_processed';

var FILENAME_UNSAFE_FILENAME_REGEX = /[^a-zA-Z0-9.-]/g;

var MAX_EVENTS_PER_POLL = 10;

var MAX_FILENAME_LENGTH = 100;

function nextJob() {
  redisClient.brpoplpush(EVENTS_KEY, PROCESSED_EVENTS_KEY, 0, function(error, event) {
  //redisClient.brpop(EVENTS_KEY, 0, function(error, event) {event = event[1];
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
      console.log('Source already fetched: ' + source);
      
      process.nextTick(nextJob);
    }
    else {
      fetchResource(source);
    }
  });
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
  
  var prot = parsedUrl.protocol === 'https:' ? https : http;
  
  prot.get(requestOptions, function onResourceDownloaded(response) {
    var contentType = response.headers['content-type'];
    console.log('Got response. Content-Type=' + contentType);
    
    // TODO in an ideal world, we'd check for an existing correct extension before adding on a new one.
    if (urlPath.length > MAX_FILENAME_LENGTH)
      urlPath.substring(0, MAX_FILENAME_LENGTH);
    var sanitisedUniqueFilename = new Date().getTime() + '_' + urlPath.replace(FILENAME_UNSAFE_FILENAME_REGEX, '_') + '.' + mime.extension(contentType);

    var sanitisedUniquePath = path.join(RES_PATH, sanitisedUniqueFilename);

    response.setEncoding('binary'); // this

    var resourceBinary = '';
    response.on('error', function(err) {
      console.log("Error during HTTP request");
      console.log(err.message);
    });

    response.on('data', function(chunk) {
        return resourceBinary += chunk;
    });
    response.on('end', function() {
      fs.writeFile(sanitisedUniquePath, resourceBinary, 'binary', function(error) {
        if (error) {
          console.log('Unable to write resource to ' + sanitisedUniquePath + ': ' + error);
          return;
        }
        console.log('Wrote file ' + sanitisedUniquePath);
        
        redisClient.hsetnx(URLS_RETRIEVED_KEY, source, sanitisedUniquePath);

        process.nextTick(nextJob);
      });
    });
  });
}

nextJob();
