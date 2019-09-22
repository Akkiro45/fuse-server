const express = require('express');
const _ = require('lodash');

const User = require('../models/user');
const Shop = require('../models/shop');
const Order = require('../models/order');
const Session = require('../models/session');
const {authenticate} = require('../middlewares/authenticate');
const {userOrderChecker} = require('../middlewares/user-order-checker');
const {emailVerification} = require('./../utility/email-verification');
const {numberVerification} = require('./../utility/number-verification');
const {addressVerification} = require('./../utility/address-verification');
const {pickData} = require('./../utility/utility');

const router = express.Router();

// /users
router.post('/signup', (req, res) => {
  let resBody = {};
  let error = {};
  let data = {};
  let body = _.pick(req.body, ['firstName', 'lastName', 'phoneNumber', 'email', 'password']);
  data = _.pick(body, ['firstName', 'lastName', 'phoneNumber', 'email']);
  if(body.password && body.phoneNumber) {
    let isEmail = true;
    let isNumber = false;
    if(body.email) {
      isEmail = emailVerification(body.email);
    }
    isNumber = numberVerification(body.phoneNumber);
    if(!(body.phoneNumber.toString().length === 10)) isNumber = false;
    if(isEmail === true && isNumber === true) {
      body.createdAt = new Date().getTime();
      const user = new User(body);
      user.save()
        .then((u) => {
          user.generateAuthToken()
            .then((token) => {
              resBody.status = 'ok';
              resBody.data = pickData(user);
              data.token = token;
              data.userID = u._id;
              resBody.data.userID = u._id;
              Session.saveSession(data)
                .then(ss => {
                  resBody.sessionID = ss._id;
                  return res.set({
                    'Access-Control-Expose-Headers': 'x-auth',
                    'x-auth': token
                  }).send(resBody);
                })
                .catch(e => {
                  error.msg = 'Unable to save session';
                  resBody.error = error;
                  return res.set({
                    'Access-Control-Expose-Headers': 'x-auth',
                    'x-auth': token
                  }).send(resBody);
                });
            })
            .catch(e => {
              error.e = e.errmsg;
              error.msg = 'Validation error.';
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            });
        })
        .catch(e => {
          error.msg = 'User already exist';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(400).send(resBody);
        });
    } else {
      error.msg = 'Invalid Email id or Phone number!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    }
  } else {
    error.msg = 'Invalid data.';
    resBody.error = error;
    resBody.status - 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/login', (req, res) => {
  const body = _.pick(req.body, ['email', 'phoneNumber', 'password']);
  let byEmail = false;
  let param = body.phoneNumber;
  let resBody = {};
  let error = {};
  let data = {};
  if(body.email) {
    byEmail = true;
    param = body.email;
  }
  User.findByCredentials(param, body.password, byEmail)
    .then(user => {
      resBody.data = pickData(user);
      resBody.status = 'ok';
      resBody.data.userID = user._id;
      resBody.data.address = user.address.filter(ad => ad.valid !== false);
      data = {...resBody.data};
      data.userID = user._id;
      return user.generateAuthToken()
    })
      .then(token => {
        if(token) {
          data.token = token;
          Session.saveSession(data)
            .then(ss => {
              resBody.sessionID = ss._id;
              return res.set({
                'Access-Control-Expose-Headers': 'x-auth',
                'x-auth': token
              }).send(resBody);
            })
            .catch(e => {
              error.msg = 'Unable to save session';
              resBody.error = error;
              return res.set({
                'Access-Control-Expose-Headers': 'x-auth',
                'x-auth': token
              }).send(resBody);
            });
        } else {
          error.msg = 'More than 10 Concurrent user!';
          resBody.status = 'error';
          resBody.error = error;
          return res.status(400).send(resBody);
        }
      })
    .catch(e => {
      error.msg = 'Invalid credentials!';
      resBody.status = 'error';
      resBody.error = error;
      return res.status(400).send(resBody);
    });
});

router.get('/me', authenticate, (req, res) => {
  let resBody = {};
  resBody.data = pickData(req.user);
  resBody.status = 'ok';
  return res.header('x-auth', req.token).send(resBody);
});

router.delete('/logout/:sessionID', authenticate, (req, res) => {
  let resBody = {};
  req.user.removeToken(req.token)
    .then(() => {
      Session.findByIdAndRemove(req.params.sessionID)
        .then(() => {
          resBody.status = 'ok';
          return res.status(200).send(resBody);
        })
    })
    .catch(e => {
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});
// ------------ change password --------------------
// router.patch('/change-password', authenticate, (req, res) => {
//   let resBody = {};
//   let error = {};
//   User.changePassword(req.user._id, req.body.newPassword, req.body.oldPassword)
//     .then(() => {
//       resBody.data = 'Password updated!';
//       resBody.status = 'ok';
//       return res.send(resBody);
//     })
//     .catch(e => {
//       error.msg = 'Unable to update password';
//       resBody.error = error;
//       resBody.status = 'error';
//       return res.status(400).send(resBody);
//     });
// });

router.post('/add-address', authenticate, (req, res) => {
  let sessionID = req.body.sessionID;
  let resBody = {};
  let error = {};
  let body = _.pick(req.body, ['state', 'city', 'pincode', 'landmark', 'streetAdd', 'country']);
  let address = addressVerification(body);
  if(address.latitude && address.longitude) {
    req.user.addAddress(address)
      .then(r => {
        Session.updateUserSession(sessionID, r.address, 'address')
          .then(rsp => {
            resBody.status = 'ok';
            resBody.data = r.address[r.address.length - 1];
            return res.status(200).send(resBody);
          })
          .catch(e => {
            throw new Error();
          });
      })
      .catch(e => {
        error.msg = 'error while saving.';
        error.e = e.message;
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      });
  } else {
    error.msg = 'Invalid address.';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/rmv-address', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  let body = _.pick(req.body, ['addressID', 'sessionID']);
  let address = addressVerification(body);
  let adds;
  if(address.addressID && address.sessionID) {
    req.user.removeAddress(body.addressID)
      .then(r => {
        adds = r.address.filter(ad => ad.valid !== false);
        Session.updateUserSession(body.sessionID, adds, 'address')
          .then(rsp => {
            resBody.status = 'ok';
            resBody.data = {
              _id: body.addressID
            }
            return res.status(200).send(resBody);
          })
          .catch(e => {
            throw new Error();
          });
      })
      .catch(e => {
        error.msg = 'error while saving.';
        error.e = e.message;
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      });
  } else {
    error.msg = 'Invalid data.';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.get('/get-address', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  User.findById(req.user._id)
    .select({ address: 1 })
    .then(user => {
      resBody.status = 'ok';
      resBody.data = user.address;
      return res.send(resBody);
    })
    .catch(e => {
      error.msg = 'Unable to find address';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.post('/shops', (req,res) => {
  let resBody = {};
  let error = {};
  const pageNumber = parseInt(req.query.pageNumber);
  const pageSize = parseInt(req.query.pageSize);
  const body = req.body;
  let query = {
    status: true
  };
  let sort = {
    items: 1
  };
  if(body.delivery) {
    sort.isStatic = 1
  }
  if(body.shopCategories) {
    query['shopCategories.category'] = body.shopCategories;
  }
  if(body.shopSrchName) {
    query.$or = [
      { shopName: { $regex: body.shopSrchName , $options: "$i" }},
      { shopSrchName: { $regex: body.shopSrchName , $options: "$i" }}
    ]
  }
  if(body.district) {
    query['shopAddress.city'] = body.district;
  }
  Shop.find(query)
    .sort(sort)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .select({ shopName: 1, shopAddress: 1, shopCategories: 1, shopSrchName: 1, shopPhotos: 1, isStatic: 1 })
    .then(shops => {
      resBody.data = shops;
      resBody.status = 'ok';
      return res.send(resBody);
    })
    .catch(e => {
      error.shop = 'Unable to find shops';
      resBody.error = error;
      resBody.status = 'error';
      resBody.e = e;
      return res.status(400).send(resBody);
    });
});

router.get('/shop', (req, res) => {
  let resBody = {};
  let error = {};
  const shopSrchName = req.query.shopSrchName;
  Shop.findOne({ shopSrchName, status: true })
    .select({ shopName: 1, shopAddress: 1, items: 1, shopCategories: 1, shopSrchName: 1, shopPhotos: 1, isStatic: 1, deliveryCharge: 1, phoneNumber: 1, socialLinks: 1, description: 1, itemCategories: 1 })
    .then(shop => {
      if(shop) {
        resBody.data = shop;
        resBody.status = 'ok';
        return res.send(resBody);
      } else {
        error.shop = 'Unable to find shop';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(404).send(resBody);
      }
    })
    .catch(e => {
      error.shop = 'Unable to find shop';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(404).send(resBody);
    });
});

router.get('/cart', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  let query = {
    userID: req.user._id,
    'status.type': {
      $eq: 0,
      $nin: [1, 2, 3, 4, 5, 6]
    }
  };
  let sort = {
    'status.timeStamp': -1
  }
  Order.find(query)
    .sort(sort)
    .then(orders => {
      if(orders) {
        resBody.data = orders;
        resBody.status = 'ok';
        return res.send(resBody);
      } else {
        throw new Error();
      }
    })
    .catch(error => {
      error.msg = 'Orders not found!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.get('/orders', authenticate, (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber);
  const pageSize = parseInt(req.query.pageSize);
  let resBody = {};
  let error = {};
  let query = {
    userID: req.user._id,
    'status.type': {
      $in: [2, 3, 4, 5, 6, 7]
    }
  };
  let sort = {
    'status.timeStamp': -1
  }
  Order.find(query)
    .lean()
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .sort(sort)
    .then(orders => {
      if(orders) {
        User.getData(orders)
          .then(ords => {
            resBody.data = orders.map((order, i) => {
              userData = ords.find(o => {
                return o._id.toHexString() === order.userID.toHexString()
              });
              order.address = userData.address[0],
              order.firstName = userData.firstName,
              order.lastName = userData.lastName,
              order.phoneNumber = userData.phoneNumber
              return order;
            });
            resBody.status = 'ok';
            return res.send(resBody);
          })
          .catch(e => {
            error.shop = 'Something went wrong!';
            resBody.error = error;
            resBody.status = 'error';
            return res.status(400).send(resBody);
          });
      } else {
        throw new Error();
      }
    })
    .catch(error => {
      error.msg = 'Orders not found!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.delete('/del/order', authenticate, (req, res) => {
  const body = _.pick(req.body, ['orderID']);
  let resBody = {};
  let error = {};
  const query = {
    _id: body.orderID,
    'status.type': {
      $nin: [1, 2, 3, 4, 5, 6]
    },
    userID: req.user._id
  };
  if(body.orderID) {
    Order.findOneAndRemove(query)
      .then(o => {
        if(o) {
          const user = User.removeOrder(o.userID, body.orderID);
          const shop = Shop.removeOrder(o.shopID, body.orderID);
          Promise.all([user, shop])
            .then(r => {
              resBody.status = 'ok';
              resBody.data = o._id;
              return res.send(resBody);
            })
            .catch(e => {
              error.msg = 'Unable to delete';
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            });
        } else {
          throw new Error();
        }
      })
      .catch(e => {
        error.msg = 'Unable to delete';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      });
  } else {
    error.msg = 'Order ID required';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/status', authenticate, userOrderChecker, (req, res) => {
  let body = _.pick(req.body, ['type', 'addressID', 'orderID']);
  let resBody = {};
  let error = {};
  let valid = true;
  let updateStatus = {};
  let removed = false, ordered = false, cancelled = false, deliverd = false, notdelivered = false, accepted = false, rejected = false;
  if(!(body.type && body.orderID)) valid = valid && false;
  if(body.type === 2) {
    if(!body.addressID) valid = valid && false;
  }
  if(valid) {
    Order.findById(body.orderID)
      .select({ status: 1, allowCancelOrder: 1 })
      .then(order => {
        if(order) {
          order.status.forEach(s => {
            if(s.type === 1) removed = true;
            else if(s.type === 2) ordered = true;
            else if(s.type === 3) cancelled = true;
            else if(s.type === 6) deliverd = true;
            else if(s.type === 5) rejected = true;
            else if(s.type === 4) accepted = true;
            else if(s.type === 7) notdelivered = true;
          });
          if((body.type === 1 && !removed && !ordered && !cancelled)) {
            updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
          } else if(body.type === 2 && !removed && !ordered && !cancelled) {
              updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
              updateStatus.addressID = body.addressID;
          } else if(body.type === 3 && !removed && ordered && !notdelivered && !cancelled && !deliverd && !rejected) {
            updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
            if(accepted) {
              if(!order.allowCancelOrder) {
                error.msg = 'You cannot cancel the order';
                resBody.error = error;
                resBody.status = 'error';
                return res.status(400).send(resBody);
              }
            }
          } else {
            error.msg = 'Inapropriate request';
            resBody.error = error;
            resBody.status = 'error';
            return res.status(400).send(resBody);
          }
          Order.update({ _id: body.orderID }, updateStatus)
            .then(r => {
              if(r.ok === 1) {
                Order.findById(body.orderID)
                  .select({ status: 1 })
                  .then(updatedStatus => {
                    resBody.data = updatedStatus;
                    resBody.status = 'ok';
                    return res.send(resBody);
                  })
                  .catch(e => {
                    error.msg = 'Unable to return updated status';
                    resBody.error = error;
                    resBody.status = 'error';
                    return res.status(400).send(resBody);
                  });
              } else {
                throw 'error';
              }
            })
            .catch(e => {
              error.msg = 'Unable to update status';
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            });
        } else {
          error.orderID = 'does not exist';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(404).send(resBody);
        }
      })
      .catch(e => {
        error.order = 'unable to find order';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      });
  } else {
    error.data = 'Invalid';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

module.exports = router;
