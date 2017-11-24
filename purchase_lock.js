const redis = require('redis');
const co = require('co');
const Promise = require("bluebird");
const bluebird = require('bluebird');
const uuidv1 = require('uuid/v1');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//构建Redis连接
let redisClient = redis.createClient({
  port: '7000',
  host: '127.0.0.1'
});


const ACQUIRE_LOCK_OVER_TIME_IN_MILLISECOND = 5000;

async function acquire_lock() {
  let lockid = uuidv1();
  let start_time = new Date().getTime();
  while (new Date().getTime() - start_time < ACQUIRE_LOCK_OVER_TIME_IN_MILLISECOND) {
    let isLock = await redisClient.setnxAsync('lock', lockid);
    if (isLock == 1) {
      return lockid;
    }
  }
}

async function release_lock() {
  await redisClient.delAsync('lock');
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
    release_lock();
  }
}

function sleep(sleepTime) {
  for (var start = +new Date; +new Date - start <= sleepTime;) { }
}


co(async function () {
  // await getPurchaseInfo();
  // return;
  purchase('u1', 'u2', 'goodsa');
  purchase('u1', 'u3', 'goodsb');
  purchase('u1', 'u4', 'goodsc');
  purchase('u1', 'u5', 'goodsa');
  purchase('u1', 'u6', 'goodsa');
  purchase('u1', 'u7', 'goodsa');
  purchase('u1', 'u8', 'goodsa');
  purchase('u1', 'u9', 'goodsa');
  purchase('u1', 'u10', 'goodsa');
})

async function getPurchaseInfo() {
  //查看每个人的余额和背包
  for (let i = 1; i <= 10; i++) {
    let uname = `u${i}`;
    console.log(`用户名: ${uname}`);
    let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
    console.log(funds);
    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
    console.log(pack);
  }
}
