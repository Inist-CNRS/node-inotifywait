/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var fs           = require('fs');
var util         = require('util');
var spawn        = require('child_process').spawn;
var Lazy         = require('lazy');
var EventEmitter = require('events').EventEmitter;
var path         = require("path");

// Constructor
var INotifyWait = function(wpath, options) {
  var self = this;

  self.wpath = wpath;

  self.options = mixin({
    bin: 'inotifywait',
    recursive: true,
    watchDirectory: false,
    excludes: [],
    files: [],
    events: [],
    spawnArgs: {}
  }, options);

  self.currentEvents = {};

  self.runProcess = function () {

    var args = [
      (self.options.recursive ? '-r' : ''),
      '--format',
      '{ "type": "%e", "file": "%w%f", "date": "%T" }',
      '--timefmt',
      '%s',
      '-m'
    ];

    // having --exclude
    if(self.options.excludes.length > 0) {
      self.options.excludes.forEach(function(item){
          args.push("--exclude");
          args.push(item);
      });
    }

    // having @
    if(self.options.files.length > 0) {
      self.options.files.forEach(function(item){
          args.push("@" + item);
      });
    }

    // having --event
    if(self.options.events.length > 0) {
      self.options.events.forEach(function (item) {
        args.push("--event");
        args.push(item);
      });
    }

    //add path
    args.push(wpath);


    // run inotifywait command in background
    self.inwp = spawn(self.options.bin, args, self.options.spawnArgs);
    self.inwp.on('close', function (err) {
      self.inwp = null;
      self.emit('close', err);
    });
    self.inwp.on('error', function (err) {
      self.emit('error', err);
    });

    // parse stdout of the inotifywatch command
    Lazy(self.inwp.stdout)
        .lines
        .map(String)
        .map(function (line) {
          try {
            return JSON.parse(line);
          } catch (err) {
            self.emit('error', new Error( err + ' -> ' + line));
            return { type: '', file: '' , date: new Date()};
          }
        })
        .map(function (event) {
          event.type = event.type.split(',');
          // Unix Epoch * 1000 = JavaScript Epoch
          event.date = new Date(event.date * 1000);
          return event;
        })
        .forEach(function (event) {

          // skip directories ?
          var isDir = (event.type.indexOf('ISDIR') != -1);
          if (isDir && !self.options.watchDirectory) {
            return;
          }

          var stats = {isDir: isDir, date: event.date};

          if (event.type.indexOf('CREATE') != -1) {
            self.currentEvents[event.file] = 'add';
            fs.lstat(event.file, function (err, lstats) {
              if (!err && !lstats.isDirectory() && (lstats.isSymbolicLink() || lstats.nlink > 1)) {
                // symlink and hard link does not receive any CLOSE event
                self.emit('add', event.file, stats);
                delete self.currentEvents[event.file];
              }
            });
          } else if (event.type.indexOf('MOVED_TO') != -1) {
            self.currentEvents[event.file] = 'move';
            fs.lstat(event.file, function (err, lstats) {
              if (!err && !lstats.isDirectory()) {
                // symlink and hard link does not receive any CLOSE event
                self.emit('move', event.file, stats);
                delete self.currentEvents[event.file];
              }
            });
          } else if (event.type.indexOf('MODIFY') != -1 || // to detect modifications on files
              event.type.indexOf('ATTRIB') != -1) { // to detect touch on hard link  
            if (self.currentEvents[event.file] != 'add') {
              self.currentEvents[event.file] = 'change';
            }
          } else if (event.type.indexOf('DELETE') != -1) {
            self.emit('unlink', event.file, stats);
          } else if (event.type.indexOf('CLOSE') != -1) {
            if (self.currentEvents[event.file]) {
              self.emit(self.currentEvents[event.file], event.file, stats);
              delete self.currentEvents[event.file];
            } else {
              self.emit('unknown', event.file, event, stats);
            }
          }
        });

    // parse stderr of the inotifywatch command
    Lazy(self.inwp.stderr)
        .lines
        .map(String)
        .forEach(function (line) {
          if (/^Watches established/.test(line)) {
            // tell when the watch is ready
            self.emit('ready', self.inwp);
          } else if (/^Setting up watches/.test(line)) {
            // ignore this message
          } else {
            self.emit('error', new Error(line));
          }
        });

    // Maybe it's not this module job to trap the SIGTERM event on the process
    // ======>
    // check if the nodejs process is killed
    // then kill inotifywait shell command
    // process.on('SIGTERM', function () {
    //   if (self.inwp) {
    //     self.inwp.kill();
    //   }
    // });

  };

  self.runProcess();
}

INotifyWait.prototype = Object.create(EventEmitter.prototype);

INotifyWait.prototype.close = function (cb) {
  // if already killed
  if (!this.inwp) {
    if (cb) {
      this.removeAllListeners(); // cleanup
      return cb(null);
    }
    return;
  }
  // if not already killed
  this.on('close', function (err) {
    this.removeAllListeners(); // cleanup
    if (cb) {
      return cb(err);
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
