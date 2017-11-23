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

async function init() {
  let u1goodsnames = [{
    name: 'goodsa',
    price: 5
  }, {
      name: 'goodsb',
      price: 60
    }, {
      name: 'goodsc',
      price: 80
    }];

  //初始化用户信息
  for (let i = 1; i <= 10; i++) {
    await redisClient.hmset(`uinfo:u${i}`, {
      name: `u${i}`,
      funds: 100
    });
  }

  //u1为销售者
  //初始化背包信息
  let u1packkey = `pack:u1`;
  for (let i in u1goodsnames) {
    await redisClient.zaddAsync(u1packkey, u1goodsnames[i].price, u1goodsnames[i].name);
  }
}

co(async function () {
  await init();
  console.log('init success')
})
