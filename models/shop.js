const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  shopAddress: [
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
      valid: {
        type: Boolean,
        required: true
      }
    }
  ],
  items: [
    {
      name: { type: String, required: true, trim: true },
      category: { type: String, required: true, trim: true },
      mUnit: { type: String, required: true, trim: true },
      mpValues: [
        {
          mValue: { type: String, required: true, trim: true, default: 1 },
          price: { type: Number, required: true }
        }
      ],
      photo: {
        name: { type: String, required: true },
        type: { type: String, required: true, trim: true}
      },
      description: {
        type: String,
        trim: true
      }
    }
  ],
  shopCategories: [
    {
      category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
      }
    }
  ],
  shopSrchName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 120
  },
  shopPhotos: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true, trim: true}
    }
  ],
  isStatic: {
    type: Boolean,
    required: true,
    default: true
  },
  orders: [
    {
      orderID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    }
  ],
  status: {
    type: Boolean,
    default: true
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  phoneNumber: {
    type: Number,
    minlength: 10,
    maxlength: 10
  },
  socialLinks: [
    {
      link: { type: String, required: true },
      type: { type: String, required: true }
    }
  ],
  description: {
    type: String,
    trim: true
  },
  itemCategories: [
    {
      category: {
        type: String,
        trim: true
      }
    }
  ]
});

ShopSchema.statics.removeOrder = function(shopID, orderID) {
  const Shop = this;
  return Shop.findByIdAndUpdate(shopID, {
    $pull: {
      orders: {
        orderID
      }
    }
  });
}

ShopSchema.statics.editShop = function(body, id) {
  const Shop = this;

  return Shop.findById(id)
    .then((shop) => {
      Object.keys(body).forEach(key => {
        shop[key] = body[key];
      });
      return shop.save();
    })
}

const Shop = mongoose.model('Shop', ShopSchema);

module.exports = Shop;
