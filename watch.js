const redis = require('redis');
const co = require('co');
const Promise = require("bluebird");
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//构建Redis连接
// let rc = redis.createClient({
//   port: '7000',
//   host: '127.0.0.1'
// });

function sleep(sleepTime) {
  for (var start = +new Date; +new Date - start <= sleepTime;) { }
}

// test()
co(async function () {
  test();
  test();
  test();
  test();
  test();
  // test();
  // test();
  // test();
  // test();
})

async function test() {
  let redisClient = redis.createClient({
    port: '7000',
    host: '127.0.0.1'
  });
  try {
    //观察销售者的背包是否有变动
    let hei = await redisClient.watchAsync(`hello`);
    // sleep(3000)
    multi = redisClient.multi();
    multi.set(`hello`, '123');
    let rs = await multi.execAsync();
    console.log(rs);
  } catch (e) {
    console.log(e)
  }
}
// rc.on('ready', function () {
//   rc.set("inc", 0)
//   for (var i = 1; i <= 10; i++) {
//     rc.watch("inc")
//     rc.get("inc", function (err, data) {
//       var multi = rc.multi()
//       data++ // I do know I can use rc.incr(), this is just for example
//       multi.set("inc", data)
//       multi.exec(function (err, replies) {
//         console.log(replies)
//       })
//     })
//   }
// })