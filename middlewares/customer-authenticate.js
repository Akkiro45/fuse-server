const Customer = require('../models/customer');

const authenticate = (req, res, next) => {
  let resBody = {};
  let error = {};
  const token = req.header('x-auth');
  Customer.findByToken(token)
    .then(cust => {
      if(!cust) return Promise.reject('Customers does not found.');
      req.cust = cust;
      req.token = token;
      if(req.cust.shops[0]) req.shopID = req.cust.shops[0].shopID;
      next();
    })
    .catch(e => {
      error.msg = e;
      resBody.error = error;
      resBody.status = 'error';
      res.status(401).send(resBody);
    });
}

module.exports = {
  authenticate
}
