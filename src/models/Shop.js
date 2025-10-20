const mongoose = require('mongoose');

const businessHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  closeTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  }
});

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: ['restaurant', 'shop', 'firm', 'grocery', 'pharmacy', 'electronics', 'clothing', 'other']
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  // Contact Information
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    }
  },
  
  // Address
  address: {
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true
    },
    landmark: String,
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'India'
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  
  // Business Documents
  documents: {
    businessLicense: {
      type: String,
      required: [true, 'Business license is required']
    },
    taxId: {
      type: String,
      required: [true, 'Tax ID/GST number is required']
    },
    panCard: String,
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String
    }
  },
  
  // Business Hours
  businessHours: [businessHoursSchema],
  
  // Operational Settings
  settings: {
    isOpen: {
      type: Boolean,
      default: true
    },
    acceptsOrders: {
      type: Boolean,
      default: true
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    freeDeliveryAbove: {
      type: Number,
      default: null
    },
    serviceRadius: {
      type: Number,
      default: 5,
      min: 1,
      max: 50
    },
    preparationTime: {
      type: Number,
      default: 30,
      min: 5
    },
    paymentMethods: [{
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'bank_transfer']
    }]
  },
  
  // Media
  images: {
    logo: String,
    cover: String,
    gallery: [String]
  },
  
  // Verification & Status
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalProducts: {
      type: Number,
      default: 0
    }
  },
  
  // Holiday Calendar
  holidays: [{
    date: {
      type: Date,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    }
  }],
  
  // Special Offers
  offers: [{
    title: String,
    description: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    discountValue: Number,
    minimumOrderAmount: Number,
    validFrom: Date,
    validUntil: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Social Media
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (slug already has unique index from schema)
shopSchema.index({ owner: 1 });
shopSchema.index({ businessType: 1 });
shopSchema.index({ 'address.pincode': 1 });
shopSchema.index({ 'address.coordinates.latitude': 1, 'address.coordinates.longitude': 1 });
shopSchema.index({ 'verification.status': 1 });
shopSchema.index({ isActive: 1 });
shopSchema.index({ isFeatured: 1 });
shopSchema.index({ 'stats.averageRating': -1 });

// Virtual for products
shopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shop'
});

// Virtual for reviews
shopSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'shop'
});

// Generate slug before saving
shopSchema.pre('save', function(next) {
  if (this.isModified('businessName')) {
    this.slug = this.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// Check if shop is currently open
shopSchema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);

  const todayHours = this.businessHours.find(h => h.day === currentDay);

  if (!todayHours || !todayHours.isOpen) {
    return false;
  }

  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
};

// Calculate distance from coordinates
shopSchema.methods.calculateDistance = function(latitude, longitude) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(latitude - this.address.coordinates.latitude);
  const dLon = this.toRadians(longitude - this.address.coordinates.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(this.address.coordinates.latitude)) *
    Math.cos(this.toRadians(latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

shopSchema.methods.toRadians = function(degrees) {
  return degrees * (Math.PI / 180);
};

module.exports = mongoose.model('Shop', shopSchema);