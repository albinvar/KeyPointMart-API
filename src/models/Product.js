const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  images: [String],
  isActive: {
    type: Boolean,
    default: true
  }
});

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  
  // Shop reference
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  
  // Categories
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  
  // Inventory
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  trackQuantity: {
    type: Boolean,
    default: true
  },
  
  // Product variants
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [variantSchema],
  
  // Media
  images: {
    type: [String],
    validate: [arr => arr.length <= 10, 'Cannot have more than 10 images']
  },
  videos: [String],
  
  // Physical attributes
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: {
      type: Number,
      min: 0
    },
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    }
  },
  
  // Status and visibility
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'out_of_stock'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // SEO
  seo: {
    title: {
      type: String,
      maxlength: [60, 'SEO title cannot exceed 60 characters']
    },
    description: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters']
    },
    keywords: [String]
  },
  
  // Custom attributes
  attributes: [attributeSchema],
  
  // Reviews and ratings
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  
  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    orders: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  
  // Tags
  tags: [String],
  
  // Shipping
  shipping: {
    required: {
      type: Boolean,
      default: true
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    freeShipping: {
      type: Boolean,
      default: false
    }
  },
  
  // Availability
  availability: {
    inStock: {
      type: Boolean,
      default: true
    },
    availableFrom: Date,
    availableUntil: Date,
    preOrder: {
      type: Boolean,
      default: false
    },
    preOrderDate: Date
  },
  
  // Related products
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // Metadata
  metadata: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ shop: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ isActive: 1, status: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.isActive && 
         this.status === 'active' && 
         (this.stock > 0 || !this.trackQuantity) &&
         this.availability.inStock;
});

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product'
});

// Generate slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// Update availability based on stock
productSchema.pre('save', function(next) {
  if (this.trackQuantity && this.stock === 0) {
    this.status = 'out_of_stock';
    this.availability.inStock = false;
  } else if (this.status === 'out_of_stock' && this.stock > 0) {
    this.status = 'active';
    this.availability.inStock = true;
  }
  next();
});

// Static method to get products by category
productSchema.statics.getByCategory = function(categoryId, options = {}) {
  const query = {
    $or: [
      { category: categoryId },
      { subcategories: categoryId }
    ],
    isActive: true,
    status: 'active'
  };
  
  return this.find(query, null, options);
};

// Instance method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  if (!this.trackQuantity) return true;
  return this.stock >= quantity;
};

// Instance method to reserve stock
productSchema.methods.reserveStock = function(quantity) {
  if (this.trackQuantity && this.stock >= quantity) {
    this.stock -= quantity;
    return this.save();
  }
  throw new Error('Insufficient stock');
};

// Instance method to release stock
productSchema.methods.releaseStock = function(quantity) {
  if (this.trackQuantity) {
    this.stock += quantity;
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Product', productSchema);