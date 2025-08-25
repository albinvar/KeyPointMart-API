const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { asyncHandler } = require('./errorHandler');

// Protect routes - check if user is authenticated
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, invalid token',
    });
  }
});

// Check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user is shop owner and owns the shop
const checkShopOwnership = asyncHandler(async (req, res, next) => {
  const shopId = req.params.shopId || req.body.shopId;
  
  if (!shopId) {
    return res.status(400).json({
      status: 'error',
      message: 'Shop ID is required',
    });
  }

  const Shop = require('../models/Shop');
  const shop = await Shop.findById(shopId);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found',
    });
  }

  if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this shop',
    });
  }

  req.shop = shop;
  next();
});

module.exports = {
  protect,
  authorize,
  checkShopOwnership,
};