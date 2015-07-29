// worker.js

var Worker = require('../worker');
Worker.work(function(err, req, res) {
  console.log('inside');
  res('hello world');
});
