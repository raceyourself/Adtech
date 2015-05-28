/*jshint node: true, devel: true, sub: true*/
'use strict';
var express = require('express');
//var path = require('path');
var util = require("util"); 
//var fs = require("fs-extra");
//var multer  = require('multer'); // Multer is a node.js middleware for handling multipart/form-data
var bodyParser = require('body-parser');
var moment = require('moment');
//var passport = require('passport'); // Passport is authentication middleware for Node.js. Extremely flexible and modular, Passport can be unobtrusively dropped in to any Express-based web application. A comprehensive set of strategies support authentication using a username and password, Facebook, Twitter, and more.
//var BearerStrategy = require('passport-http-bearer').Strategy;
var redis = require("redis");
//var crypto = require('crypto');
var _ = require('lodash');
var http = require('http');
var https = require('https');
var HttpsAgent = require('agentkeepalive').HttpsAgent; // The Node.js's missing keep alive http.Agent. Support http and https.

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
redisClient.on('error', function(err) {
  console.error('Redis error:' + err);
});

var keepaliveAgent = new HttpsAgent({
    maxSockets: 5,
    maxKeepAliveRequests: 0, // no limit on max requests per keepalive socket
    maxKeepAliveTime: 30000 // keepalive for 30 seconds
});

var app = express();
app.set('trust proxy', 'loopback');

// Allow CORS for localhost dev
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin || '*');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Content-Length,Last-Modified,Authorization,Origin,Accept");
  res.header("Access-Control-Allow-Methods", 'GET,HEAD,PUT,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') res.status(204).send();
  else next();
});

app.use(bodyParser.json());

app.post('/log_advert_urls', function(request, response) {
  var multi = redisClient.multi();
  
  request.body.events.forEach(function (event) {
    multi.lpush("caress_advert_events", JSON.stringify(event));
  });
  
  var urls = _.uniq(_.map(request.body.events, function(event) {return event.source}));
  
  urls.forEach(function (url) {
    multi.hsetnx("caress_advert_urls", url, '');
  });
  
  multi.exec(function(error, results) {
    if (error) {
      response.status(500).send('Cannot add URLs to set caress_adverts in Redis: ' + error);
    }
    else {
      response.status(200).send('Logged ' + results.length + ' URLs');
    }
  });
  
});

config.app = config.app || {};
var server = app.listen(config.app.port || 3001, function() {
    console.log('Listening on port %d', server.address().port);
});
