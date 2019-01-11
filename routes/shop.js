const express = require('express');
const _ = require('lodash');
const mongoose = require('mongoose');

const Shop = require('../models/shop');
const Order = require('../models/order');
const Customer = require('../models/customer');
const Session = require('../models/session');
const {addressVerification} = require('../utility/address-verification');
const {numberVerification} = require('../utility/number-verification');
const {authenticate} = require('../middlewares/customer-authenticate');
const {pickShopData} = require('./../utility/utility');

const router = express.Router();

const check = (body, valid) => {
  if(body.shopAddress) {
    body.shopAddress = addressVerification(body.shopAddress);
    if(body.shopAddress.valid) valid = valid && true;
    else {
      valid = valid && false;
      error.shopAddress = 'Invalid Addres';
    };
  }
  if(body.phoneNumber) {
    if(body.phoneNumber.toString().length !== 10) {
      valid = valid && false;
      error.phoneNumber = 'Invalid phoneNumber';
    }
    if(valid) {
      if(!(numberVerification(body.phoneNumber))) error.phoneNumber = 'Invalid phoneNumber';
    }
  }
  return {
    body,
    valid
  }
}

router.post('/create-shop', authenticate,  (req, res) => {
  let sessionID = req.body.sessionID;
  let resBody = {};
  let error = {};
  let data = {};
  let cust = req.cust._id;
  if(req.cust.shops.length === 1) {
    error.msg = 'you cannot create more than one shop';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
  let body = _.pick(req.body, ['owner', 'status', 'itemCategories','description', 'socialLinks', 'phoneNumber', 'shopName', 'shopAddress', 'shopSrchName', 'items', 'shopCategories', 'shopPhotos', 'timings', 'isStatic', 'deliveryCharge', 'deliveryAddTages']);
  let valid = true;
  body.shopSrchName = body.shopSrchName.toLowerCase();
  if(body.shopName && body.isStatic && body.shopSrchName) valid = valid && true;
  if(body.timings) {
    if(body.timings.length < 7 || body.timings.length > 7) {
      valid = valid && false;
      error.must = 'Timings must 0f 7 days only';
      resBody.status = 'error';
      resBody.error = error;
    }
  }
  let body1 = check(body, valid);
  body = body1.body;
  valid = body1.valid;
  if(valid) {
    body.owner = cust;
    const shop = new Shop(body);
    shop.save()
      .then(sp => {
        resBody.data = sp;
        if(!body.isStatic) {
            resBody.data.orders = { totalOrders: 0 };
        }
        data = pickShopData(sp);
        Customer.addShopId(cust, sp._id)
          .then(() => {
            Session.updateSession(sessionID, data)
              .then((rs) => {
                resBody.status = 'ok';
                return res.send(resBody);
              })
              .catch(e => {
                error.msg = 'Unable to save session';
                resBody.error = error;
                return res.send(resBody);
              });
          })
          .catch(e => {
            resBody.status = 'error';
            error.msg = 'Unable to add shopID to customer';
            // error.msg = e.errmsg;
            resBody.error = error;
            return res.status(400).send(resBody);
          });
      })
      .catch(e => {
        resBody.status = 'error';
        error.msg = 'Unable to create shop';
        error.e = e.errmsg;
        resBody.error = error;
        return res.status(400).send(resBody);
      })
  } else {
    error.msg = 'Inavlid data';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/edit-shop', authenticate, (req, res) => {
  let sessionID = req.body.sessionID;
  let resBody = {};
  let error = {};
  let data;
  let body = _.pick(req.body, ['status', 'description', 'socialLinks', 'phoneNumber', 'shopName', 'shopAddress', 'shopSrchName', 'items', 'shopCategories', 'shopPhotos', 'timings', 'isStatic', 'deliveryCharge', 'deliveryAddTages']);
  let valid = true;
  let body1 = check(body, valid);
  body = body1.body;
  valid = body1.valid;

  if(valid) {
    if(req.shopID) {
      Shop.editShop(body, req.shopID)
        .then(shop => {
          resBody.data = _.pick(shop, ['shopName', 'shopAddress', 'shopCategories', 'shopSrchName', 'shopPhotos', 'timings', 'isStatic', 'deliveryCharge', 'phoneNumber', 'socialLinks', 'description']);;
          resBody.data.cust = _.pick(req.cust, ['firstName', 'lastName', 'phoneNumber', 'email']);
          resBody.data.orders = { totalOrders: 0 };
          resBody.data.msg = 'Shop updated!';
          resBody.status = 'ok';
          if((body.shopName || body.isStatic === false ) && req.body.sessionID) {
            data = body.shopName ? body.shopName : body.isStatic;
            let prop = body.shopName ? 'shopName' : 'isStatic';
            Session.updateSession(sessionID, data, true, prop)
              .then((rs) => {
                resBody.status = 'ok';
                return res.send(resBody);
              })
              .catch(e => {
                error.msg = 'Unable to save session';
                resBody.error = error;
                return res.send(resBody);
              });
          } else {
            return res.send(resBody);
          }
        })
        .catch(e => {
          error.msg = 'unable to update shop';
          resBody.error = error;
          resBody.status = 'error';
          resBody.e = e.errmsg || null;
          return res.status(400).send(resBody);
        });
    } else {
      error.msg = 'Shop doesn\'t found!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    }
  } else {
    error.msg = 'Invalid data!';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.get('/get-profile', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  if(req.shopID) {
    Shop.findById(req.shopID)
      .then(response => {
        if(!response.isStatic) {
          Order.find({ shopID: req.shopID, 'status.type': { $in: [2, 3, 4, 5, 6] } })
            .select({ _id: 1 })
            .count()
            .then(count => {
              resBody.data = _.pick(response, ['shopName', 'shopAddress', 'shopCategories', 'shopSrchName', 'shopPhotos', 'timings', 'isStatic', 'deliveryCharge', 'phoneNumber', 'socialLinks', 'description']);
              resBody.data.cust = _.pick(req.cust, ['firstName', 'lastName', 'phoneNumber', 'email']);
              let ordersCount = {
                totalOrders: count
              }
              resBody.data.orders = ordersCount;
              resBody.status = 'ok';
              return res.send(resBody);
            })
        } else {
          resBody.data = _.pick(response, ['shopName', 'shopAddress', 'shopCategories', 'shopSrchName', 'shopPhotos', 'timings', 'isStatic', 'deliveryCharge', 'phoneNumber', 'socialLinks', 'description']);
          resBody.data.cust = _.pick(req.cust, ['firstName', 'lastName', 'phoneNumber', 'email']);
          resBody.status = 'ok';
          return res.send(resBody);
        }
      })
      .catch(e => {
        error.msg = 'Unable to find shop!';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      })
  } else {
    error.msg = 'No shop';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.get('/get-inventory', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  if(req.shopID) {
    Shop.findById(req.shopID)
      .select({ items: 1, itemCategories: 1 })
      .then(response => {
        resBody.data = _.pick(response, ['items', 'itemCategories']);
        resBody.status = 'ok';
        return res.send(resBody);
      })
      .catch(e => {
        error.msg = 'Unable to find shop!';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      })
  } else {
    error.msg = 'No shop';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/edit-inventory/:type', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  let data = {};
  let categoryName = null;
  let flag = true;
  let body = _.pick(req.body, ['category', 'item', 'categoryID', 'itemID']);
  const type = req.params.type;
  if((type === '1' && !body.category) || (type === '2' && !body.item) || (type === '3' && !body.categoryID) || (type === '4' && !body.itemID) || (type === '5' && !body.item && !body.itemm._id)) {
    resBody.status = 'error';
    error.msg = 'Invalid data';
    resBody.error = error;
    return res.status(400).send(resBody);
  }
  if(req.shopID) {
    Shop.findById(req.shopID)
      .select({ items: 1, itemCategories: 1 })
      .then(response => {
        if(type === '1') {
          response.itemCategories.forEach(cat => {
            if(cat.category === body.category) flag = false;
          });
          if(flag)
            response.itemCategories.push({ category: body.category });
        } else if(type === '2') {
          response.items.push(body.item);
        } else if(type === '3') {
          response.itemCategories = response.itemCategories.filter(cat => {
            if(!new mongoose.mongo.ObjectId(body.categoryID).equals(cat._id)) {
              return true;
            } else {
              categoryName = cat.category;
              return false;
            }
          });
          response.items = response.items.filter(item => item.category !== categoryName);
        } else if(type === '4') {
          response.items = response.items.filter(item => !new mongoose.mongo.ObjectId(body.itemID).equals(item._id));
        } else if(type === '5') {
          let item = response.items.findIndex(item => new mongoose.mongo.ObjectId(body.itemID).equals(item._id));
          if(item !== -1) {
            response.items[item] = _.pick(body.item, ['name', 'category', 'mUnit', 'mValue', 'description', 'price', 'photo']);
          }
        }
        data = _.pick(response, ['items', 'itemCategories']);
        Shop.editShop(data, req.shopID)
          .then(shop => {
            resBody.data = _.pick(shop, ['items', 'itemCategories']);
            resBody.data.msg = 'Inventory updated!';
            resBody.status = 'ok';
            return res.send(resBody);
          })
          .catch(e => {
            error.msg = 'unable to update shop';
            // resBody.error = error;
            resBody.status = 'error';
            resBody.e = e.errmsg || null;
            return res.status(400).end(resBody);
          });
      })
      .catch(e => {
        error.msg = 'Unable to find shop!';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      })
  } else {
    error.msg = 'No shop';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.get('/check-name/:name', (req, res) => {
  let resBody = {};
  let error = {};
  const shopSrchName = req.params.name.toLowerCase();
  Shop.findOne({ shopSrchName: { $eq: shopSrchName } })
    .select({ shopSrchName: 1 })
    .then(r => {
      if(r) {
        error.shopSrchName = 'shopSrchName already exist';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      } else {
        resBody.status = 'ok';
        return res.send(resBody);
      }
    })
    .catch(e => {
      error.shopSrchName = 'Unable to find shopSrchName';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    })
});

router.delete('/delete', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  if(req.shopID && req.body.sessionID) {
      const shop = Shop.update({ _id: req.shopID }, { status: false });
      const cust = Customer.update({ _id: req.cust._id }, { shops: [] });
      const session = Session.updateSession(req.body.sessionID, false);
      Promise.all([shop, cust, session])
        .then(response => {
          resBody.status = 'ok';
          return res.send(resBody);
        })
        .catch(e => {
          error.msg = 'Something went wrong!';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(400).send(resBody);
        })
  } else {
    error.msg = 'Inavlid request';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

module.exports = router;
