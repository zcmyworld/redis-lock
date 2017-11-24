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

//生成货物数量
const itemsNum = 100;
//生成购买者数量
const usersNum = 10;
async function init() {
  //初始化买家信息
  for (let i = 1; i <= usersNum; i++) {
    await redisClient.hmset(`uinfo:u${i}`, {
      name: `u${i}`,
      funds: 1000
    });
  }
  //初始化卖家信息
  await redisClient.hmset(`uinfo:u${i}`, {
    name: `seller`,
    funds: 0
  });
  let items = [];
  //初始化商品信息
  for (let i = 1; i <= itemsNum; i++) {
    items.push({
      name: `item${i}`,
      price: 1
    })
  }
  //初始化背包信息
  
  for (let i in items) {
    await redisClient.zaddAsync('pack:seller', items[i].price, items[i].name);
  }
}

co(async function () {
  await init();
  console.log('init success')
})
