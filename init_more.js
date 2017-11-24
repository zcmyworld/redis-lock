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


//初始化商品数量
const INIT_GOODS_NUM = 10000;
//初始化用户数量
const INIT_USERS_NUM = 10;

async function init() {
  let u1goodsnames = [];
  for (let i = 1; i <= INIT_GOODS_NUM; i++) {
    u1goodsnames.push({
      name: `goods${i}`,
      price: 1
    })

  }


  //初始化用户信息
  for (let i = 1; i <= INIT_USERS_NUM; i++) {
    await redisClient.hmset(`uinfo:u${i}`, {
      name: `u${i}`,
      funds: 100000
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
