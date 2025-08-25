const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto');

// Mock payment gateway configurations
const PAYMENT_GATEWAYS = {
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_123456789',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_123456789'
  },
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_123456789',
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_123456789'
  },
  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID || 'TEST_MERCHANT',
    merchantKey: process.env.PAYTM_MERCHANT_KEY || 'TEST_KEY'
  }
};

// @desc    Get payment methods for a shop
// @route   GET /api/payments/methods/:shopId
// @access  Public
const getPaymentMethods = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).select('settings.paymentMethods businessName');

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash on Delivery',
      type: 'cash',
      enabled: shop.settings.paymentMethods.includes('cash'),
      description: 'Pay with cash when order is delivered',
      icon: 'cash'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      type: 'online',
      enabled: shop.settings.paymentMethods.includes('card'),
      description: 'Pay securely with your card',
      icon: 'card',
      gateways: ['razorpay', 'stripe']
    },
    {
      id: 'upi',
      name: 'UPI Payment',
      type: 'online',
      enabled: shop.settings.paymentMethods.includes('upi'),
      description: 'Pay with Google Pay, PhonePe, Paytm UPI',
      icon: 'upi',
      gateways: ['razorpay', 'paytm']
    },
    {
      id: 'wallet',
      name: 'Digital Wallets',
      type: 'online',
      enabled: shop.settings.paymentMethods.includes('wallet'),
      description: 'Pay with Paytm, Amazon Pay, etc.',
      icon: 'wallet',
      gateways: ['razorpay', 'paytm']
    },
    {
      id: 'bank_transfer',
      name: 'Net Banking',
      type: 'online',
      enabled: shop.settings.paymentMethods.includes('bank_transfer'),
      description: 'Pay directly from your bank account',
      icon: 'bank',
      gateways: ['razorpay', 'stripe']
    }
  ].filter(method => method.enabled);

  res.status(200).json({
    status: 'success',
    data: {
      shop: {
        id: shop._id,
        name: shop.businessName
      },
      paymentMethods
    }
  });
});

// @desc    Initiate payment for order
// @route   POST /api/payments/initiate
// @access  Private
const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId, paymentMethod, gateway = 'razorpay' } = req.body;

  // Validate order
  const order = await Order.findById(orderId).populate('shop', 'businessName settings');

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check if user owns this order
  if (order.customer.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to pay for this order'
    });
  }

  // Check if payment is already completed
  if (order.payment.status === 'paid') {
    return res.status(400).json({
      status: 'error',
      message: 'Payment already completed for this order'
    });
  }

  // Check if order is still valid for payment
  if (!['pending', 'confirmed'].includes(order.status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Order is not in a valid state for payment'
    });
  }

  // Check if shop accepts this payment method
  if (!order.shop.settings.paymentMethods.includes(paymentMethod)) {
    return res.status(400).json({
      status: 'error',
      message: 'Payment method not accepted by this shop'
    });
  }

  // Handle cash payment
  if (paymentMethod === 'cash') {
    order.payment.method = 'cash';
    order.payment.status = 'pending';
    await order.save();

    return res.status(200).json({
      status: 'success',
      message: 'Cash on delivery selected',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMethod: 'cash',
        total: order.total,
        requiresOnlinePayment: false
      }
    });
  }

  // Handle online payments
  let paymentData = {};

  switch (gateway) {
    case 'razorpay':
      paymentData = await createRazorpayPayment(order, req.user);
      break;
    case 'stripe':
      paymentData = await createStripePayment(order, req.user);
      break;
    case 'paytm':
      paymentData = await createPaytmPayment(order, req.user);
      break;
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported payment gateway'
      });
  }

  // Update order with payment details
  order.payment.method = paymentMethod;
  order.payment.transactionId = paymentData.transactionId;
  order.payment.status = 'pending';
  await order.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment initiated successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod,
      gateway,
      total: order.total,
      requiresOnlinePayment: true,
      ...paymentData
    }
  });
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, gateway = 'razorpay' } = req.body;

  // Validate order
  const order = await Order.findById(orderId).populate('shop customer');

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check if user owns this order
  if (order.customer._id.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to verify payment for this order'
    });
  }

  let verificationResult = false;

  switch (gateway) {
    case 'razorpay':
      verificationResult = verifyRazorpayPayment(order, paymentId, signature);
      break;
    case 'stripe':
      verificationResult = await verifyStripePayment(order, paymentId);
      break;
    case 'paytm':
      verificationResult = await verifyPaytmPayment(order, paymentId);
      break;
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported payment gateway'
      });
  }

  if (verificationResult) {
    // Payment successful
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.payment.transactionId = paymentId;
    
    // Auto-confirm order if it's still pending
    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.timestamps.confirmedAt = new Date();
    }
    
    await order.save();

    // Update shop revenue
    const shop = await Shop.findById(order.shop._id);
    shop.stats.totalRevenue += order.total;
    await shop.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: 'paid',
        orderStatus: order.status
      }
    });
  } else {
    // Payment failed
    order.payment.status = 'failed';
    await order.save();

    res.status(400).json({
      status: 'error',
      message: 'Payment verification failed',
      data: {
        orderId: order._id,
        paymentStatus: 'failed'
      }
    });
  }
});

// @desc    Process refund
// @route   POST /api/payments/refund
// @access  Private/Shop Owner/Admin
const processRefund = asyncHandler(async (req, res) => {
  const { orderId, amount, reason } = req.body;

  const order = await Order.findById(orderId).populate('shop customer');

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check authorization
  const isShopOwner = req.user.role === 'shop_owner' && order.shop.owner?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isShopOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to process refund for this order'
    });
  }

  // Validate refund conditions
  if (order.payment.status !== 'paid') {
    return res.status(400).json({
      status: 'error',
      message: 'Order payment is not completed'
    });
  }

  if (order.status !== 'cancelled' && order.status !== 'delivered') {
    return res.status(400).json({
      status: 'error',
      message: 'Order must be cancelled or delivered to process refund'
    });
  }

  const refundAmount = amount || order.total;

  if (refundAmount > order.total) {
    return res.status(400).json({
      status: 'error',
      message: 'Refund amount cannot exceed order total'
    });
  }

  if (refundAmount <= order.payment.refundAmount) {
    return res.status(400).json({
      status: 'error',
      message: 'Refund amount already processed'
    });
  }

  // Process refund (mock implementation)
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Update order
  order.payment.refundAmount = refundAmount;
  order.payment.status = refundAmount >= order.total ? 'refunded' : 'partially_refunded';
  order.payment.refundedAt = new Date();
  
  if (order.status !== 'cancelled') {
    order.status = 'refunded';
    order.timestamps.refundedAt = new Date();
  }

  // Add to cancellation info
  order.cancellation = {
    ...order.cancellation,
    refundAmount,
    refundId,
    refundReason: reason
  };

  await order.save();

  res.status(200).json({
    status: 'success',
    message: 'Refund processed successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      refundId,
      refundAmount,
      paymentStatus: order.payment.status
    }
  });
});

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { status, method, startDate, endDate } = req.query;

  let query = { customer: req.user.id };

  // Add payment status filter
  if (status) {
    query['payment.status'] = status;
  }

  // Add payment method filter
  if (method) {
    query['payment.method'] = method;
  }

  // Add date range filter
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const total = await Order.countDocuments(query);
  const payments = await Order.find(query)
    .populate('shop', 'businessName images.logo')
    .select('orderNumber total payment createdAt shop')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments,
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

// @desc    Get payment analytics (Shop owner/Admin)
// @route   GET /api/payments/analytics
// @access  Private/Shop Owner/Admin
const getPaymentAnalytics = asyncHandler(async (req, res) => {
  const { shopId, startDate, endDate } = req.query;

  let matchQuery = {};

  // If shop owner, filter by their shop
  if (req.user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(400).json({
        status: 'error',
        message: 'Shop not found'
      });
    }
    matchQuery.shop = shop._id;
  } else if (shopId) {
    matchQuery.shop = shopId;
  }

  // Date range filter
  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Payment method analytics
  const paymentMethodStats = await Order.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$payment.method',
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        paidOrders: {
          $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
        },
        paidAmount: {
          $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, '$total', 0] }
        }
      }
    }
  ]);

  // Payment status analytics
  const paymentStatusStats = await Order.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$payment.status',
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$total' }
      }
    }
  ]);

  // Daily payment trends
  const dailyTrends = await Order.aggregate([
    { $match: { ...matchQuery, 'payment.status': 'paid' } },
    {
      $group: {
        _id: {
          year: { $year: '$payment.paidAt' },
          month: { $month: '$payment.paidAt' },
          day: { $dayOfMonth: '$payment.paidAt' }
        },
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$total' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      paymentMethodStats,
      paymentStatusStats,
      dailyTrends
    }
  });
});

// Helper functions for payment gateways

const createRazorpayPayment = async (order, user) => {
  // Mock Razorpay payment creation
  return {
    transactionId: `rzp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    razorpayOrderId: `order_${Date.now()}`,
    amount: order.total * 100, // Razorpay expects amount in paisa
    currency: 'INR',
    key: PAYMENT_GATEWAYS.razorpay.keyId,
    name: order.shop.businessName,
    description: `Payment for order #${order.orderNumber}`,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone
    }
  };
};

const createStripePayment = async (order, user) => {
  // Mock Stripe payment creation
  return {
    transactionId: `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36)}`,
    publishableKey: PAYMENT_GATEWAYS.stripe.publishableKey,
    amount: order.total * 100, // Stripe expects amount in cents
    currency: 'inr'
  };
};

const createPaytmPayment = async (order, user) => {
  // Mock Paytm payment creation
  return {
    transactionId: `paytm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    merchantId: PAYMENT_GATEWAYS.paytm.merchantId,
    orderId: order.orderNumber,
    amount: order.total,
    customerInfo: {
      custId: user._id,
      mobile: user.phone,
      email: user.email
    }
  };
};

const verifyRazorpayPayment = (order, paymentId, signature) => {
  // Mock Razorpay signature verification
  const expectedSignature = crypto
    .createHmac('sha256', PAYMENT_GATEWAYS.razorpay.keySecret)
    .update(`${order.payment.transactionId}|${paymentId}`)
    .digest('hex');

  return signature === expectedSignature;
};

const verifyStripePayment = async (order, paymentId) => {
  // Mock Stripe payment verification
  // In real implementation, you would call Stripe API to verify payment
  return paymentId && paymentId.startsWith('pi_');
};

const verifyPaytmPayment = async (order, paymentId) => {
  // Mock Paytm payment verification
  // In real implementation, you would call Paytm API to verify payment
  return paymentId && paymentId.startsWith('paytm_');
};

module.exports = {
  getPaymentMethods,
  initiatePayment,
  verifyPayment,
  processRefund,
  getPaymentHistory,
  getPaymentAnalytics
};