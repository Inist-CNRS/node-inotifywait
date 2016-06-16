# node-inotifywait

[![Build Status](https://travis-ci.org/Inist-CNRS/node-inotifywait.svg?branch=master)](https://travis-ci.org/Inist-CNRS/node-inotifywait)

Yet another nodejs fs.watch implementation that can watch:

* folders recursively
* big number of directories and files
* with low CPU use

This implementation is a wrapper above the inotifywait system command.

### Why

Because other implementations:
* [fs.watch](http://nodejs.org/api/fs.html) 
* [node-watch](https://github.com/yuanchuan/node-watch)
* [chokidar](https://github.com/paulmillr/chokidar)
* [watch](https://github.com/mikeal/watch)

Are not performant for huge number of directories and files watching. Some are not recursive, other have high CPU usage when watching lot of directories and files. 

### Installation

```bash
npm install inotifywait
```

Prerequisit is to have the `inotifywait` command in the current PATH. On debian/ubuntu, you have to `sudo apt-get install inotify-tools`

### Events

* add (p1 = filename, stats): received when a file or directory is added
* change (p1 = filename, stats): received when a file is modified
* unlink (p1 = filename, stats): received when a file or directory is deleted
* unknown (p1 = filename, p2 = full raw event object, stats): received when unknown action is done on a file or directory

* ready (p1 = unix process object): received when inotifywait is ready to watch files or directories
* close (no parameter): received when inotifywait exited
* error (p1 = error object): received when an error occures

`stats` has two properties, `isDir` a Boolean to specify if the event was on a file or a directory and `date` a Date object that
holds the date of the occured event.


### Example

```js
var INotifyWait = require('inotifywait');

var watch1 = new INotifyWait('/tmp/', { recursive: false });
watch1.on('ready', function (filename) {
  console.log('watcher is watching');
});
watch1.on('add', function (filename) {
  console.log(filename + ' added');
  watch1.close(); // stop watching
});

var watch2 = new INotifyWait('/var/log/', { recursive: true });
watch2.on('change', function (filename) {
  console.log(filename + ' changed');
  watch2.close(); // stop watching
});

var watch3 = new Inotifywait("/my/dir", {
            recursive: true, // recurse sub folders
            excludes: ["\./\.git(.*)"], // exclusion regex patterns
            files: [".gitignore"], // explicit file paths to ignore
            events: ["create", "move", "delete"], // events to listen to
            spawnArgs: {stdio: "inherit"}, // spawn args controlling bin spawning
            bin: "/home/me/bin/inotifywait" // bin path
        });
watch3.on('change', function (filename) {
  console.log(filename + ' changed');
  watch3.close(); // stop watching
});


``` 



### Contributors

* [Stéphane Gully](https://github.com/kerphi)
* [Friedel Ziegelmayer](https://github.com/Dignifiedquire)
* [Stéphane Erard](https://github.com/stephaneerard)

