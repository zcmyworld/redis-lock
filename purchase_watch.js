const redis = require('redis');
const co = require('co');
const Promise = require("bluebird");
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
/**
 * @params seller　销售者
 * @params buyer　购买者
 * @params item　商品
 */
async function purchase(seller, buyer, item) {

  let end = new Date().getTime() + 100000000;
  let redisClient = redis.createClient({
    port: '7000',
    host: '127.0.0.1'
  });
  try {
    while (new Date().getTime() < end) {
      //观察销售者的背包是否有变动
      await redisClient.watchAsync(`pack:${seller}`);
      //观察购买者资金是否有变动
      await redisClient.watchAsync(`uinfo:${buyer}`);
      //获得商品价格
      let price = await redisClient.zscoreAsync(`pack:${seller}`, item);
      price = Number(price);
      //商品不存在于seller的背包
      if (!price) {
        console.log('商品已被买走')
        return false;
      }
      //获取购买者资产
      let funds = await redisClient.hgetAsync(`uinfo:${buyer}`, 'funds');
      funds = Number(funds);
      //购买者金额不足，交易失败
      if (funds < price) {
        console.log('购买者资金不足')
        return false;
      }
      multi = redisClient.multi();
      //购买者扣除资产
      multi.hincrby(`uinfo:${buyer}`, 'funds', -price);
      //销售者增加资产
      multi.hincrby(`uinfo:${seller}`, 'funds', price);
      //购买者背包增加商品
      multi.zadd(`pack:${buyer}`, price, item);
      //购买者背包移除商品
      multi.zrem(`pack:${seller}`, item);
      let rs = await multi.execAsync();
      if (!rs) {
        continue;
      }
      console.log(`用户${buyer}购买${item}成功`);
      return true;
    }
  } catch (e) {
    console.lo(e)
  } finally {
    redisClient.end(true);
  }
  console.log('购买超时')
  return false;
}

function RandomNumBoth(Min, Max) {
  var Range = Max - Min;
  var Rand = Math.random();
  var num = Min + Math.round(Rand * Range); //四舍五入
  return num;
}

co(async function () {
  let start = new Date().getTime();
  for (let i = 1; i <= 10; i++) {
    let buyer = `u${RandomNumBoth(2, 10)}`;
    purchase('seller', buyer, `item${i}`, start);
  }
})
