var redis;

var createClient = function() {
  if (process.env.REDISCLOUD_URL) {
    var rtg = require('url').parse(process.env.REDISCLOUD_URL);
    redis = require('redis').createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(':')[1]);
  } else {
    console.log('connecting to local redis')
    redis = require('redis').createClient();
  }
  return redis;
}

module.exports.createClient = createClient;
