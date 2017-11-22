const Koa = require('koa');
const app = new Koa();
const bodyParser = require('koa-bodyparser')
app.use(bodyParser());
const router = require('koa-router')({});
const redis = require('redis');
const Promise = require("bluebird");
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const uuidv1 = require('uuid/v1');

//构建Redis连接
let redisClient = redis.createClient({
  port: '7000',
  host: '127.0.0.1'
});

//批量插入的数据量
const INSERT_NUM = 10;

//Redis有序集合的名称
const REDIS_KEY = 'key';

app
  .use(router.routes())
  .use(router.allowedMethods());


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
  
}

router.post('/set', async function (ctx) {
  let data = ctx.request.body.data;

  let memberObj = {};
  memberObj.data = data;
  memberObj.ts = new Date().getTime();

  let lociid = await acquire_lock();

  let dataArr = await redisClient.zrangeAsync(REDIS_KEY, -1, -1, 'withscores');

  let newScore = 0;
  if (dataArr.length > 0) {
    newScore = Number(dataArr[1]) + 100;
  }

  let ssetMember = JSON.stringify(memberObj);

  let zaddRet = await redisClient.zaddAsync(REDIS_KEY, newScore, ssetMember);

  await redisClient.delAsync('lock');

  ctx.body = 'success';
})




app.listen(3003);



// co(async function () {
//   for (let i = 0; i < INSERT_NUM; i++) {
//     setTimeout(async function () {
//       console.log(111)
//       let len = await redisClient.zcardAsync(REDIS_KEY);
//       let score = len + 1;
//       let value = score;
//       await redisClient.zadd(REDIS_KEY, score, value);
//     }, 1000)
//   }

//   // redisClient.end(true);
// })