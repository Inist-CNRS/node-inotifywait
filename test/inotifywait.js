/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var expect      = require('chai').expect;
var INotifyWait = require('../index.js');
var uuid        = require('uuid');
var fs          = require('fs');
var mkdirp      = require('mkdirp');
var remove      = require('remove');

var fakeFile = '';
before(function(){
  fakeFile = generateFakeFile('fake1');
});

describe('inotifywait', function () {

  it('should tell when it is ready @1', function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('ready', function (p) {
      expect(p.pid, 'when inotifywait is ready, it should have a pid').to.be.numeric;
      w.close();
      done();
    });
  });

  it('should detect when a new file is added @2', function (done) {
    var f = '';
    var w = new INotifyWait(__dirname + '/data');
    w.on('add', function (name) {
      expect(name).to.eql(f);
      w.close();
      done();
    });
    w.on('ready', function () {
      f = generateFakeFile('fake2');
    });
  });

  it('should detect when a file is modified @3', function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('change', function (name) {
      expect(name).to.eql(fakeFile);
      w.close();
      done();
    });
    w.on('ready', function () {
      fs.writeFileSync(fakeFile, '...');
    });
  })

  it('should detect when a file is removed @4', function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('unlink', function (name) {
      expect(name).to.eql(fakeFile);
      w.close();
      done();
    });
    w.on('ready', function () {
      remove.removeSync(fakeFile);
    });
  })

  it('should detect when a folder is created @5', function (done) {
    var d = __dirname + '/data/lol';
    var w = new INotifyWait(__dirname + '/data', { watchDirectory: true });
    w.on('add', function (name) {
      expect(name).to.eql(d);
      w.close();
      done();
    });
    w.on('ready', function () {
      mkdirp.sync(d);
    });
  })

  it('should not detect when a folder is created if watchDirectory is false @6',
  function (done) {
    var d        = __dirname + '/data/lol2';
    var addEvent = false;

    var w = new INotifyWait(__dirname + '/data', { watchDirectory: false });
    w.on('add', function (name) {
      addEvent = true;
    });
    w.on('ready', function () {
      mkdirp.sync(d);
      // test the add event is not handled for directory creation
      setTimeout(function () {
        expect(addEvent).to.be.false; 
        w.close();
        done();
      }, 100);
    });
  })

  it('should detect a new file in a new folder if recursive is true @7',
  function (done) {
    var d        = __dirname + '/data/lol3';
    var f        = __dirname + '/data/lol3/newfile';

    var w = new INotifyWait(__dirname + '/data', { recursive: true });
    w.on('add', function (name) {
      //console.log(name);
      w.close();
      done();
    });
    w.on('ready', function () {
      mkdirp.sync(d);
      // wait few milliseconds before writing a file
      // so inotifywait can scan the new folder
      setTimeout(function () {
        fs.writeFileSync(f, '...');
      }, 0);
    });
  })  

  it('should detect a new file in nested new folders if recursive is true @8',
  function (done) {
    var d        = __dirname + '/data/lol4/lol5';
    var f        = __dirname + '/data/lol4/lol5/newfile';

    var w = new INotifyWait(__dirname + '/data', { recursive: true });
    w.on('add', function (name) {
      //console.log(name);
      w.close();
      done();
    });
    w.on('ready', function () {
      mkdirp.sync(d);
      // wait few milliseconds before writing a file
      // so inotifywait can scan the new folder
      setTimeout(function () {
        fs.writeFileSync(f, '...');
      }, 0);
    });
  });

  it('should receive a close event when inotifywait process is finished @9',
  function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('ready', function () {
      setTimeout(function () {
        w.close();
      }, 10);
    });
    w.on('close', function () {
	  done();
    });
  });

  it('should receive a close event when inotifywait process is killed @10',
  function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('ready', function (p) {
      setTimeout(function () {
        p.kill();
      }, 10);
    });
    w.on('close', function () {
	  done();
    });
  });  

});

after(function(){
  remove.removeSync(__dirname + '/data');
});

function generateFakeFile(name) {
  //var id = uuid.v4();
  var path = __dirname + '/data'; // + id[0] + '/' + id[1] + '/' + id[2];
  var file = path + '/' + name;

  mkdirp.sync(path);
  //console.log(path + ' created [' + i + ']');
  fs.writeFileSync(file, '.');
  //console.log(file + ' created [' + i + ']');
  return file;
}