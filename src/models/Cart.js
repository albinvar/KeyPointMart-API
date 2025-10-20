const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  image: String,

  // Track if item is still available
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Stock at time of adding to cart
  availableStock: {
    type: Number,
    default: 0
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  items: [cartItemSchema],

  // Cart totals
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },

  totalItems: {
    type: Number,
    default: 0,
    min: 0
  },

  // Session info
  sessionId: String,

  // Cart expiry
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },

  // Last activity
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto cleanup
cartSchema.index({ 'items.product': 1 });

// Virtual for grouped items by shop
cartSchema.virtual('itemsByShop').get(function() {
  const shopGroups = {};

  this.items.forEach(item => {
    const shopId = item.shop.toString();
    if (!shopGroups[shopId]) {
      shopGroups[shopId] = {
        shop: item.shop,
        items: [],
        subtotal: 0
      };
    }

    shopGroups[shopId].items.push(item);
    shopGroups[shopId].subtotal += item.price * item.quantity;
  });

  return Object.values(shopGroups);
});

// Virtual for total unique products
cartSchema.virtual('uniqueProducts').get(function() {
  return this.items.length;
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  // Calculate subtotal and total items
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  this.totalItems = this.items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  // Update last activity
  this.lastActivity = new Date();

  next();
});

// Static method to get or create cart for user
cartSchema.statics.getCart = async function(userId, sessionId = null) {
  let cart = await this.findOne({ user: userId })
    .populate('items.product', 'name price images stock status isActive')
    .populate('items.shop', 'businessName images.logo isActive');

  if (!cart) {
    cart = await this.create({
      user: userId,
      sessionId,
      items: []
    });
  }

  // Validate items availability
  await cart.validateItems();

  return cart;
};

// Instance method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity = 1, variantId = null) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId).populate('shop');

  if (!product) {
    throw new Error('Product not found');
  }

  if (!product.isActive || product.status !== 'active') {
    throw new Error('Product is not available');
  }

  // Check stock
  if (product.trackQuantity && product.stock < quantity) {
    throw new Error(`Only ${product.stock} items available in stock`);
  }

  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(item =>
    item.product.toString() === productId.toString() &&
    (!variantId || item.variant?.toString() === variantId?.toString())
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = this.items[existingItemIndex].quantity + quantity;

    // Check stock for new quantity
    if (product.trackQuantity && product.stock < newQuantity) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    this.items[existingItemIndex].quantity = newQuantity;
    this.items[existingItemIndex].price = product.price; // Update price to latest
    this.items[existingItemIndex].availableStock = product.stock;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      variant: variantId,
      name: product.name,
      price: product.price,
      quantity,
      shop: product.shop._id,
      image: product.images?.[0] || null,
      isAvailable: true,
      availableStock: product.stock
    });
  }

  return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = async function(productId, quantity, variantId = null) {
  const itemIndex = this.items.findIndex(item =>
    item.product.toString() === productId.toString() &&
    (!variantId || item.variant?.toString() === variantId?.toString())
  );

  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    return this.removeItem(productId, variantId);
  }

  // Validate stock
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);

  if (product.trackQuantity && product.stock < quantity) {
    throw new Error(`Only ${product.stock} items available in stock`);
  }

  this.items[itemIndex].quantity = quantity;
  this.items[itemIndex].availableStock = product.stock;

  return this.save();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = async function(productId, variantId = null) {
  this.items = this.items.filter(item => {
    const productMatch = item.product.toString() !== productId.toString();
    const variantMatch = variantId ? item.variant?.toString() !== variantId?.toString() : true;
    return productMatch || !variantMatch;
  });

  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = async function() {
  this.items = [];
  return this.save();
};

// Instance method to validate items (check availability and stock)
cartSchema.methods.validateItems = async function() {
  const Product = mongoose.model('Product');
  let hasChanges = false;

  for (let i = this.items.length - 1; i >= 0; i--) {
    const item = this.items[i];
    const product = await Product.findById(item.product);

    if (!product || !product.isActive || product.status !== 'active') {
      // Remove unavailable items
      item.isAvailable = false;
      hasChanges = true;
    } else {
      // Update price and stock info
      if (item.price !== product.price) {
        item.price = product.price;
        hasChanges = true;
      }

      item.availableStock = product.stock;

      // Check if quantity exceeds stock
      if (product.trackQuantity && item.quantity > product.stock) {
        if (product.stock > 0) {
          item.quantity = product.stock;
        } else {
          item.isAvailable = false;
        }
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await this.save();
  }

  return hasChanges;
};

// Instance method to get cart summary
cartSchema.methods.getSummary = function() {
  return {
    totalItems: this.totalItems,
    uniqueProducts: this.uniqueProducts,
    subtotal: this.subtotal,
    itemsByShop: this.itemsByShop,
    hasUnavailableItems: this.items.some(item => !item.isAvailable)
  };
};

module.exports = mongoose.model('Cart', cartSchema);
