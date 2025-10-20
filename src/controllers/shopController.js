const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for shop image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'logo' ? 'logos' : 
                  file.fieldname === 'cover' ? 'covers' : 'gallery';
    cb(null, `uploads/shops/${folder}/`);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getShops = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { 
    search, 
    businessType, 
    verified, 
    isOpen,
    featured,
    latitude,
    longitude,
    radius = 10
  } = req.query;

  let query = {
    isActive: true
  };

  // Search functionality
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Business type filter
  if (businessType) {
    query.businessType = businessType;
  }

  // Verification filter
  if (verified !== undefined) {
    query['verification.status'] = verified === 'true' ? 'verified' : { $ne: 'verified' };
  }

  // Featured filter
  if (featured === 'true') {
    query.isFeatured = true;
  }

  // Location-based filtering
  if (latitude && longitude) {
    query['address.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
      }
    };
  }

  const total = await Shop.countDocuments(query);
  const shops = await Shop.find(query)
    .populate('owner', 'name email phone')
    .populate('categories', 'name slug')
    .select('-documents -bankDetails')
    .skip(skip)
    .limit(limit)
    .sort({ isFeatured: -1, 'stats.averageRating': -1, createdAt: -1 });

  // Add distance and open status for each shop
  const shopsWithDetails = shops.map(shop => {
    const shopObj = shop.toObject();
    
    // Calculate distance if coordinates provided
    if (latitude && longitude && shop.address.coordinates) {
      shopObj.distance = shop.calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude)
      );
    }
    
    // Add current open status
    shopObj.isCurrentlyOpen = shop.isCurrentlyOpen();
    
    return shopObj;
  });

  res.status(200).json({
    status: 'success',
    results: shops.length,
    data: {
      shops: shopsWithDetails,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// @desc    Get shop by ID or slug
// @route   GET /api/shops/:identifier
// @access  Public
const getShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let shop = await Shop.findById(id)
    .populate('owner', 'name email phone createdAt')
    .populate('categories', 'name slug');

  if (!shop) {
    shop = await Shop.findOne({ slug: id })
      .populate('owner', 'name email phone createdAt')
      .populate('categories', 'name slug');
  }
  
  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Get shop's products
  const products = await Product.find({
    shop: shop._id,
    isActive: true,
    status: 'active'
  })
  .select('name slug price images rating stock isFeatured')
  .sort({ isFeatured: -1, 'rating.average': -1 })
  .limit(12);

  // Get shop reviews (if review system is implemented)
  // const reviews = await Review.find({ shop: shop._id }).populate('customer', 'name').limit(10);

  const shopData = {
    ...shop.toObject(),
    isCurrentlyOpen: shop.isCurrentlyOpen(),
    products,
    // reviews
  };

  // Remove sensitive data for public view
  if (req.user?.id !== shop.owner._id.toString() && req.user?.role !== 'admin') {
    delete shopData.documents;
    delete shopData.bankDetails;
  }

  res.status(200).json({
    status: 'success',
    data: { shop: shopData }
  });
});

// @desc    Create shop
// @route   POST /api/shops
// @access  Private/Shop Owner
const createShop = asyncHandler(async (req, res) => {
  // Check if user already has a shop
  const existingShop = await Shop.findOne({ owner: req.user.id });
  
  if (existingShop) {
    return res.status(400).json({
      status: 'error',
      message: 'You already have a shop registered'
    });
  }

  const shopData = {
    ...req.body,
    owner: req.user.id
  };

  const shop = await Shop.create(shopData);

  res.status(201).json({
    status: 'success',
    message: 'Shop created successfully. It will be reviewed for verification.',
    data: { shop }
  });
});

// @desc    Update shop
// @route   PUT /api/shops/:id
// @access  Private/Shop Owner or Admin
const updateShop = asyncHandler(async (req, res) => {
  let shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Check if user owns this shop or is admin
  if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this shop'
    });
  }

  // Prevent non-admin users from updating verification status
  if (req.user.role !== 'admin') {
    delete req.body.verification;
    delete req.body.isActive;
    delete req.body.isFeatured;
  }

  shop = await Shop.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('owner', 'name email phone');

  res.status(200).json({
    status: 'success',
    message: 'Shop updated successfully',
    data: { shop }
  });
});

// @desc    Delete shop
// @route   DELETE /api/shops/:id
// @access  Private/Admin
const deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Soft delete - deactivate shop
  shop.isActive = false;
  await shop.save();

  res.status(200).json({
    status: 'success',
    message: 'Shop deactivated successfully'
  });
});

// @desc    Get shop dashboard data
// @route   GET /api/shops/:id/dashboard
// @access  Private/Shop Owner
const getShopDashboard = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Check ownership
  if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this dashboard'
    });
  }

  // Get dashboard statistics
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Today's statistics
  const todayStats = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        createdAt: { $gte: startOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        }
      }
    }
  ]);

  // Weekly statistics
  const weeklyStats = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        createdAt: { $gte: startOfWeek }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' }
      }
    }
  ]);

  // Monthly statistics
  const monthlyStats = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' }
      }
    }
  ]);

  // Recent orders
  const recentOrders = await Order.find({ shop: shop._id })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .limit(10);

  // Low stock products
  const lowStockProducts = await Product.find({
    shop: shop._id,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    isActive: true
  }).limit(10);

  // Top selling products
  const topProducts = await Product.find({
    shop: shop._id,
    isActive: true
  })
  .sort({ 'stats.orders': -1 })
  .limit(5);

  const dashboardData = {
    shop: {
      _id: shop._id,
      businessName: shop.businessName,
      verification: shop.verification,
      stats: shop.stats
    },
    statistics: {
      today: todayStats[0] || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, confirmedOrders: 0 },
      thisWeek: weeklyStats[0] || { totalOrders: 0, totalRevenue: 0 },
      thisMonth: monthlyStats[0] || { totalOrders: 0, totalRevenue: 0 }
    },
    recentOrders,
    lowStockProducts,
    topProducts
  };

  res.status(200).json({
    status: 'success',
    data: dashboardData
  });
});

// @desc    Get shop orders
// @route   GET /api/shops/:id/orders
// @access  Private/Shop Owner
const getShopOrders = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Check ownership
  if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access these orders'
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { status, startDate, endDate } = req.query;
  
  let query = { shop: shop._id };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('customer', 'name phone email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// @desc    Get shop products
// @route   GET /api/shops/:id/products
// @access  Private/Shop Owner
const getShopProducts = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  // Check ownership for private access
  const isOwner = req.user && (shop.owner.toString() === req.user.id || req.user.role === 'admin');
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { status, category, search } = req.query;
  
  let query = { shop: shop._id };
  
  // Public access only shows active products
  if (!isOwner) {
    query.isActive = true;
    query.status = 'active';
  }
  
  if (status && isOwner) {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// @desc    Upload shop images
// @route   POST /api/shops/:id/upload
// @access  Private/Shop Owner
const uploadShopImages = [
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]),
  asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        status: 'error',
        message: 'Shop not found'
      });
    }

    // Check ownership
    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this shop'
      });
    }

    const uploadedImages = {};

    if (req.files.logo) {
      uploadedImages.logo = `/uploads/shops/logos/${req.files.logo[0].filename}`;
      shop.images.logo = uploadedImages.logo;
    }

    if (req.files.cover) {
      uploadedImages.cover = `/uploads/shops/covers/${req.files.cover[0].filename}`;
      shop.images.cover = uploadedImages.cover;
    }

    if (req.files.gallery) {
      const galleryImages = req.files.gallery.map(file => `/uploads/shops/gallery/${file.filename}`);
      uploadedImages.gallery = galleryImages;
      shop.images.gallery = [...shop.images.gallery, ...galleryImages].slice(0, 10); // Max 10 images
    }

    await shop.save();

    res.status(200).json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: {
        uploadedImages,
        shop: {
          _id: shop._id,
          businessName: shop.businessName,
          images: shop.images
        }
      }
    });
  })
];

// @desc    Verify shop (Admin only)
// @route   PUT /api/shops/:id/verify
// @access  Private/Admin
const verifyShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  const { status, rejectionReason } = req.body;

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification status'
    });
  }

  shop.verification.status = status;
  shop.verification.verifiedBy = req.user.id;
  shop.verification.verifiedAt = new Date();

  if (status === 'rejected') {
    shop.verification.rejectionReason = rejectionReason || 'Documents not verified';
  }

  await shop.save();

  res.status(200).json({
    status: 'success',
    message: `Shop ${status} successfully`,
    data: { shop }
  });
});

// @desc    Get nearby shops
// @route   GET /api/shops/nearby
// @access  Public
const getNearbyShops = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10, limit = 20 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude are required'
    });
  }

  const shops = await Shop.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseFloat(radius) * 1000
      }
    },
    isActive: true,
    'verification.status': 'verified'
  })
  .select('businessName description images address businessType stats settings')
  .limit(parseInt(limit));

  // Add distance for each shop
  const shopsWithDistance = shops.map(shop => {
    const shopObj = shop.toObject();
    shopObj.distance = shop.calculateDistance(
      parseFloat(latitude), 
      parseFloat(longitude)
    );
    shopObj.isCurrentlyOpen = shop.isCurrentlyOpen();
    return shopObj;
  });

  res.status(200).json({
    status: 'success',
    results: shops.length,
    data: { shops: shopsWithDistance }
  });
});

module.exports = {
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  getShopDashboard,
  getShopOrders,
  getShopProducts,
  uploadShopImages,
  verifyShop,
  getNearbyShops
};