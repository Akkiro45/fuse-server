const express = require('express');

const Session = require('../models/session');

const router = express.Router();

router.get('/:id', (req, res) => {
  const id = req.params.id;
  let body;
  let resBody = {};
  let error = {};
  let token = null;
  Session.findById(id)
    .select({ data: 1 })
    .then(session => {
      if(!session) throw 'Error';
      resBody.status = 'ok';
      body = JSON.parse(session.data);
      if(body.shop) {
        resBody.shop = body.shop;
      }
      resBody.custID = body.custID;
      token = body.token;
      return res.set({
        'Access-Control-Expose-Headers': 'x-auth',
        'x-auth': token
      }).send(resBody);
    })
    .catch(e => {
      error.msg = 'session does not found!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(401).send(resBody);
    });
});
router.get('/user/:id', (req, res) => {
  const id = req.params.id;
  let body;
  let resBody = {};
  let error = {};
  let token = null;
  Session.findById(id)
    .select({ data: 1 })
    .then(session => {
      if(!session) throw 'Error';
      resBody.status = 'ok';
      body = JSON.parse(session.data);
      resBody.address = body.address.filter(ad => ad.valid !== false);
      resBody.userID = body.userID;
      resBody.firstName = body.firstName;
      resBody.lastName = body.lastName;
      resBody.phoneNumber = body.phoneNumber;
      resBody.email = body.email;
      token = body.token;
      return res.set({
        'Access-Control-Expose-Headers': 'x-auth',
        'x-auth': token
      }).send(resBody);
    })
    .catch(e => {
      error.msg = 'session does not found!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(401).send(resBody);
    });
});

module.exports = router;
