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
async function check_watch() {
  let redisClient = redis.createClient({
    port: '7000',
    host: '127.0.0.1'
  });
  let success_purchase = [];
  let fail_purchase = [];
  //区分购买成功者和购买失败者
  for (let i = 1; i <= 10; i++) {
    let uname = `u${i}`;
    let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
    if (funds == 999) {
      success_purchase.push(uname);
      continue;
    }
    if (funds != 1000) {
      return false;
    }
    fail_purchase.push(uname);
  }

  if (success_purchase.length != 1 || fail_purchase.length != 9) {
    return false;
  }

  //判断购买成功者背包是否增加商品item1
  for (let i = 0; i < success_purchase.length; i++) {
    let uname = success_purchase[i];
    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
    if (pack.length != 1) {
      return false;
    }
    if (pack[0] != 'item1') {
      return false;
    }
  }

  //判断购买失败者背包是否为空
  for (let i = 0; i < fail_purchase.length; i++) {
    let uname = fail_purchase[i];
    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
    if (pack.length != 0) {
      return false;
    }
  }

  //查看卖家的余额和背包
  let uname = `seller`;
  let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
  let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
  if (Number(funds) != 1 || pack.length != 99) {
    return false;
  }
  return true;
}

co(async function () {
  let rs = await check_watch();
  console.log(rs)
})