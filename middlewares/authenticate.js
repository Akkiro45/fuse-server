const User = require('../models/user');

const authenticate = (req, res, next) => {
  let error = {};
  let resBody = {};
  const token = req.header('x-auth');
  User.findByToken(token)
    .then(user => {
      if(!user) return Promise.reject('User does not found.');
      req.user = user;
      req.token = token;
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
