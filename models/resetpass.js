const mongoose = require('mongoose');

const { expirationTime } = require('../utility/expiration-time');

const ResetPassSchema = new mongoose.Schema({
  accID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  expire_at: {
    type: Date,
    default: Date.now,
    expires: expirationTime/1000
  }
});

const ResetPass = mongoose.model('ResetPass', ResetPassSchema);

module.exports = ResetPass;
