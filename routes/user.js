const express = require('express');
const _ = require('lodash');

const User = require('../models/user');
const Shop = require('../models/shop');
const Order = require('../models/order');
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
  let body = _.pick(req.body, ['firstName', 'lastName', 'phoneNumber', 'email', 'password']);
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
        .then(() => {
          user.generateAuthToken()
            .then((token) => {
              resBody.status = 'ok';
              resBody.data = pickData(user);
              return res.header('x-auth', token).send(resBody);
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
          error.e = e.errmsg || e.message;
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
  if(body.email) {
    byEmail = true;
    param = body.email;
  }
  User.findByCredentials(param, body.password, byEmail)
    .then(user => {
      resBody.data = pickData(user);
      resBody.status = 'ok';
      return user.generateAuthToken()
    })
    .then(token => {
      return res.header('x-auth', token).send(resBody);
    })
    .catch(e => {
      error.msg = 'Invalid credentials!';
      resBody.status = 'error';
      resBody.error = error;
      return res.status(400).send(resBody);
    });
});

router.get('/me', authenticate, (req, res) => {
  // req.session.status = req.user._id;
  let resBody = {};
  resBody.data = pickData(req.user);
  resBody.status = 'ok';
  return res.header('x-auth', req.token).send(resBody);
});

router.get('/data', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  if(req.session) {
    resBody.data = req.session;
    resBody.status = 'ok';
    return res.send(resBody);
  } else {
    error.msg = 'No session was created';
    resBody.error = error;
    resBody.status = error;
    return res.status(404).send(resBody);
  }
})

router.delete('/logout', authenticate, (req, res) => {
  let resBody = {};
  req.user.removeToken(req.token)
    .then(() => {
      resBody.status = 'ok';
      return res.status(200).send(resBody);
    })
    .catch(e => {
      resBody.status = 'error';
      return res.status(400).send(resBody);
    });
});

router.patch('/change-password', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  User.changePassword(req.user._id, req.body.newPassword, req.body.oldPassword)
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

router.post('/add-address', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  let body = _.pick(req.body, ['state', 'city', 'pincode', 'landmark', 'streetAdd', 'fullName', 'phoneNumber']);
  let address = addressVerification(body);
  if(address.latitude && address.longitude) {
    req.user.addAddress(address)
      .then(r => {
        resBody.status = 'ok';
        resBody.data = 'Address added!';
        return res.status(200).send(resBody);
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

router.get('/shops', authenticate, (req,res) => {
  let resBody = {};
  let error = {};
  const pageNumber = parseInt(req.query.pageNumber);
  const pageSize = parseInt(req.query.pageSize);
  Shop.find()
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .select({ shopName: 1, shopAddress: 1, shopCategories: 1, shopSrchName: 1, shopPhotos: 1, isStatic: 1, description: 1 })
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

router.post('/status', authenticate, userOrderChecker, (req, res) => {
  let body = _.pick(req.body, ['type', 'userMsg', 'orderID']);
  let resBody = {};
  let error = {};
  let valid = true;
  let updateStatus = {};
  let time = 0;
  let removed = false, ordered = false, cancelled = false, deliverd = false, accepted = false, rejected = false;
  if(!(body.type && body.orderID)) valid = valid && false;
  if(body.type === 3) {
    if(!body.userMsg) body.userMsg = '';
  }
  if(valid) {
    Order.findById(body.orderID)
      .select({ status: 1, expirationTime: 1 })
      .then(order => {
        if(order) {
          order.status.forEach(s => {
            if(s.type === 1) removed = true;
            else if(s.type === 2) ordered = true;
            else if(s.type === 3) cancelled = true;
            else if(s.type === 6) deliverd = true;
            else if(s.type === 5) rejected = true;
            else if(s.type === 4) {
              accepted = true;
              time = parseInt(s.timeStamp);
            }
          });
          if((body.type === 1 && !removed && !ordered && !cancelled) || (body.type === 2 && !removed && !ordered && !cancelled)) {
            updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
          } else if(body.type === 3 && !removed && ordered && !cancelled && !deliverd && !rejected) {
            updateStatus.$push = { status: { type: body.type, timeStamp: new Date().getTime() } };
            updateStatus.$set = { userMsg: body.userMsg };
            if(accepted) {
              if(!(new Date().getTime() <= order.expirationTime + time)) {
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
