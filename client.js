const Promise = require('bluebird');
const co = require('co');
let request = require('request');
request = Promise.promisifyAll(request);


co(async function () {
  for (let i = 0; i < 100; i++) {
    passportRpc(i)
  }
})

async function passportRpc(data) {
  let postData = {
    listName: 'itgo',
    data: data
  }
  let ret = await request.postAsync('http://127.0.0.1:3003/set', {
    form: postData,
    headers: {
      token: 'm3vtku9s'
    }
  })

  let result = {};
  console.log(ret.body)

  // try {
  //   result = JSON.parse(ret.body);
  // } catch (e) {
  //   console.log(e)
  // }

  return result;

}