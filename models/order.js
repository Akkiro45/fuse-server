const mongoose = require('mongoose');

const OrderSchama = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  shopID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  shopName: {
    type: String
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  status: [
    {
      type: {
        type: Number,
        required: true
      },
      timeStamp: {
        type: String,
        required: true
      }
    }
  ],
  cartUpdate: {
    type: String,
    default: -1
  },
  totalCost: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  addressID: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true
  },
  items: [
    {
      name: { type: String, required: true, trim: true },
      category: { type: String, required: true, trim: true },
      mUnit: { type: String, required: true, trim: true },
      mValue: { type: String, required: true, trim: true, default: 1 },
      price: { type: String, required: true, trim: true },
      photo: {
          name: { type: String, required: true },
          type: { type: String, required: true }
      },
      quantity: {
        type: Number,
        required: true
      },
      description: {
        type: String,
        trim: true
      }
    }
  ],
  userMsg: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  custAcceptMsg: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  custRejectMsg: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  deliveryTime: {
    from: {
      type: String
    },
    to: {
      type: String
    }
  },
  expirationTime: { // Number of mileseconds
    type: Number,
    default: 0
  }
});

// OrderSchama.post('update', function() {
//   let order = this;
//   const o = order.getUpdate().$push;
//   const o1 = order.getUpdate().$set;
//   if(o.status.type === 2) {
//     console.log('Order arrived.');
//   }
//   if(o.status.type === 3) {
//     console.log('Order cancelled because ', o1.userMsg);
//   }
// });

const Order = mongoose.model('Order', OrderSchama);

module.exports = Order;
