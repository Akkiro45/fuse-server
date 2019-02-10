const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { expirationTime } = require('../utility/expiration-time');

const CustomerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
    minlength: 2,
    maxlength: 60
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
    minlength: 2,
    maxlength: 120
  },
  phoneNumber: {
    type: Number,
    required: true,
    minlength: 10,
    maxlength: 10,
    unique: true
  },
  email: {
    type: String,
    trim: true,
    minlength: 2,
    unique: true,
    sparse: true,
    validate: {
      validator: validator.isEmail,
      meessage: '{VALUE} is not a valid email.'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  createdAt: {
    type: Number,
    required: true
  },
  tokens: [
    {
      access: {
        type: String,
        required: true
      },
      token: {
        type: String,
        required: true
      },
      expTimeStamp: {
        type: String,
        required: true
      }
    }
  ],
  shops: [
    {
      shopID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    }
  ]
});

CustomerSchema.methods.generateAuthToken = function() {
  const cust = this;
  const access = 'Auth';
  const currTimeStamp = new Date().getTime();
  const expTimeStamp = new Date(currTimeStamp + expirationTime).getTime();
  const token = jwt.sign({ _id: cust._id.toHexString(), access, expTimeStamp }, process.env.JWT_SECRET).toString();
  let tokens = [...cust.tokens];
  tokens.forEach(tok => {
    if(parseInt(tok.expTimeStamp) <= currTimeStamp) {
      tokens = tokens.filter(t => t._id !== tok._id);
    }
  });
  if(tokens.length < 11) {
    tokens = tokens.concat([{ access, token, expTimeStamp }]);
    cust.tokens = tokens;
    return cust.save().then(() => token);
  } else {
    return false;
  }
}

CustomerSchema.methods.removeToken = function(token) {
  const cust = this;
  return cust.update({
    $pull: {
      tokens: {
        token
      }
    }
  });
}

CustomerSchema.statics.changePassword = function(id, newPassword, oldPassword) {
  let Customer = this;
  return Customer.findById(id)
  .then((cust) => {
    if(!cust) return Promise.reject({ msg: 'Customer does not exist' });
    return new Promise((resolve, reject) => {
      bcrypt.compare(oldPassword, cust.password, (err, res) => {
        if(res) {
          cust.set({ password: newPassword });
          cust.save()
            .then(() => resolve())
            .catch(() => reject({ msg:'unable to save' }))
        }
        else reject({ msg: 'oldPassword is not correct.' });
      });
    });
  });
}

CustomerSchema.statics.findByCredentials = function(param, password, byEmail) {
  const Customer = this;
  let key = 'phoneNumber';
  if(byEmail) {
    key = 'email'
  }
  return Customer.findOne({ [key]: param })
    .then((cust) => {
      if(!cust) return Promise.reject();
      return new Promise((resolve, reject) => {
        bcrypt.compare(password, cust.password, (err, res) => {
          if(res) resolve(cust);
          else reject();
        });
      });
    });
}

CustomerSchema.statics.findByToken = function(token) {
  const Customer = this;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch(e) {
    return Promise.reject('Unable to verify!');
  }
  return Customer.findOne({
    _id: decoded._id,
    'tokens.token': token,
    'tokens.access': 'Auth'
  });
}

CustomerSchema.statics.addShopId = function(custID, shopID) {
  const Customer = this;
  return Customer.findById(custID)
    .then(cust => {
      cust.shops = {
        shopID
      }
      cust.save();
    })
}

CustomerSchema.pre('save', function(next) {
  let cust = this;
  if(cust.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(cust.password, salt, (err, hash) => {
        cust.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer;
