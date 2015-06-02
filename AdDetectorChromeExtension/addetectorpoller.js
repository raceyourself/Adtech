/*jshint node: true, devel: true, sub: true*/
'use strict';
var fs = require('fs');
var path = require('path');
var redis = require('redis');
var util = require('util');
var url = require('url');
var http = require('http');

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

var URLS_RETRIEVED_KEY = 'caress_advert_urls_retrieved';
var NEXT_EVENT_KEY = 'caress_next_event_seq';
var EVENTS_KEY = 'caress_advert_events';
var PROCESSED_EVENTS_KEY = 'caress_advert_events_processed';

var FILENAME_EXTENSION_REGEX = /(.*)\.([^a-zA-Z0-9])+$/;
var FILENAME_UNSAFE_FILENAME_REGEX = "[^a-zA-Z0-9.-]";

var MAX_EVENTS_PER_POLL = 10;

function nextJob() {
  redisClient.brpoplpush(EVENTS_KEY, PROCESSED_EVENTS_KEY, 0, function(error, event) {
  
  });
  
  redisClient.get(NEXT_EVENT_KEY, function(error, nextEventSeq) {
    if (error) {
      console.log('Failed to fetch caress_next_event_seq: ' + error);
      return;
    }
    redisClient.llen(EVENTS_KEY, function(error, availableEvents) {
      if (error) {
        console.log('Failed to count rows in caress_advert_events: ' + error);
        return;
      }
      var eventsRemaining = availableEvents - nextEventSeq;
      var toFetch = eventsRemaining > MAX_EVENTS_PER_POLL ? MAX_EVENTS_PER_POLL : eventsRemaining;
      var fetchEnd = lastEventSeq + toFetch;

      redisClient.lrange(caress_advert_events, nextEventSeq, fetchEnd, function(error, results) {
        if (error) {
          console.log('Failed to fetch rows from caress_advert_events: ' + error);
          return;
        }
        results.forEach(function(eventStr) {
          var event = JSON.parse(eventStr);
          var source = event.source;
          
          redisClient.hexists(URLS_RETRIEVED_KEY, source, function(error, exists) {
            if (exists) {
              console.log('Source already fetched: ' + source);
            }
            else {
              var parsedUrl = url.parse(source);
              var path = parsedUrl.path;
              
              var filenameExtnMatch = FILENAME_EXTENSION_REGEX.exec(path);
              
              var sanitisedUniqueFilename = new Date().getTime() + '_' + (filenameExtnMatch ?
                (filenameExtnMatch[1].replaceAll(FILENAME_UNSAFE_FILENAME_REGEX, '_') + '.' + filenameExtnMatch[2]) :
                path.replaceAll(FILENAME_UNSAFE_FILENAME_REGEX, '_'));
              
              var sanitisedUniquePath = path.join(RES_PATH, sanitisedUniqueFilename);
              
              var requestOptions = parsedUrl;
              requestOptions.method = 'GET';
              requestOptions.encoding = null;

              http.request(requestOptions, function(res) {
                res.setEncoding('binary'); // this

                var resourceBinary = '';
                res.on('error', function(err) {
                    console.log("Error during HTTP request");
                    console.log(err.message);
                });
                
                res.on('data', function(chunk) {
                    return resourceBinary += chunk;
                });
                res.on('end', function() {
                  fs.writeFile(sanitisedUniquePath, resourceBinary, 'binary', function(error) {
                    if (error) {
                      console.log('Unable to write resource to ' + sanitisedUniquePath + ': ' + error);
                      return;
                    }
                    redisClient.hsetnx(URLS_RETRIEVED_KEY, url, sanitisedUniquePath);
                    
                    process.nextTick(nextJob);
                  });
                });
              }
            }
          });
        });

        redisClient.set(NEXT_EVENT_KEY, fetchEnd + 1);
      });
    });
  });
}
nextJob();
