const express = require('express');

const {authenticate} = require('../middlewares/customer-authenticate');
const upload = require('../services/img-upload');

const router = express.Router();
const singleUpload = upload.single('image');

router.post('/upload', authenticate, (req, res) => {
  let resBody = {};
  let error = {};
  singleUpload(req, res, (err) => {
    if(err) {
      error.msg = 'Unable to upload!';
      resBody.error = error;
      resBody.status = 'error';
      return res.status(422).send(resBody);
    }
    resBody.status = 'ok';
    resBody.data = {
      name: req.file.key,
      type: req.file.mimetype
    }
    return res.send(resBody);
  });
});

module.exports = router;
