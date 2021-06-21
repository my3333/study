// 实现Promise， 参考来源 https://juejin.cn/post/6844903625769091079和https://promisesaplus.com/
class Promise {
  constructor(executor) {   // 构造函数；类的数据类型是函数，且类本身会指向构造函数；类的所有方法都定义在prototype属性上
    // 定义三个状态的改变和值
    this.status = 'pending';
    this.res = null;
    this.err = null;
    // 存放成功或失败数据的数组,目的是为了解决异步实现----不是很理解 todo
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    let resolve = (res) => {
      if (this.status === 'pending') {
        this.status = 'fulfilled';
        this.res = res;
        this.onFulfilledCallbacks.forEach(itemFn => itemFn());
      }
    };
    let reject = (err) => {
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.err = err;
        this.onRejectedCallbacks.forEach(itemFn => itemFn());
      }
    };
    // 如果executor执行失败就直接执行reject
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    };
  };
  /**
   * then方法
   * @param {*} onFulfilled 可选参数
   * @param {*} onRejected 可选参数
   * 1.onFulfilled, onRejected必须异步执行--setTimeout
   * 2.onFulfilled, onRejected为可选参数
   * 3.onFulfilled, onRejected如果不是函数，则直接返回
   * 4.返回一个promise
   */
  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled :  res => res;
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };

    let promise2 = new Promise((resolve, reject) => {
      if (this.status === 'fulfilled') {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.res);
            resolvePromise(promise2, x, resolve, reject);       // resolvePromise(promise2, x, resolve, reject)，用于链式then来比较promise2和x
          } catch (e) {
            reject(e);
          }
        }, 0)
      }
      if (this.status === 'rejected') {
        setTimeout(() => {
          try {
            let x = onRejected(this.err);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        }, 0)
      }
      // 当状态为pending时，分别将成功和失败的结果存入各自的数组
      if (this.status === 'pending') {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.res);
              resolvePromise(promise2, x, resolve, reject);
            } catch(e) {
              reject(e);
            }
          }, 0)
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.err);
              resolvePromise(promise2, x, resolve, reject);
            } catch(e) {
              reject(e);
            }
          }, 0)
        })
      }

    })
    return promise2;
  };
  catch(onRejected) {
    return this.then(null, onRejected);
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    return reject(new TypeError('cycle'));
  }
  let called;
  if (x !== null && (typeof x !== 'object' || typeof x !== 'function') ) {
    resolve(x);
  } else {
    try {
      // x是对象或者函数
      let then = x.then;
      if (typeof then === 'function') {
        then.call(x, res => {
          if (called) return;
          called = true;
          // resolve的结果还是promise，就继续解析
          resolvePromise(promise2, res, resolve, reject)
        }, err => {
          if (called) return;
          called = true;
          reject(err);
        })
      } else {
        // x仅仅是个对象
        resolve(x);
      }

    } catch(e) {
      if (called) return;
      called = true;
      reject(e);
    }
  }
}

Promise.resolve = function(res) {
  return new Promise((resolve, reject) => {
    resolve(res);
  })
};
Promise.reject = function(err) {
  return new Promise((resolve, reject) => {
    reject(err);
  })
};
// all--所有的promise都执行then，结果放在数组里面，再一起返回
Promise.all = function(promiseList) {
  let resArr = [];
  let i = 0;
  function handle(index, data, resolve) {
    resArr[index] = data;
    i ++;
    if (i === promiseList.length) {
      resolve(resArr);
    }
  }
  return new Promise((resolve, reject) => {
    for (let j = 0; j < promiseList.length; j++) {
      promiseList[j].then(res => {
        handle(j, res, resolve);
      }, e => {
        reject(e);
      });
    }
  })
}
// race--循环执行
Promise.race = function(promiseList) {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < promiseList.length; i++) {
      promiseList[i].then(res => {
        resolve(res);
      }, e => {
        reject(e);
      });
    }
  })
}

// 测试
Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve,reject)=>{
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}
module.exports = Promise;