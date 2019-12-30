const multer = require('multer');

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('only jpeg and png file formates allowed'), false);
  }
}

const upload = multer({
  storage: multer.diskStorage({
    filename: (req, file, cb) => {
      cb(null, Date.now().toString() + req.cust._id)
    }
  }),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
