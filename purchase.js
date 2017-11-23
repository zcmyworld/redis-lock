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

/**
 * @params seller　销售者
 * @params buyer　购买者
 * @params item　商品
 */
async function purchase(seller, buyer, item) {
  //获得商品价格
  let price = await redisClient.zscoreAsync(`pack:${seller}`, item);

  price = Number(price);
  //商品不存在于u1的背包
  if (!price) {
    return false;
  }

  //获取购买者资产
  let funds = await redisClient.hgetAsync(`uinfo:${buyer}`, 'funds');
  funds = Number(funds);

  //购买者金额不足，交易失败
  if (funds < price) {
    return false;
  }

  //购买者扣除资产
  await redisClient.hincrbyAsync(`uinfo:${buyer}`, 'funds', -price);

  //销售者增加资产
  await redisClient.hincrbyAsync(`uinfo:${seller}`, 'funds', price);

  //购买者背包增加商品
  await redisClient.zaddAsync(`pack:${buyer}`, price, item);

  //购买者背包移除商品
  await redisClient.zrem(`pack:${seller}`, item);

  return true;

}

co(async function () {
  purchase('u1', 'u2', 'goodsa');
  purchase('u1', 'u3', 'goodsa');
  purchase('u1', 'u4', 'goodsa');
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
