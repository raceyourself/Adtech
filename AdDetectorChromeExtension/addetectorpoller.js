/*jshint node: true, devel: true, sub: true*/
'use strict';
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var redis = require('redis');
var util = require('util');

var config = {};
try {
  config = require('./config.js');
} catch(e) {
  if (e instanceof Error && e.code === 'MODULE_NOT_FOUND') console.log('No config.js. Using defaults');
  else throw e;
}

config.redis = config.redis || {};
var client = redis.createClient(config.redis.port || 6379,
                                config.redis.host || '127.0.0.01',
                                config.redis.options || {});

config.queues = config.queues || {};

function nextJob() {
  // TODO find URLs in keys of caress_advert_urls that don't have a value set. Download the URL and update the value with the path.
  /*
  client.blpop(config.queues.transcoder || 'transcoder_queue', 0, function(err, data) {
    var job = JSON.parse(data[1]);
    if (TRANSCODE_SCRIPT[job.preset]) {
      console.log('Transcoding ' + job.filename + ' to ' + job.preset + ' quality');
      var target = job.filename.substr(0, job.filename.length-('.mp4'.length))+'_'+job.preset+'.mp4';
      var child = child_process.execFile(
        TRANSCODE_SCRIPT[job.preset].filename, [job.filename, target, __dirname, config.videostore.url],
        {},
        function callback(error, stdout, stderr) {
          console.log('Transcoded ' + job.filename + ' to ' + job.preset + ' quality');
          if (error) {
            console.error(error);
            console.log(stdout);
            console.log(stderr);
            slack.send({channel: '#_uploads', username: 'transcoder.js', text: 'Error transcoding <' + config.videostore.url + job.filename + '|' + job.filename + '> to ' + job.preset + ' quality!'});
          } else {
            slack.send({channel: '#_uploads', username: 'transcoder.js', text: 'Transcoded <' + config.videostore.url + job.filename + '|' + job.filename + '> to <' + config.videostore.url + target + '|' + job.preset + '> quality'});
          }
          process.nextTick(nextJob);
        }
      );
    } else {
      console.error('Unknown job: ' + util.inspect(job));
    }
  });
  */
}
nextJob();
