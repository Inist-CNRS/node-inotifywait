# node-inotifywait

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

Prerequisit is to have the ''inotifywait'' command in the current PATH. On debian/ubuntu, you have to ''sudo apt-get install inotify-tools''

### Example

```js
var inw = require('inotifywait');

var watch1 = inw.watch('/tmp/', { recursive: false });
watch1.on('add', function (filename) {
  console.log(filename + ' added');
  watch1.close(); // stop watching
});

var watch2 = inw.watch('/var/log/', { recursive: true });
watch2.on('change', function (filename) {
  console.log(filename + ' changed');
  watch2.close(); // stop watching
});
``` 
