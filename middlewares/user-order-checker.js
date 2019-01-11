const User = require('../models/user');

const userOrderChecker = (req, res, next) => {
  let error = {};
  let resBody = {};
  let order;
  if(req.body.orderID) {
    order = req.user.orders.find(id => id.orderID.toHexString() === req.body.orderID);
    if(order) {
      next();
    } else {
      error.order = 'Unauthrozied access';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(401).send(resBody);
    }
  } else {
    error.orderID = 'required';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
}

module.exports = {
  userOrderChecker
}
