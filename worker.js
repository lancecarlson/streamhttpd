var Worker = {
  topic: 'all',
  puller: require('./redis').createClient(),
  publisher: require('./redis').createClient(),
  getQueueName: function(suffix) {
    var name = 'streamhttpd-queue-' + this.topic;
    if (suffix)
      name += suffix;
    return name;
  },
  getChannelName: function() {
    return 'streamhttpd-channel-' + this.topic;
  },
  work: function(cb) {
    this.puller.brpoplpush(this.getQueueName(), this.getQueueName('-pending'), 0, function(err, data) {
      var req = JSON.parse(data);
      var onRes = function(body) {
        var res = {id: req.id, body: body};
        this.publisher.publish(this.getChannelName(), JSON.stringify(res));
        this.puller.lrem(this.getQueueName('-pending'), 0, data, (function(err, n) {
          if (err)
            return cb(err);
          return this.work(cb);
        }).bind(this));
      }.bind(Worker);
      return cb(err, req, onRes)
    });
  }
};

module.exports = Worker;
