const express = require('express');
const cloudinary = require('cloudinary');

const {authenticate} = require('../middlewares/customer-authenticate');
const upload = require('../services/img-upload-cd');

const router = express.Router();
const singleUpload = upload.single('image');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CD_API_KEY,
  api_secret: process.env.CD_API_SECRET
});

router.post('/upload', authenticate, (req, res) => {
  let resBody = {};
  let error = {
    msg: 'Unable to upload!'
  };
  singleUpload(req, res, (err) => {
    if(err) {
      resBody.error = error;
      resBody.status = 'error';
      return res.status(422).send(resBody);
    }
    // Here CD
    cloudinary.v2.uploader.upload(req.file.path)
      .then(r => {
        resBody.status = 'ok';
        resBody.data = {
          name: r.public_id,
          type: req.file.mimetype
        }
        return res.send(resBody);
      })
      .catch(e => {
        resBody.error = error;
        resBody.status = 'error';
        return res.status(422).send(resBody);
      })
  });
});

module.exports = router;
