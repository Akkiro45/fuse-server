const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

aws.config.update({
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  accessKeyId: process.env.ACCESS_KEY,
  region: 'us-east-1'
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('only jpeg and png file formates allowed'), false);
  }
}

const upload = multer({
  storage: multerS3({
    s3,
    acl: 'public-read',
    bucket: 'fuse-photos',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + req.cust._id)
    }
  }),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
