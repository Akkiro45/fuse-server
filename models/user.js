const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { expirationTime } = require('../utility/expiration-time');

const UserSchema = new mongoose.Schema({
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
  orders: [
    {
      orderID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    }
  ],
  address: [
    {
      country: {
        type: String,
        default: 'India'
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      pincode: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 6
      },
      landmark: {
        type: String,
        trim: true
      },
      streetAdd: {
        type: String,
        trim: true,
        required: true
      },
      latitude: {
        type: String,
        required: true
      },
      longitude: {
        type: String,
        required: true
      },
      fullName: {
        type: String
      },
      phoneNumber: {
        type: Number,
        minlength: 10,
        maxlength: 10
      },
      valid: {
        type: Boolean,
        required: true
      }
    }
  ]
});

UserSchema.methods.generateAuthToken = function() {
  const user = this;
  const access = 'Auth';
  const currTimeStamp = new Date().getTime();
  const expTimeStamp = new Date(currTimeStamp + expirationTime).getTime();
  const token = jwt.sign({ _id: user._id.toHexString(), access, expTimeStamp }, process.env.JWT_SECRET).toString();
  let tokens = [...user.tokens];
  tokens.forEach(tok => {
    if(parseInt(tok.expTimeStamp) <= currTimeStamp) {
      tokens = tokens.filter(t => t._id !== tok._id);
    }
  });
  if(tokens.length < 10) {
    tokens = tokens.concat([{ access, token, expTimeStamp }]);
    user.tokens = tokens;
    return user.save().then(() => token);
  } else {
    return false;
  }
}

UserSchema.methods.removeToken = function(token) {
  const user = this;
  return user.update({
    $pull: {
      tokens: {
        token
      }
    }
  });
}

UserSchema.methods.addAddress = function(address) {
  const user = this;
  user.address = user.address.concat([address]);
  return user.save();
}
UserSchema.methods.removeAddress = function(addressID) {
  const user = this;
  let address = [...user.address];
  for(let i=0; i<address.length; i++) {
    if(address[i]._id.toHexString() === addressID) {
      address[i].valid = false;
      break;
    }
  }
  user.address = address;
  return user.save();
}

UserSchema.statics.removeOrder = function(userID, orderID) {
  const User = this;
  return User.findByIdAndUpdate(userID, {
    $pull: {
      orders: {
        orderID
      }
    }
  });
}

UserSchema.statics.getData = function(orders) {
  let User = this;
  let promises = orders.map(order => {
    return User.findById(order.userID)
            .select({ firstName: 1, lastName: 1, phoneNumber: 1, address: { $elemMatch: { _id: order.addressID } } });
  })
  return Promise.all(promises);
}

UserSchema.statics.changePassword = function(id, newPassword, oldPassword) {
  let User = this;
  return User.findById(id)
  .then((user) => {
    if(!user) return Promise.reject({ msg: 'User does not exist' });
    return new Promise((resolve, reject) => {
      bcrypt.compare(oldPassword, user.password, (err, res) => {
        if(res) {
          user.set({ password: newPassword });
          user.save()
            .then(() => resolve())
            .catch(() => reject({ msg:'unable to save' }))
        }
        else reject({ msg: 'oldPassword is not correct.' });
      });
    });
  });
}

UserSchema.statics.findByCredentials = function(param, password, byEmail) {
  const User = this;
  let key = 'phoneNumber';
  if(byEmail) {
    key = 'email'
  }
  return User.findOne({ [key]: param })
    .then((user) => {
      if(!user) return Promise.reject();
      return new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password, (err, res) => {
          if(res) resolve(user);
          else reject();
        });
      });
    });
}

UserSchema.statics.findByToken = function(token) {
  const User = this;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch(e) {
    return Promise.reject('Unable to verify!');
  }
  return User.findOne({
    _id: decoded._id,
    'tokens.token': token,
    'tokens.access': 'Auth'
  });
}

UserSchema.pre('save', function(next) {
  let user = this;
  if(user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
