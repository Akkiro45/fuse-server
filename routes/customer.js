const express = require('express');
const _ = require('lodash');

const Customer = require('../models/customer');
const Shop = require('../models/shop');
const User = require('../models/user');
const Order = require('../models/order');
const Session = require('../models/session');
const {authenticate} = require('../middlewares/customer-authenticate');
const {orderChecker} = require('../middlewares/order-checker');
const {emailVerification} = require('./../utility/email-verification');
const {numberVerification} = require('./../utility/number-verification');
const {pickData, pickShopData} = require('./../utility/utility');

const router = express.Router();

// /customers
router.post('/signup', (req, res) => {
  let resBody = {};
  let error = {};
  let data = {};
  let body = _.pick(req.body, ['firstName', 'lastName', 'phoneNumber', 'email', 'password']);
  data = _.pick(body, ['firstName', 'lastName', 'phoneNumber', 'email']);
  if(body.password && body.phoneNumber) {
    let isEmail = false;
    let isNumber = false;
    if(body.email) {
      isEmail = emailVerification(body.email);
    }
    isNumber = numberVerification(body.phoneNumber);
    if(!(body.phoneNumber.toString().length === 10)) isNumber = false;
    if(isEmail === true && isNumber === true) {
      body.createdAt = new Date().getTime();
      const cust = new Customer(body);
      cust.save()
        .then((customer) => {
          cust.generateAuthToken()
            .then((token) => {
              resBody.status = 'ok';
              resBody.data = pickData(cust);
              data.token = token;
              data.custID = customer._id;
              resBody.data.custID = customer._id;
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
              // error.e = e.errmsg;
              error.msg = 'Validation error.';
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            });
        })
        .catch(e => {
          error.msg = 'Already exist';
          // error.e = e.errmsg || e.message;
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
  Customer.findByCredentials(param, body.password, byEmail)
    .then(cust => {
      resBody.status = 'ok';
      resBody.data = pickData(cust);
      resBody.data.custID = cust._id;
      data = {...resBody.data};
      data.custID = cust._id;
      if(cust.shops.length !== 0) {
        Shop.findById(cust.shops[0].shopID)
          .select({ shopName: 1, isStatic: 1 })
          .then(s => {
            if(s) {
              resBody.data.shop = pickShopData(s);
              data.shop = resBody.data.shop;
            }
            else resBody.data.shop = 'Shop not found!';
          })
          .catch(e => {
            resBody.data.shop = 'Unable to find shop';
          })
      } else {
        resBody.data.shop = 'Shop not found!';
      }
      return cust.generateAuthToken()
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
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.get('/me', authenticate, (req, res) => {
  let resBody = {};
  resBody.status = 'ok';
  resBody.data = pickData(req.cust);
  res.header('x-auth', req.token).send(resBody);
});

router.delete('/logout/:sessionID', authenticate, (req, res) => {
  let resBody = {};
  req.cust.removeToken(req.token)
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

router.patch('/change-password', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  Customer.changePassword(req.cust._id, req.body.newPassword, req.body.oldPassword)
    .then(() => {
      resBody.data = 'Password updated!';
      resBody.status = 'ok';
      return res.send(resBody);
    })
    .catch(e => {
      error.msg = 'Unable to update password';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.get('/orders', authenticate, (req, res) => {
  let shopID;
  let resBody = {};
  let error = {};
  let query;
  const pageNumber = parseInt(req.query.pageNumber);
  const pageSize = parseInt(req.query.pageSize);
  let status = parseInt(req.query.status);
  if(status === 0 || status === 1 || status > 8) status = 2;
  if(status === 2) {
    query = {
      $eq: 2,
      $nin: [3, 4, 5, 6, 7]
    }
  } else if(status === 3 ) {
    query = {
      $eq: 3,
      $nin: [5, 6, 7]
    }
  } else if(status === 4 ) {
    query = {
      $eq: 4,
      $nin: [3, 5, 6, 7]
    }
  } else if(status === 5 ) {
    query = {
      $eq: 5
    }
  } else if(status === 6 ) {
    query = {
      $eq: 6
    }
  } else if(status === 7 ) {
    query = {
      $eq: 7
    }
  } else if(status === 8 ) {
    query = {
      $in: [2, 3, 4, 5, 6]
    }
  }
  if(req.cust.shops.length !== 0) {
    shopID = req.cust.shops[0].shopID;
    // Order.find({ shopID, 'status.type': { $nin: [1, 3, 4, 5, 6], $eq: 2 } }) // change status.type to orderd type
    Order.find({ shopID, 'status.type': query })
      .lean()
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .select({ userID: 1, status: 1, totalCost: 1, quantity: 1, addressID: 1, items: 1, deliveryTime: 1, allowCancelOrder: 1 })
      .sort({ 'status.timeStamp': -1 })
      .then(orders => {
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
            // resBody.data = orders;
            resBody.status = 'ok';
            return res.send(resBody);
          })
          .catch(e => {
            error.shop = 'Something went wrong!';
            resBody.error = error;
            resBody.status = 'error';
            // resBody.e = e;
            return res.status(400).send(resBody);
          });
      })
      .catch(e => {
        error.shop = 'Unable to find orders';
        resBody.error = error;
        resBody.status = 'error';
        resBody.e = e;
        return res.status(400).send(resBody);
      });
  } else {
    error.shopID = 'Does not found shop';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(404).send(resBody);
  }
});

router.post('/status', authenticate, orderChecker, (req, res) => {
  let body = _.pick(req.body, ['orderID', 'cancelOrder', 'deliveryTime', 'type']);
  let resBody = {};
  let error = {};
  let updateStatus = {};
  let allowCancelOrder;
  let valid = true, ordered = false, cancelled = false, accepted = false, rejected = false, deliverd = false, notdeliverd = false;
  if(body.orderID && body.type) {
    if(body.type === 4) {
      if(body.cancelOrder) {
        allowCancelOrder = true;
      } else {
        allowCancelOrder = false;
      }
      if(!body.deliveryTime) {
        valid = valid && false;
      }
    }
  } else {
    valid = valid && false;
  }
  if(valid) {
    Order.findById(body.orderID)
      .select({ status: 1 })
      .then(status => {
        status.status.forEach(s => {
          if(s.type === 2) ordered = true;
          else if(s.type === 3) cancelled = true;
          else if(s.type === 4) accepted = true;
          else if(s.type === 5) rejected = true;
          else if(s.type === 6) deliverd = true;
          else if(s.type === 7) notdeliverd = true;
        });
        if(ordered && !cancelled) {
          updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
          if(body.type === 4 && !accepted && !rejected && !deliverd) {
            updateStatus.$set = { deliveryTime: body.deliveryTime, allowCancelOrder };
          } else if(body.type === 5 && !accepted && !rejected && !deliverd) {
          } else if(body.type === 7 && accepted && !cancelled && !rejected && !deliverd) {
          } else if(!(body.type === 6 && accepted && !rejected && !deliverd)) {
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
            })
        } else {
          error.msg = 'Inapropriate request';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(400).send(resBody);
        }
      })
      .catch(e => {
        error.msg = 'unable to find order';
        error.e = e.errmsg;
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      })
  } else {
    error.msg = 'Invalid data';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

module.exports = router;
