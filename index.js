var express = require('express'),
//    logger = require('morgan'),
    uuid = require('node-uuid'),
    pusher = require('./redis').createClient(),
    subscriber = require('./redis').createClient();


var app = express();
var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
})

//app.use(logger('combined'));

var StreamHTTPD = {
  config: {
    routes: [{
      "method": "all",
      "path": "*",
      "topic": "all"
    }],
    prefixes: {
      all: 'streamhttpd-',
      queue: 'queue-',
      channel: 'channel-'
    },
  },
  getQueueName: function(name) {
    return this.config.prefixes.all + this.config.prefixes.queue + name;
  },
  getChannelName: function(name) {
    return this.config.prefixes.all + this.config.prefixes.channel + name;
  },
  resQueue: {},
  Routes: {
    get: function(cb) {
      pusher.get(StreamHTTPD.config.prefixes + 'config', function(err, config) {
        if (!config) {
          console.log('routes config not found, using defaults');
          config = StreamHTTPD.config.routes;
        }
        return cb(err, config);
      });
    },
    onRoute: function(topic) {
      return function(req, res) {
        var qreq = StreamHTTPD.request(req);
        StreamHTTPD.resQueue[qreq.id] = res;
        pusher.lpush(StreamHTTPD.getQueueName(topic), JSON.stringify(qreq));
      };
    },
    create: function(route) {
      app[route.method](route.path, this.onRoute(route.topic));
      subscriber.subscribe(StreamHTTPD.getChannelName(route.topic)); // move this out?
    },
    setup: function() {
      this.get((function(err, config) {
        config.forEach(function(route, i) {
          this.create(route);
        }, this);
      }).bind(this));
    }
  },
  start: function() {
    this.Routes.setup();
    this.setupSubscriber();
  },
  setupSubscriber: function() {
    subscriber.on('message', function(channel, message) {
      var message = JSON.parse(message);
      var res = StreamHTTPD.resQueue[message.id];
      delete StreamHTTPD.resQueue[message.id];
      res.send(message.body);
    });
  },
  request: function(req) {
    return {
      id: uuid.v1(),
      headers: req.headers,
      method: req.method,
      domain: req.domain,
      protocol: req.protocol,
      query: req.query,
      url: req.url,
      http_version: req.httpVersion,
      params: req.params
    }
  }
};

StreamHTTPD.start();
