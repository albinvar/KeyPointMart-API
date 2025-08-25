const Joi = require('joi');

// User validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required'
  }),
  role: Joi.string().valid('customer', 'shop_owner').default('customer'),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  // Shop owner specific fields
  businessName: Joi.when('role', {
    is: 'shop_owner',
    then: Joi.string().min(2).max(200).required(),
    otherwise: Joi.optional()
  }),
  businessType: Joi.when('role', {
    is: 'shop_owner',
    then: Joi.string().valid('restaurant', 'shop', 'firm', 'grocery', 'pharmacy', 'electronics', 'clothing', 'other').required(),
    otherwise: Joi.optional()
  })
});

const loginSchema = Joi.object({
  login: Joi.string().required().messages({
    'any.required': 'Email or phone number is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required'
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'string.max': 'New password cannot exceed 128 characters',
    'any.required': 'New password is required'
  })
});

// Product validation schemas
const productSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  shortDescription: Joi.string().max(500).optional(),
  category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  subcategories: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  price: Joi.number().min(0).required(),
  comparePrice: Joi.number().min(0).optional(),
  costPrice: Joi.number().min(0).optional(),
  sku: Joi.string().max(100).optional(),
  stock: Joi.number().min(0).required(),
  lowStockThreshold: Joi.number().min(0).default(5),
  trackQuantity: Joi.boolean().default(true),
  weight: Joi.number().min(0).optional(),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0)
  }).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false)
});

// Category validation schema
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  parent: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  sortOrder: Joi.number().default(0)
});

// Shop validation schema
const shopSchema = Joi.object({
  businessName: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  businessType: Joi.string().valid('restaurant', 'shop', 'firm', 'grocery', 'pharmacy', 'electronics', 'clothing', 'other').required(),
  categories: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  contactInfo: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional()
  }).required(),
  address: Joi.object({
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().optional(),
    landmark: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().default('India'),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }).optional()
  }).required(),
  documents: Joi.object({
    businessLicense: Joi.string().required(),
    taxId: Joi.string().required(),
    panCard: Joi.string().optional()
  }).required()
});

// Address validation schema
const addressSchema = Joi.object({
  type: Joi.string().valid('home', 'office', 'other').default('home'),
  nickname: Joi.string().max(50).optional(),
  fullName: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  addressLine1: Joi.string().min(5).max(200).required(),
  addressLine2: Joi.string().max(200).optional(),
  landmark: Joi.string().max(100).optional(),
  city: Joi.string().min(2).max(50).required(),
  state: Joi.string().min(2).max(50).required(),
  country: Joi.string().default('India'),
  pincode: Joi.string().pattern(/^\d{6}$/).required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }).optional(),
  isDefault: Joi.boolean().default(false),
  deliveryInstructions: Joi.string().max(500).optional()
});

// Order validation schema
const orderSchema = Joi.object({
  shop: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  items: Joi.array().items(Joi.object({
    product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    variant: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    quantity: Joi.number().min(1).required()
  })).min(1).required(),
  delivery: Joi.object({
    type: Joi.string().valid('pickup', 'delivery').default('delivery'),
    address: Joi.when('type', {
      is: 'delivery',
      then: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      otherwise: Joi.optional()
    }),
    instructions: Joi.string().max(500).optional()
  }).required(),
  payment: Joi.object({
    method: Joi.string().valid('cash', 'card', 'upi', 'wallet', 'bank_transfer').required()
  }).required(),
  customerNotes: Joi.string().max(500).optional()
});

// Review validation schema
const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().max(200).optional(),
  comment: Joi.string().min(10).max(1000).required(),
  product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  shop: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  order: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    changePassword: changePasswordSchema,
    product: productSchema,
    category: categorySchema,
    shop: shopSchema,
    address: addressSchema,
    order: orderSchema,
    review: reviewSchema
  }
};