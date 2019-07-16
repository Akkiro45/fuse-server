const express = require('express');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const User = require('../models/user');
const Customer = require('../models/customer');
const ResetPass = require('../models/resetpass');
const validatePassword = require('../utility/validate-password');
const sendMail = require('../services/send-mail');

const router = express.Router();


// /reset
router.post('/forgot-password', (req, res) => {
  const email = req.body.email;
  const type = req.body.type;
  let resBody = {};
  let error = {};
  if(!type) {
    error.msg = 'Invalid Request';
    resBody.status = 'error';
    resBody.error = error;
    return res.status(400).send(resBody);
  }
  const Model = type === 'customer' ? Customer : User;
  Model.findOne({ email })
    .select({ _id: 1 })
    .then(u => {
      if(!u) {
        error.msg = 'User not registered';
        resBody.status = 'error';
        resBody.error = error;
        return res.status(404).send(resBody);
      }
      const resetToken = jwt.sign({ userID: u._id, tokenID: new Date().getTime() }, process.env.JWT_SECRET).toString();
      const resetPass = new ResetPass({ accID: u._id });
      resetPass.save()
        .then(r => {
          sendMail(resetToken, email, type)
            .then(r => {
              resBody.status = 'ok';
              return res.send(resBody);
            })
            .catch(e => {
              error.msg = 'Something went Wrong';
              resBody.error = error;
              resBody.status = 'error';
              return res.status(400).send(resBody);
            })
          });
        })
    .catch(e => {
      error.msg = 'Query error';
      resBody.status = 'error';
      resBody.error = error;
      return res.status(400).send(resBody);
    });
});

router.post('/check/:token', (req, res) => {
  let error = {};
  let resBody = {};
  const token = req.params.token;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) {
      error.msg = 'Invalid Token';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    }
    const decodedResetToken = decoded
    ResetPass.findOne({ accID: decodedResetToken.userID })
      .then(r => {
        if(!r) {
          error.msg = 'Invalid Token';
          resBody.error = error;
          resBody.status = 'error';
          return res.status(404).send(resBody);
        }
        resBody.data = {
          userID: decodedResetToken.userID
        };
        resBody.status = 'ok';
        return res.send(resBody);
      })
      .catch(e => {
        error.msg = 'Query error';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(400).send(resBody);
      });
  });
});

router.patch('/password', (req, res) => {
  const body = _.pick(req.body, ['token', 'password', 'type']);
  let resBody = {};
  let error = {};
  let invalid = false;
  if(!body) {
    invalid = true;
  } else {
    if(!body.token || !body.password || !body.type || !validatePassword(body.password)) invalid = true;
    if(body.type !== 'user' && body.type !== 'customer') invalid = true;
  }
  if(invalid) {
    error.msg = 'Incomplete Data';
    resBody.error = error;
    resBody.status = 'error';
    return res.status(400).send(resBody);
  }
  jwt.verify(body.token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) {
      error.msg = 'Invalid Token';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(400).send(resBody);
    }
    let Model = User;
    if(body.type === 'customer') {
      Model = Customer;
    }
    Model.findById(decoded.userID)
      .then(u => {
        u.set({ password: body.password });
        u.save()
          .then(r => {
            ResetPass.remove({ accID: decoded.userID })
              .then(rs => {
                resBody.status = 'ok';
                return res.send(resBody);
              })
              .catch(e => {
                resBody.status = 'ok';
                return res.send(resBody);
              });
          })
          .catch(e => {
            error.msg = 'Unable to update password';
            resBody.error = error;
            resBody.status = 'error';
            return res.status(400).send(resBody);
          })
      })
      .catch(e => {
        error.msg = 'Invalid User';
        resBody.error = error;
        resBody.status = 'error';
        return res.status(404).send(resBody);
      })
  });
});

module.exports = router;
