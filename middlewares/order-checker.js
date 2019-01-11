const Shop = require('../models/shop');

const orderChecker = (req, res, next) => {
  let error = {};
  let resBody = {};
  if(req.shopID && req.body.orderID) {
    Shop.find({ _id: req.shopID, 'orders.orderID': req.body.orderID })
      .select({ _id: 1 })
      .then(id => {
        if(!(id.length === 1)) {
          error.msg = 'Unauthrozied access';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(401).send(resBody);
        } else {
          next();
        }
      })
      .catch(e => {
        error.msg = 'Unable to find shop!';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(404).send(resBody);
      })
  } else {
    if(!req.body.orderID) error.msg = 'orderID required';
    else error.msg = 'Does not have shopID';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(404).send(resBody);
  }
};

module.exports = {
  orderChecker
}
