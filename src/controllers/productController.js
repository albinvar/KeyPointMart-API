const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Helper function: Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Configure multer for product image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
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

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { 
    search, 
    category, 
    shop,
    minPrice, 
    maxPrice, 
    rating, 
    sort, 
    inStock,
    featured,
    latitude,
    longitude,
    radius = 10 // Default 10km radius
  } = req.query;

  // Build query
  let query = {
    isActive: true,
    status: 'active'
  };

  // Search functionality
  if (search) {
    query.$text = { $search: search };
  }

  // Category filter
  if (category) {
    query.$or = [
      { category: category },
      { subcategories: category }
    ];
  }

  // Shop filter
  if (shop) {
    query.shop = shop;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Rating filter
  if (rating) {
    query['rating.average'] = { $gte: parseFloat(rating) };
  }

  // Stock filter
  if (inStock === 'true') {
    query.stock = { $gt: 0 };
  }

  // Featured filter
  if (featured === 'true') {
    query.isFeatured = true;
  }

  // Location-based filtering with delivery zones support
  let locationFilter = {};
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const userPincode = req.query.pincode; // Optional pincode for zone matching
    const userArea = req.query.area; // Optional area for zone matching

    // Get all active and verified shops
    const allShops = await Shop.find({
      isActive: true,
      'verification.status': 'verified',
      'settings.acceptsOrders': true,
      'settings.isOpen': true
    });

    const availableShops = [];

    for (const shop of allShops) {
      let canDeliver = false;

      // Check delivery zones first (more specific)
      if (shop.deliveryZones && shop.deliveryZones.length > 0) {
        for (const zone of shop.deliveryZones) {
          if (!zone.isActive) continue;

          if (zone.type === 'pincode' && userPincode && zone.value === userPincode) {
            canDeliver = true;
            break;
          } else if (zone.type === 'area' && userArea && zone.value.toLowerCase().includes(userArea.toLowerCase())) {
            canDeliver = true;
            break;
          } else if (zone.type === 'radius' && shop.address?.coordinates?.latitude && shop.address?.coordinates?.longitude) {
            const distance = calculateDistance(
              lat, lon,
              shop.address.coordinates.latitude,
              shop.address.coordinates.longitude
            );
            if (distance <= parseFloat(zone.value)) {
              canDeliver = true;
              break;
            }
          }
        }
      }

      // Fallback to global service radius if no zones or no zone match
      if (!canDeliver && shop.address?.coordinates?.latitude && shop.address?.coordinates?.longitude) {
        const distance = calculateDistance(
          lat, lon,
          shop.address.coordinates.latitude,
          shop.address.coordinates.longitude
        );
        const serviceRadius = shop.settings?.serviceRadius || 5;
        if (distance <= serviceRadius) {
          canDeliver = true;
        }
      }

      if (canDeliver) {
        availableShops.push(shop._id);
      }
    }

    if (availableShops.length > 0) {
      query.shop = { $in: availableShops };
    } else {
      query.shop = { $in: [] }; // No shops can deliver to this location
    }
  }

  // Build sort
  let sortQuery = {};
  if (search) {
    sortQuery = { score: { $meta: 'textScore' } };
  } else {
    switch (sort) {
      case 'price_asc':
        sortQuery.price = 1;
        break;
      case 'price_desc':
        sortQuery.price = -1;
        break;
      case 'rating':
        sortQuery['rating.average'] = -1;
        break;
      case 'newest':
        sortQuery.createdAt = -1;
        break;
      case 'popularity':
        sortQuery['stats.orders'] = -1;
        break;
      case 'name':
        sortQuery.name = 1;
        break;
      default:
        sortQuery.createdAt = -1;
    }
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('shop', 'businessName images.logo verification.status address.city')
    .populate('category', 'name slug')
    .select('-description -attributes -seo')
    .skip(skip)
    .limit(limit)
    .sort(sortQuery);

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

// @desc    Get product by ID or slug
// @route   GET /api/products/:identifier
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  
  // Try to find by ID first, then by slug
  let product = await Product.findById(identifier)
    .populate('shop', 'businessName description images verification address businessHours settings')
    .populate('category', 'name slug')
    .populate('subcategories', 'name slug')
    .populate('relatedProducts', 'name slug price images rating');
  
  if (!product) {
    product = await Product.findOne({ slug: identifier })
      .populate('shop', 'businessName description images verification address businessHours settings')
      .populate('category', 'name slug')
      .populate('subcategories', 'name slug')
      .populate('relatedProducts', 'name slug price images rating');
  }
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  // Increment view count
  product.stats.views += 1;
  product.metadata.totalViews += 1;
  await product.save();

  // Get similar products
  const similarProducts = await Product.find({
    _id: { $ne: product._id },
    $or: [
      { category: product.category._id },
      { subcategories: { $in: product.subcategories.map(sc => sc._id) } },
      { shop: product.shop._id }
    ],
    isActive: true,
    status: 'active'
  })
  .select('name slug price images rating')
  .limit(8)
  .sort({ 'rating.average': -1 });

  res.status(200).json({
    status: 'success',
    data: {
      product,
      similarProducts
    }
  });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Shop Owner
const createProduct = asyncHandler(async (req, res) => {
  // Get shop for the current user
  const shop = await Shop.findOne({ owner: req.user.id });
  
  if (!shop) {
    return res.status(400).json({
      status: 'error',
      message: 'You must have a verified shop to create products'
    });
  }

  if (shop.verification.status !== 'verified') {
    return res.status(400).json({
      status: 'error',
      message: 'Your shop must be verified to create products'
    });
  }

  const productData = {
    ...req.body,
    shop: shop._id
  };

  const product = await Product.create(productData);

  // Update shop's product count
  shop.stats.totalProducts += 1;
  await shop.save();

  const populatedProduct = await Product.findById(product._id)
    .populate('shop', 'businessName')
    .populate('category', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Product created successfully',
    data: { product: populatedProduct }
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Shop Owner
const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id).populate('shop');

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  // Check if user owns this product's shop
  if (product.shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this product'
    });
  }

  product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
  .populate('shop', 'businessName')
  .populate('category', 'name slug');

  res.status(200).json({
    status: 'success',
    message: 'Product updated successfully',
    data: { product }
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Shop Owner
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('shop');

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  // Check if user owns this product's shop
  if (product.shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to delete this product'
    });
  }

  await Product.findByIdAndDelete(req.params.id);

  // Update shop's product count
  const shop = await Shop.findById(product.shop._id);
  shop.stats.totalProducts = Math.max(0, shop.stats.totalProducts - 1);
  await shop.save();

  res.status(200).json({
    status: 'success',
    message: 'Product deleted successfully'
  });
});

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Shop Owner
const uploadProductImages = [
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('shop');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check if user owns this product's shop
    if (product.shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this product'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    
    // Add new images to existing ones
    product.images = [...product.images, ...imageUrls];
    
    // Limit to 10 images max
    if (product.images.length > 10) {
      product.images = product.images.slice(0, 10);
    }

    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: {
        images: imageUrls,
        product: {
          _id: product._id,
          name: product.name,
          images: product.images
        }
      }
    });
  })
];

// @desc    Remove product image
// @route   DELETE /api/products/:id/images
// @access  Private/Shop Owner
const removeProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('shop');

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  // Check if user owns this product's shop
  if (product.shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this product'
    });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide image URL to remove'
    });
  }

  product.images = product.images.filter(img => img !== imageUrl);
  await product.save();

  res.status(200).json({
    status: 'success',
    message: 'Image removed successfully',
    data: {
      images: product.images
    }
  });
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = asyncHandler(async (req, res) => {
  const { q, category, shop, minPrice, maxPrice, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (!q) {
    return res.status(400).json({
      status: 'error',
      message: 'Search query is required'
    });
  }

  let query = {
    $text: { $search: q },
    isActive: true,
    status: 'active'
  };

  // Apply filters
  if (category) {
    query.$or = [
      { category: category },
      { subcategories: category }
    ];
  }

  if (shop) {
    query.shop = shop;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Build sort
  let sortQuery = { score: { $meta: 'textScore' } };
  if (sort === 'price_asc') {
    sortQuery = { price: 1, score: { $meta: 'textScore' } };
  } else if (sort === 'price_desc') {
    sortQuery = { price: -1, score: { $meta: 'textScore' } };
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query, { score: { $meta: 'textScore' } })
    .populate('shop', 'businessName images.logo')
    .populate('category', 'name slug')
    .select('-description -attributes -seo')
    .skip(skip)
    .limit(limit)
    .sort(sortQuery);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      query: q,
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

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 12;

  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    status: 'active'
  })
  .populate('shop', 'businessName images.logo')
  .populate('category', 'name slug')
  .select('-description -attributes -seo')
  .limit(limit)
  .sort({ 'rating.average': -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});

// @desc    Get product recommendations
// @route   GET /api/products/:id/recommendations
// @access  Public
const getProductRecommendations = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  const limit = parseInt(req.query.limit) || 8;

  // Get products from same category, shop, or similar price range
  const recommendations = await Product.find({
    _id: { $ne: product._id },
    $or: [
      { category: product.category },
      { subcategories: { $in: product.subcategories } },
      { shop: product.shop },
      { 
        price: {
          $gte: product.price * 0.7,
          $lte: product.price * 1.3
        }
      }
    ],
    isActive: true,
    status: 'active'
  })
  .populate('shop', 'businessName images.logo')
  .populate('category', 'name slug')
  .select('name slug price images rating discountPercentage')
  .limit(limit)
  .sort({ 'rating.average': -1, 'stats.orders': -1 });

  res.status(200).json({
    status: 'success',
    results: recommendations.length,
    data: { recommendations }
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  removeProductImage,
  searchProducts,
  getFeaturedProducts,
  getProductRecommendations
};