const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendEmail, sendSMS } = require('../utils/notifications');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, businessName, businessType, dateOfBirth, gender } = req.body;

  // Check if user already exists
  let existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User with this email or phone already exists'
    });
  }

  // Create user
  const userData = {
    name,
    email,
    phone,
    password,
    role,
    dateOfBirth,
    gender,
    metadata: {
      registrationSource: 'web',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  };

  const user = await User.create(userData);

  // If shop owner, create shop
  let shop = null;
  if (role === 'shop_owner') {
    const shopData = {
      owner: user._id,
      businessName,
      businessType,
      contactInfo: {
        phone,
        email
      },
      // Default address - will be updated later
      address: {
        addressLine1: 'To be updated',
        city: 'To be updated',
        state: 'To be updated',
        country: 'India',
        pincode: '000000'
      },
      documents: {
        businessLicense: 'pending',
        taxId: 'pending'
      }
    };

    shop = await Shop.create(shopData);
  }

  // Generate verification tokens
  const emailToken = crypto.randomBytes(32).toString('hex');
  const phoneToken = Math.floor(100000 + Math.random() * 900000).toString();

  user.emailVerificationToken = emailToken;
  user.phoneVerificationToken = phoneToken;
  await user.save();

  // Send verification emails/SMS (in production)
  try {
    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        to: email,
        subject: 'Verify Your KeyPointMart Account',
        template: 'email-verification',
        data: { name, token: emailToken }
      });

      await sendSMS({
        to: phone,
        message: `Your KeyPointMart verification code is: ${phoneToken}`
      });
    }
  } catch (error) {
    console.log('Notification sending failed:', error.message);
  }

  // Generate JWT token
  const token = user.getSignedJwtToken();

  const response = {
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    }
  };

  if (shop) {
    response.data.shop = {
      id: shop._id,
      businessName: shop.businessName,
      businessType: shop.businessType,
      verificationStatus: shop.verification.status
    };
  }

  res.status(201).json(response);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { login, password } = req.body;

  // Find user by email or phone
  const user = await User.findOne({
    $or: [
      { email: login },
      { phone: login }
    ]
  }).select('+password');

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check if account is locked
  if (user.isAccountLocked) {
    return res.status(423).json({
      status: 'error',
      message: 'Account temporarily locked due to too many failed login attempts'
    });
  }

  // Check password
  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    await user.incLoginAttempts();
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  // Reset login attempts and update last login
  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Get shop info if shop owner
  let shopInfo = null;
  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id }).select('_id businessName verification');
    if (shop) {
      shopInfo = {
        id: shop._id,
        businessName: shop.businessName,
        verificationStatus: shop.verification.status
      };
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin
      },
      shop: shopInfo,
      token
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('addresses defaultAddress');

  let shopInfo = null;
  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id });
    if (shop) {
      shopInfo = shop;
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
      shop: shopInfo
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, dateOfBirth, gender, preferences } = req.body;

  const fieldsToUpdate = {};
  if (name) fieldsToUpdate.name = name;
  if (dateOfBirth) fieldsToUpdate.dateOfBirth = dateOfBirth;
  if (gender) fieldsToUpdate.gender = gender;
  if (preferences) fieldsToUpdate.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user }
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  const isCurrentPasswordValid = await user.matchPassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Current password is incorrect'
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with this email'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  await user.save();

  // Send reset email (in production)
  try {
    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        to: email,
        subject: 'Password Reset - KeyPointMart',
        template: 'password-reset',
        data: { name: user.name, resetToken }
      });
    }
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(500).json({
      status: 'error',
      message: 'Email could not be sent'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Password reset email sent',
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired reset token'
    });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const jwtToken = user.getSignedJwtToken();

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful',
    data: { token: jwtToken }
  });
});

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({ emailVerificationToken: token });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification token'
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

// @desc    Verify phone
// @route   POST /api/auth/verify-phone
// @access  Public
const verifyPhone = asyncHandler(async (req, res) => {
  const { phone, token } = req.body;

  const user = await User.findOne({ 
    phone, 
    phoneVerificationToken: token 
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification token'
    });
  }

  user.isPhoneVerified = true;
  user.phoneVerificationToken = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Phone verified successfully'
  });
});

// @desc    Resend verification
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = asyncHandler(async (req, res) => {
  const { type } = req.body; // 'email' or 'phone'
  const user = req.user;

  if (type === 'email') {
    if (user.isEmailVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already verified'
      });
    }

    const emailToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailToken;
    await user.save();

    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your KeyPointMart Account',
        template: 'email-verification',
        data: { name: user.name, token: emailToken }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent',
      ...(process.env.NODE_ENV === 'development' && { token: emailToken })
    });
  } else if (type === 'phone') {
    if (user.isPhoneVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone is already verified'
      });
    }

    const phoneToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneVerificationToken = phoneToken;
    await user.save();

    if (process.env.NODE_ENV === 'production') {
      await sendSMS({
        to: user.phone,
        message: `Your KeyPointMart verification code is: ${phoneToken}`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Verification SMS sent',
      ...(process.env.NODE_ENV === 'development' && { token: phoneToken })
    });
  } else {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification type'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a real app, you might want to blacklist the token
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// @desc    Send OTP for login
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number is required'
    });
  }

  // Find user by phone
  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with this phone number'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  // Generate OTP - hardcoded as "1234" for development
  const otp = '1234';

  // Store OTP with 5 minute expiry
  user.loginOtp = otp;
  user.loginOtpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
  await user.save();

  // In production, send OTP via SMS
  try {
    if (process.env.NODE_ENV === 'production') {
      await sendSMS({
        to: phone,
        message: `Your KeyPointMart login OTP is: ${otp}. Valid for 5 minutes.`
      });
    }
  } catch (error) {
    console.log('SMS sending failed:', error.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'OTP sent successfully',
    data: {
      phone,
      expiresIn: '5 minutes',
      // Only show OTP in development mode
      ...(process.env.NODE_ENV === 'development' && { otp })
    }
  });
});

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number and OTP are required'
    });
  }

  // Find user by phone and valid OTP
  const user = await User.findOne({
    phone,
    loginOtp: otp,
    loginOtpExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired OTP'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is deactivated'
    });
  }

  // Clear OTP after successful verification
  user.loginOtp = undefined;
  user.loginOtpExpire = undefined;

  // Mark phone as verified if not already
  if (!user.isPhoneVerified) {
    user.isPhoneVerified = true;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Get shop info if shop owner
  let shopInfo = null;
  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id }).select('_id businessName verification');
    if (shop) {
      shopInfo = {
        id: shop._id,
        businessName: shop.businessName,
        verificationStatus: shop.verification.status
      };
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin
      },
      shop: shopInfo,
      token
    }
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyPhone,
  resendVerification,
  logout,
  sendOtp,
  verifyOtp
};