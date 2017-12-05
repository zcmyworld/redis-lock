const redis = require('redis');
const co = require('co');
const Promise = require("bluebird");
const bluebird = require('bluebird');
const uuidv1 = require('uuid/v1');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//构建Redis连接
let redisClient = redis.createClient({
  host: '127.0.0.1'
});


const ACQUIRE_LOCK_OVER_TIME_IN_MILLISECOND = 5000;

async function acquire_lock() {
  //设置超时时间为5秒
  let ACQUIRE_LOCK_OVER_TIME = 5000;
  let LOCK_EXPIRE_TIME = 5000;
  let end = new Date().getTime() + ACQUIRE_LOCK_OVER_TIME;
  while (new Date().getTime() < end) {
    let isLock = await redisClient.setAsync('lock','true', 'nx', 'px', LOCK_EXPIRE_TIME);
    if (isLock == 'OK') {
      return true;
    }
  }
  return false;
}
async function release_lock(lock_id) {
  while (true) {
    await redisClient.watch('lock');
    let _lock_id = await redisClient.getAsync('lock');
    multi = redisClient.multi();
    if (lock_id == _lock_id) {
      await multi.del('lock');
      let rs = await multi.execAsync();
      if (!rs) continue;
      return true;
    }
  }
  return false;
}

/**
 * @params seller　销售者
 * @params buyer　购买者
 * @params item　商品
 */
async function purchase(seller, buyer, item) {
  let lociid = await acquire_lock();
  try {
    //获得商品价格
    let price = await redisClient.zscoreAsync(`pack:${seller}`, item);
    price = Number(price);
    //商品不存在于u1的背包
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

    console.log(`用户${buyer}购买${item}成功`);

    return true;

  } catch (e) {

  } finally {
    release_lock(lociid);
  }
}


co(async function() {
  // await getPurchaseInfo();
  // return;
  purchase('seller', 'u1', 'item1');
  purchase('seller', 'u2', 'item1');
  purchase('seller', 'u3', 'item1');
  purchase('seller', 'u4', 'item1');
  purchase('seller', 'u5', 'item1');
  purchase('seller', 'u6', 'item1');
  purchase('seller', 'u7', 'item1');
  purchase('seller', 'u8', 'item1');
  purchase('seller', 'u9', 'item1');
  purchase('seller', 'u10', 'item1');
})