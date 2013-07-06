/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var fs           = require('fs');
var util         = require('util');
var spawn        = require('child_process').spawn;
var Lazy         = require('lazy');
var EventEmitter = require('events').EventEmitter;

module.exports.watch = function (wpath, options) {
  options = mixin({
    recursive: true,
    watchDirectory: false
  }, options);

  var ee = new EventEmitter();
  var currentEvents = {};

  // run inotifywait command in background
  var inwp = spawn('inotifywait', [
    (options.recursive ? '-r' : ''),
    '--format',
    '{ "type": "%e", "file": "%w%f" }',
    '-m',
    '-q',
    wpath 
  ]);
  
  // parse stdout of the inotifywatch command
  Lazy(inwp.stdout)
    .lines
    .map(String)
    .map(function (line) {
      try {
        return JSON.parse(line);
      } catch (err) {
        return { type: '', file: '' };
      }
    })
    .map(function (event) {
      event.type = event.type.split(',');
      return event;
    })
    .forEach(function (event) {
      //console.log(event);

      // skip directories ?
      var isDir = (event.type.indexOf('ISDIR') != -1);
      if (isDir && !options.watchDirectory) {
        return;
      }

      if (event.type.indexOf('CREATE') != -1) {
        currentEvents[event.file] = 'add';
      } else if (event.type.indexOf('MODIFY') != -1) {
        if (currentEvents[event.file] != 'add') {
          currentEvents[event.file] = 'change';
        }
      } else if (event.type.indexOf('DELETE') != -1) {
        ee.emit('unlink', event.file);
      } else if (event.type.indexOf('CLOSE') != -1) {
        if (currentEvents[event.file]) {
          ee.emit(currentEvents[event.file], event.file);
          delete currentEvents[event.file];
        } else {
          ee.emit('unknown', event.file);
        }
      }
    });

  inwp.stderr.on('data', function (data) {
    ee.emit('error', new Error(data.toString()));
  });

  /**
   * Function used to stop the watch
   */
  ee.close = function (cb) {
    inwp.on('close', function (err) {
      if (cb) {
        cb(code);
      }
    });
    inwp.kill();
  }

  return ee;
};

/**
 *  Mixing object properties. 
 */
var mixin = function() {
  var mix = {}; 
  [].forEach.call(arguments, function(arg) { 
    for (var name in arg) {
      if (arg.hasOwnProperty(name)) {
        mix[name] = arg[name];
      }
    }
  });
  return mix;
};
