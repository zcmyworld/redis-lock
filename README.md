# 利用Redis事务实现乐观锁解决并发交易问题

摘要：常见的交易逻辑中，并发地处理相同的数据（购买相同的商品）时，不谨慎的操作很容易导致数据错误。这里介绍如何利用Redis事务实现乐观锁来防止数据出错。

## 生成实验数据

数据结构：

用户信息存储在一个散列，散列各个键值分别记录用户名和用户资金，以 uinfo: + 用户名作为关键字。用户背包存储在一个有序集合，有序集合score代表商品价格，以pack: + 用户名作为关键字：

<img src='https://github.com/zcmyworld/bcms/blob/master/static/1189FBBE-7203-4838-A6F5-EFE0B98F416D.png'>

 初始化生成100个商品，商品名称分别是 item1,item2,item3 ... item100，售价为1
 
 初始化生成10个买家，用户名分别是 u1,u2,u3 .. u10，初始资金为1000
 
 初始化生成1个卖家，用户名为seller，初始资金为0


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
		  await redisClient.hmset(`uinfo:seller`, {
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
		    await redisClient.zaddAsync('pack:seller', 
		    items[i].price, items[i].name);
		  }
	    }


## 检测函数

检测函数用于查询所有用户当前资金和背包情况

	async function getPurchaseInfo() {
	  let redisClient = redis.createClient({
	    port: '7000',
	    host: '127.0.0.1'
	  });
	  //查看买家的余额和背包
	  for (let i = 1; i <= 10; i++) {
	    let uname = `u${i}`;
	    console.log(`用户名: ${uname}`);
	    let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
	    console.log('资金：' + funds);
	    let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
	    console.log(pack);
	  }
	  //查看卖家的余额和背包
	  let uname = `seller`;
	  console.log(`用户名: ${uname}`);
	  let funds = await redisClient.hgetAsync(`uinfo:${uname}`, 'funds');
	  console.log('资金：' + funds);
	  let pack = await redisClient.zrangeAsync(`pack:${uname}`, 0, -1);
	  console.log(pack.length);
	}

## 购买流程

 * 获取卖家中商品的价格
 * 判断商品是否已经被出售
 * 获取买家的资金
 * 判断买家的资金是否足以购买商品
 * 扣除买家的资金
 * 增加买家的资金
 * 买家的背包增加商品
 * 移除卖家背包中该项商品
 
## 失败的实现方式

### 实现代码

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


### 模拟并发购买商品

Node.js模拟函数并发调非常简单（Node.js是单线程的，利用其异步非阻塞的特性，能基本达到模拟的要求）。

10个用户同时购买商品item1:


	co(async function () {
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

调用上面提到的检测函数得到以下结果：

<img src='https://github.com/zcmyworld/bcms/blob/master/static/2C8E659F4D592452036D062A44D81B2E.jpg'

从结果可知，所有买家的背包都获得了商品item1，显然这个购买流程是有问题的。

## 使用乐观锁完善购买流程

### 实现原理

Redis 提供 multi, discard, exec, watch,unwatch 命令来实现事务。watch命令用于在事务（multi）开始之前监听任意数量key，当执行exec命令时，如果被watch的key被其他客户端修改，那么这次事务会执行失败，exec命令返回nil，设A和B两个客户端分别执行以下命令，

|时间|客户端A|客户端B|
|-----|-----|-----|
|T1|watch hello||
|T2|multi||
|T3|set hello world||
|T4||set hello othworld|
|T5|exec||

如图，exec命令将返回nil，事务执行失败。

（注：watch监听任意数量key，如果key被当前客户端修改，将不会阻止程序执行，即如果多个进程共用一个Redis连接，那么他们修改同一数据时，watch不会生效。）

利用watch的特性，对卖家的背包和买家的资金进行监视，在购买流程执行过程中，如果卖家的背包发生变动（商品被买走，商品被卖家丢弃等情况）或者买家资金发生变动（买家同时在进行其他交易等情况），事务都不会执行成功，此时程序将进行重试，其中最大重试次数为5秒，这样做能避免同一时间多个事务执行成功而导致错误发生，实现代码如下：

	async function purchase(seller, buyer, item) {
	  let end = new Date().getTime() + 5000;
	  let redisClient = redis.createClient();
	  try {
	    while (new Date().getTime() < end) {
	      //观察销售者的背包是否有变动,观察购买者资金是否有变动
	      await redisClient.watchAsync(`pack:${seller}`);
	      await redisClient.watchAsync(`uinfo:${buyer}`);
	      let price = await redisClient.zscoreAsync(`pack:${seller}`, item);
	      price = Number(price);
	      if (!price) {
	        return false;//商品不存在于seller的背包
	      }
	      //获取购买者资产
	      let funds = await redisClient.hgetAsync(`uinfo:${buyer}`, 'funds');
	      funds = Number(funds);
	      if (funds < price) return false;//购买者金额不足，交易失败
	      multi = redisClient.multi();
	      //购买者扣除资产,销售者增加资,购买者背包增加商品,购买者背包移除商品
	      multi.hincrby(`uinfo:${buyer}`, 'funds', -price);
	      multi.hincrby(`uinfo:${seller}`, 'funds', price);
	      multi.zadd(`pack:${buyer}`, price, item);
	      multi.zrem(`pack:${seller}`, item);
	      let rs = await multi.execAsync();
	      if (!rs) continue;
	      return true;//购买成功
	    }
	  } catch (e) {
	  } finally {
	    redisClient.end(true);
	  }
	  return false;//购买超时
	}

为了保证watch生效，每次购买都建立了新的Redis连接。如while循环所示，watch对卖家的背包和买家的资金进行监听，如果卖家背包或者买家资金被改变，Redis执行exec命令会获得返回值null，继而进行重试，直到购买完毕或者超时。

## 断言函数

肉眼观察Redis结果并不合适，于是编写断言函数来提高准确度和断言效率，断言标准如下：

* 卖家只卖出了item1，背包数量为99，资金变化为1
* 只有其中一个用户资金变化为999，其他用户依然是1000
* 发生资金变化的用户背包将增加商品1，其他用户背包依然为空

代码篇幅过长，点击[这里](https://github.com/zcmyworld/redis-lock/blob/master/check_wacth.js)查看源码。

## Github地址

[https://github.com/zcmyworld/redis-lock](https://github.com/zcmyworld/redis-lock)

运行方式

npm install

初始化：  node init.js

没有加任何锁的购买方式： node purchase.js

使用乐观锁的购买方式： node purchase_watch.js

查看用户和背包信息: node get_pack_info.js

断言函数： node check_watch.js