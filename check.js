
const redis = require('redis');
const co = require('co');
const Promise = require("bluebird");
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//构建Redis连接
let redisClient = redis.createClient({
  port: '7000',
  host: '127.0.0.1'
});


co(async function () {
  let rs = await redisClient.zrangeAsync('key', 0, -1, 'withscores');
  let scoresArr = [];
  for (let i = 0; i < rs.length; i++) {
    if (i % 2 != 0) {
      scoresArr.push(rs[i]);
    }
  }
  for (let i = 0; i < scoresArr.length - 1; i++) {
    if (parseInt(scoresArr[i]) + 100 != parseInt(scoresArr[i + 1])) {
      console.log('test error');
      return;
    }
  }
  console.log('########');
  console.log('test success');
})
