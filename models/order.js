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
    type: mongoose.Schema.Types.ObjectId
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
  deliveryTime: {
    from: {
      type: String
    },
    to: {
      type: String
    }
  },
  allowCancelOrder: {
    type: Boolean,
    default: false
  }
});


const Order = mongoose.model('Order', OrderSchama);

module.exports = Order;
