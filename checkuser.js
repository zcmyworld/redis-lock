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
async function getPurchaseInfo() {
  let redisClient = redis.createClient({
    port: '7000',
    host: '127.0.0.1'
  });
  //查看买家的余额和背包
  for (let i = 1; i <= 10; i++) {
    let uname = `u${i}`;
    console.log(`用户名: ${uname}`);
    let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
    console.log('资金：' + funds);
    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
    console.log(pack);
  }
  //查看卖家的余额和背包
  let uname = `seller`;
  console.log(`用户名: ${uname}`);
  let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
  console.log('资金：' + funds);
  let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
  console.log(pack.length);
}

co(async function () {
  await getPurchaseInfo();
})