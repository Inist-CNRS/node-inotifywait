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
  it('should tell when it is ready', function (done) {
    var w = new INotifyWait(__dirname + '/data');
    w.on('ready', function () {
      w.close();
      done();
    });
  });

  it('should detect when a new file is added', function (done) {
    var f = '';
    setTimeout(function () {
      f = generateFakeFile('fake2');
    }, 10);
    var w = new INotifyWait(__dirname + '/data');
    w.on('add', function (filename) {
      expect(filename).to.eql(f);
      w.close();
      done();
    });
  });

  it('should detect when a file is modified', function (done) {
    setTimeout(function () {
      fs.writeFileSync(fakeFile, '...');
    }, 10);
    var w = new INotifyWait(__dirname + '/data');
    w.on('change', function (filename) {
      expect(filename).to.eql(fakeFile);
      w.close();
      done();
    });
  })

  it('should detect when a file is removed', function (done) {
    setTimeout(function () {
      remove.removeSync(fakeFile);
    }, 10);
    var w = new INotifyWait(__dirname + '/data');
    w.on('unlink', function (filename) {
      expect(filename).to.eql(fakeFile);
      w.close();
      done();
    });
  })

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