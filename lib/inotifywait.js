/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var fs           = require('fs');
var util         = require('util');
var spawn        = require('child_process').spawn;
var Lazy         = require('lazy');
var EventEmitter = require('events').EventEmitter;

// Constructor
var INotifyWait = function(wpath, options) {
  var self = this;

  self.wpath = wpath;

  self.options = mixin({
    recursive: true,
    watchDirectory: false
  }, options);

  self.currentEvents = {};

  self.runProcess = function () {

    // run inotifywait command in background
    self.inwp = spawn('inotifywait', [
      (self.options.recursive ? '-r' : ''),
      '--format',
      '{ "type": "%e", "file": "%w%f" }',
      '-m',
      '-q',
      wpath 
    ]);
    
    // parse stdout of the inotifywatch command
    Lazy(self.inwp.stdout)
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
        if (isDir && !self.options.watchDirectory) {
          return;
        }

        if (event.type.indexOf('CREATE') != -1) {
          self.currentEvents[event.file] = 'add';
        } else if (event.type.indexOf('MODIFY') != -1) {
          if (self.currentEvents[event.file] != 'add') {
            self.currentEvents[event.file] = 'change';
          }
        } else if (event.type.indexOf('DELETE') != -1) {
          self.emit('unlink', event.file);
        } else if (event.type.indexOf('CLOSE') != -1) {
          if (self.currentEvents[event.file]) {
            self.emit(self.currentEvents[event.file], event.file);
            delete self.currentEvents[event.file];
          } else {
            self.emit('unknown', event.file);
          }
        }
      });

    self.inwp.stderr.on('data', function (data) {
      self.emit('error', new Error(data.toString()));
    });

  };

  self.runProcess();
}

INotifyWait.prototype = Object.create(EventEmitter.prototype);

INotifyWait.prototype.close = function (cb) {
  this.inwp.on('close', function (err) {
    if (cb) {
      cb(code);
    }
  });
  this.inwp.kill();
};

module.exports = INotifyWait;

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
