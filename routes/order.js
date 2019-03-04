const express = require('express');
const mongoose = require('mongoose');
const _ = require('lodash');

const {authenticate} = require('../middlewares/authenticate');
const Shop = require('../models/shop');
const Order = require('../models/order');
const User = require('../models/user');

const router = express.Router();

router.post('/create-order', authenticate, (req, res) => {
  let valid = true;
  let validAddress = false;
  let resBody = {};
  let error = {};
  let result;
  let shop, tempItems, items, temp, itm, temp1, temp2;
  let body = _.pick(req.body, ['shopID', 'items']);
  if(!(body.shopID && body.items)) valid = valid && false;
  if(valid) {
    try {
      Shop.findById(body.shopID)
        .lean()
        .select({ items: 1, shopName: 1, deliveryCharge: 1 })
        .then((shopItems) => {
          tempItems = [];
          for(let i=0; i<body.items.length; i++) {
            itm = shopItems.items.find(im => im._id.toHexString() === body.items[i].itemID);
            if(itm) {
              temp1 = {...itm}
              temp1.mValue = body.items[i].mValue;
              temp1.quantity = body.items[i].quantity;
              temp2 = null; 
              temp2 = temp1.mpValues.find(mpv => mpv.mValue === body.items[i].mValue);
              if(temp2) {
                temp1.price = temp2.price;
              } else {
                temp1.price = -1;
              }
              tempItems.push(temp1);
              temp1 = null;
            }
          }
          if(tempItems.length === 0) {
            error.items = 'Can not create order with zero items';
            resBody.error = error;
            resBody.status = 'error';
            return res.status(400).send(resBody);
          }
          items = tempItems;
          result = calcCostAndQuan(items);
          body.quantity = result.quantity;
          body.totalCost = result.totalCost;
          body.deliveryCharge = shopItems.deliveryCharge;
          body.shopName = shopItems.shopName;
          body.userID = req.user._id;
          body.status = [{ type: 0, timeStamp: new Date().getTime() }];
          body.items = items;
          const order = new Order(body);
          order.save()
            .then(order => {
              if(order) {
                User.update({ _id: body.userID }, {
                  $push: { orders: { orderID: order._id } }
                })
                  .then(r => {
                    if(r.ok === 1) {
                      Shop.update({ _id: body.shopID }, {
                        $push: { orders: { orderID: order._id } }
                      })
                        .then(rs => {
                          if(rs.ok === 1) {
                            resBody.status = 'ok';
                            return res.send(resBody);
                          }
                        })
                        .catch(e => {
                          User.findByIdAndUpdate(body.userID, {
                            $pop: { orders: 1 } })
                            .then((response) => {
                              Order.findByIdAndRemove(order._id)
                                .then(() => {
                                  error.shop = 'Unable to store order in shop';
                                  error.e = e.errmsg;
                                  resBody.error = error;
                                  resBody.status = 'error';
                                  return res.status(400).send(resBody);
                                })
                                .catch((e) => {
                                  error.order = 'Unable to delete order';
                                  error.e = e.errmsg;
                                  resBody.error = error;
                                  resBody.status = 'error';
                                  return res.status(500).send(resBody);
                                })
                            })
                            .catch(e => {
                              error.order = 'Unable to delete orderID from user';
                              error.e = e.errmsg;
                              resBody.error = error;
                              resBody.status = 'error';
                              return res.status(500).send(resBody);
                            })
                        })
                    } else {
                      throw resBody;
                    }
                  })
                  .catch(e => {
                    Order.findByIdAndRemove(order._id)
                      .then(() => {
                        error.user = 'Unable to store order in user';
                        error.e = e.errmsg;
                        resBody.error = error;
                        resBody.status = 'error';
                        return res.status(400).send(resBody);
                      })
                      .catch(e => {
                        error.e = e.errmsg;
                        resBody.error = error;
                        resBody.status = 'error';
                        return res.status(400).send(resBody);
                      })
                  })
              } else {
                error.order = 'Unable to create order';
                resBody.status = 'error';
                resBody.error = error;
                throw resBody;
              }
            })
            .catch(e => {
              error.order ='Unable to store order';
              error.e = e.errmsg;
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            })
        })
        .catch((e) => {
          error.shopID = 'Inavlid';
          error.e = e.errmsg;
          resBody.error = error;
          resBody.status = 'error';
          return res.status(400).send(resBody);
        });
    }
    catch(e) {
      return res.status(400).send(e);
    }
  } else {
    error.msg =  'Invalid data';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
});

router.post('/edit-order', authenticate, (req, res) => {
  let body = _.pick(req.body, ['orderID', 'addressID', 'items']);
  let valid = true;
  let resBody = {};
  let error = {};
  let tempItems, items, temp, result;
  let validAddress = false;
  if(!(body.orderID && body.addressID && body.items)) {
    valid = valid && false;
  }
  if(valid) {
    try {
      Order.findById(body.orderID)
        .then(order => {
          if(order) {
            if(!(body.addressID === order.addressID.toHexString())) {
              req.user.address.forEach((address) => {
                if(address._id.toHexString() === body.addressID) {
                  validAddress = true;
                }
              });
            } else {
              validAddress = true;
            }
            if(validAddress) {
              Shop.findById(order.shopID)
                .lean()
                .select({ items: 1 })
                .then((shopItems) => {
                  tempItems = shopItems.items.filter((item1) => {
                    return body.items.some((item2) => {
                      return item1._id.toHexString() === item2.itemID;
                    });
                  });
                  items = _.map(tempItems, (item) => {
                    temp = body.items.find((itm) => {
                      return itm.itemID === item._id.toHexString();
                    })
                    if(temp.quantity) return _.extend({}, item, {quantity: temp.quantity});
                    else {
                      error.quantity = 'Item Quantity not specified';
                      resBody.error = error;
                      resBody.status = 'error';
                      throw resBody;
                    }
                  });
                  result = calcCostAndQuan(items);
                  body.totalCost = result.totalCost;
                  body.quantity = result.quantity;
                  Order.update({ _id: order._id }, {
                    $set: {
                      totalCost: body.totalCost,
                      quantity: body.quantity,
                      addressID: body.addressID,
                      items: items,
                      cartUpdate: new Date().getTime()
                    }
                  })
                    .then(r => {
                      Order.findById(order._id)
                        .then(o => {
                          resBody.status = 'ok';
                          resBody.data = o;
                          return res.send(resBody);
                        })
                        .catch(e => {
                          error.order = 'Unable to retrive updated object';
                          resBody.error = error;
                          resBody.status = 'ok';
                          return res.status(200).send(resBody);
                        })
                    })
                    .catch(e => {
                      error.order = 'Unable to update order.';
                      resBody.error = error;
                      resBody.status = 'error';
                      return res.status(400).send(resBody);
                    });
                })
                .catch((e) => {
                  error.shopID = 'Inavlid';
                  resBody.error = error;
                  resBody.status = 'error';
                  return res.status(400).send(resBody);
                });
            } else {
              error.addressID = 'Inavlid';
              resBody.status = 'error';
              resBody.error = error;
              return res.status(400).send(resBody);
            }
          } else {
            throw resBody;
          }
        })
        .catch(e => {
          error.orderID = 'Inavlid';
          error.e = e.errmsg;
          resBody.status = 'error';
          resBody.error = error;
          return res.status(400).send(resBody);
        });
    }
    catch(e) {
      return res.status(400).send(e);
    };
  } else {
    error.order = 'Inavlid data';
    resBody.status = 'error';
    resBody.error = error;
    return res.status(400).send(resBody);
  }
});

const calcCostAndQuan = (items) => {
  let cost = 0;
  let quan = 0;
  items.forEach(item => {
    cost = cost + (item.price * item.quantity);
    quan = quan + item.quantity;
  });
  return{ totalCost: cost, quantity: quan };
}

module.exports = router;
