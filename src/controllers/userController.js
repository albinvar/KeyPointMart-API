const User = require('../models/User');
const Address = require('../models/Address');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { role, isActive, search } = req.query;
  
  let query = {};
  
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: {
      users,
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

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken')
    .populate('addresses defaultAddress');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Get additional data based on user role
  let additionalData = {};

  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id });
    if (shop) {
      additionalData.shop = shop;
    }
  }

  if (user.role === 'customer') {
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    additionalData.orderStats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
      ...additionalData
    }
  });
});

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'dateOfBirth', 'gender', 'preferences'];
  const fieldsToUpdate = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fieldsToUpdate[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken');

  if (!updatedUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin or Own Profile
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken')
    .populate('addresses defaultAddress');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Check if user can access this profile
  if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this profile'
    });
  }

  // Get additional data based on user role
  let additionalData = {};

  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id });
    if (shop) {
      additionalData.shop = shop;
    }
  }

  if (user.role === 'customer' || req.user.role === 'admin') {
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    additionalData.orderStats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
      ...additionalData
    }
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Own Profile
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Check if user can update this profile
  if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this profile'
    });
  }

  const allowedFields = ['name', 'dateOfBirth', 'gender', 'preferences'];
  const adminOnlyFields = ['role', 'isActive'];

  const fieldsToUpdate = {};

  // Regular user fields
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fieldsToUpdate[field] = req.body[field];
    }
  });

  // Admin only fields
  if (req.user.role === 'admin') {
    adminOnlyFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken');

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Soft delete - deactivate account
  user.isActive = false;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User account deactivated'
  });
});

// @desc    Upload profile picture
// @route   POST /api/users/upload-avatar
// @access  Private
const uploadProfilePicture = [
  upload.single('profilePicture'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: profilePictureUrl,
        user
      }
    });
  })
];

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ 
    user: req.user.id, 
    isActive: true 
  }).sort({ isDefault: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { addresses }
  });
});

// @desc    Add new address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const addressData = {
    ...req.body,
    user: req.user.id
  };

  const address = await Address.create(addressData);

  // If this is the first address or marked as default, make it default
  if (req.body.isDefault) {
    await User.findByIdAndUpdate(req.user.id, {
      defaultAddress: address._id
    });
  }

  res.status(201).json({
    status: 'success',
    message: 'Address added successfully',
    data: { address }
  });
});

// @desc    Update address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.addressId,
    user: req.user.id
  });

  if (!address) {
    return res.status(404).json({
      status: 'error',
      message: 'Address not found'
    });
  }

  Object.assign(address, req.body);
  await address.save();

  // If marked as default, update user's default address
  if (req.body.isDefault) {
    await User.findByIdAndUpdate(req.user.id, {
      defaultAddress: address._id
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Address updated successfully',
    data: { address }
  });
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.addressId,
    user: req.user.id
  });

  if (!address) {
    return res.status(404).json({
      status: 'error',
      message: 'Address not found'
    });
  }

  // Soft delete
  address.isActive = false;
  await address.save();

  // If this was the default address, clear it
  if (address.isDefault) {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { defaultAddress: 1 }
    });

    // Find another address to set as default
    const nextAddress = await Address.findOne({
      user: req.user.id,
      isActive: true,
      _id: { $ne: address._id }
    }).sort({ createdAt: -1 });

    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
      
      await User.findByIdAndUpdate(req.user.id, {
        defaultAddress: nextAddress._id
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Address deleted successfully'
  });
});

// @desc    Get user order history
// @route   GET /api/users/orders
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const { status } = req.query;
  let query = { customer: req.user.id };
  
  if (status) {
    query.status = status;
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('shop', 'businessName images.logo')
    .populate('items.product', 'name images')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
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

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private/Admin or Own Profile
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Check authorization
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to view these statistics'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  let stats = {};

  if (user.role === 'customer') {
    // Customer statistics
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          totalItemsOrdered: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    const monthlySpending = await Order.aggregate([
      { 
        $match: { 
          customer: user._id,
          status: 'delivered',
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    stats = {
      ...orderStats[0],
      monthlySpending,
      accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))
    };

  } else if (user.role === 'shop_owner') {
    // Shop owner statistics
    const shop = await Shop.findOne({ owner: user._id });
    
    if (shop) {
      const revenueStats = await Order.aggregate([
        { $match: { shop: shop._id, status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$total' }
          }
        }
      ]);

      stats = {
        shop: {
          id: shop._id,
          name: shop.businessName,
          verificationStatus: shop.verification.status
        },
        ...revenueStats[0]
      };
    }
  }

  res.status(200).json({
    status: 'success',
    data: { 
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      },
      stats 
    }
  });
});

module.exports = {
  getUsers,
  getProfile,
  updateProfile,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfilePicture,
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserOrders,
  getUserStats
};