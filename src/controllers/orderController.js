const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Address = require('../models/Address');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendNotification } = require('../utils/notifications');
const { emitToUser, emitToOrder, emitToShop } = require('../config/socket');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Customer
const createOrder = asyncHandler(async (req, res) => {
  const { shop, items, delivery, payment, customerNotes } = req.body;

  // Validate shop exists and is active
  const shopDoc = await Shop.findById(shop);
  if (!shopDoc || !shopDoc.isActive || shopDoc.verification.status !== 'verified') {
    return res.status(400).json({
      status: 'error',
      message: 'Shop is not available for orders'
    });
  }

  // Validate and calculate order items
  let subtotal = 0;
  const orderItems = [];

  for (let item of items) {
    const product = await Product.findById(item.product);
    
    if (!product || !product.isActive || product.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Product ${item.product} is not available`
      });
    }

    if (product.shop.toString() !== shop) {
      return res.status(400).json({
        status: 'error',
        message: 'All products must be from the same shop'
      });
    }

    // Check stock availability
    if (product.trackQuantity && product.stock < item.quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
      });
    }

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      product: product._id,
      variant: item.variant,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      total: itemTotal,
      shop: shopDoc._id
    });
  }

  // Check minimum order amount
  if (subtotal < shopDoc.settings.minimumOrderAmount) {
    return res.status(400).json({
      status: 'error',
      message: `Minimum order amount is ₹${shopDoc.settings.minimumOrderAmount}`
    });
  }

  // Check if orders are paused
  if (shopDoc.settings.pauseOrdersUntil && new Date(shopDoc.settings.pauseOrdersUntil) > new Date()) {
    const pausedUntil = new Date(shopDoc.settings.pauseOrdersUntil).toLocaleString();
    return res.status(400).json({
      status: 'error',
      message: `Shop is temporarily not accepting orders until ${pausedUntil}`
    });
  }

  // Check max active orders limit
  if (shopDoc.settings.maxActiveOrders) {
    const activeOrdersCount = await Order.countDocuments({
      shop: shopDoc._id,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] }
    });

    if (activeOrdersCount >= shopDoc.settings.maxActiveOrders) {
      return res.status(400).json({
        status: 'error',
        message: 'Shop is currently at full capacity. Please try again later.'
      });
    }
  }

  // Check max orders per hour limit
  if (shopDoc.settings.maxOrdersPerHour) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOrdersCount = await Order.countDocuments({
      shop: shopDoc._id,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentOrdersCount >= shopDoc.settings.maxOrdersPerHour) {
      return res.status(400).json({
        status: 'error',
        message: 'Shop has reached its order capacity for this hour. Please try again later.'
      });
    }
  }

  // Calculate fees and total
  let deliveryFee = 0;
  if (delivery.type === 'delivery') {
    deliveryFee = shopDoc.settings.deliveryFee;
    if (shopDoc.settings.freeDeliveryAbove && subtotal >= shopDoc.settings.freeDeliveryAbove) {
      deliveryFee = 0;
    }
  }

  const tax = Math.round(subtotal * 0.05); // 5% tax
  const total = subtotal + deliveryFee + tax;

  // Get delivery address if needed
  let deliveryAddress = null;
  if (delivery.type === 'delivery') {
    const addressDoc = await Address.findById(delivery.address);
    if (!addressDoc || addressDoc.user.toString() !== req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery address'
      });
    }

    deliveryAddress = {
      fullName: addressDoc.fullName,
      phone: addressDoc.phone,
      addressLine1: addressDoc.addressLine1,
      addressLine2: addressDoc.addressLine2,
      landmark: addressDoc.landmark,
      city: addressDoc.city,
      state: addressDoc.state,
      country: addressDoc.country,
      pincode: addressDoc.pincode,
      coordinates: addressDoc.coordinates
    };
  }

  // Create order
  // Auto-accept if enabled
  const initialStatus = shopDoc.settings.autoAcceptOrders ? 'confirmed' : 'pending';

  const orderData = {
    customer: req.user.id,
    shop: shopDoc._id,
    items: orderItems,
    subtotal,
    deliveryFee,
    tax,
    total,
    status: initialStatus,
    delivery: {
      type: delivery.type,
      address: deliveryAddress,
      estimatedTime: shopDoc.settings.preparationTime,
      instructions: delivery.instructions
    },
    payment: {
      method: payment.method,
      status: 'pending'
    },
    customerNotes,
    metadata: {
      source: 'web',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  };

  const order = await Order.create(orderData);

  // Add status history entry
  if (initialStatus === 'confirmed') {
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Order automatically confirmed'
    });
    await order.save();
  }

  // Reserve stock for products
  try {
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (product.trackQuantity) {
        await product.reserveStock(item.quantity);
      }
    }
  } catch (error) {
    // If stock reservation fails, delete the order
    await Order.findByIdAndDelete(order._id);
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }

  // Update shop statistics
  shopDoc.stats.totalOrders += 1;
  await shopDoc.save();

  // Populate the order for response
  const populatedOrder = await Order.findById(order._id)
    .populate('shop', 'businessName contactInfo')
    .populate('customer', 'name phone email');

  // Send notifications
  try {
    // Notify shop owner
    const shopOwner = await User.findById(shopDoc.owner);
    if (shopOwner) {
      await sendNotification({
        type: 'all',
        to: shopOwner.email,
        userId: shopOwner._id,
        subject: `New Order #${order.orderNumber}`,
        message: `You have received a new order worth ₹${total}`,
        template: 'new-order-shop',
        data: {
          orderNumber: order.orderNumber,
          customerName: req.user.name,
          total,
          shopName: shopDoc.businessName
        }
      });
    }

    // Notify customer
    await sendNotification({
      type: 'email',
      to: req.user.email,
      subject: `Order Confirmed - #${order.orderNumber}`,
      template: 'order-confirmation',
      data: {
        orderNumber: order.orderNumber,
        customerName: req.user.name,
        total,
        shopName: shopDoc.businessName,
        estimatedDelivery: `${shopDoc.settings.preparationTime} minutes`
      }
    });
  } catch (error) {
    console.error('Notification sending failed:', error);
  }

  // Emit real-time events
  try {
    // Emit to customer
    emitToUser(req.user.id, 'order:created', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      shop: {
        _id: shopDoc._id,
        businessName: shopDoc.businessName
      },
      timestamp: new Date().toISOString()
    });

    // Emit to shop owner
    if (shopDoc.owner) {
      emitToUser(shopDoc.owner.toString(), 'order:new', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: {
          name: req.user.name
        },
        total: order.total,
        itemsCount: order.items.length,
        timestamp: new Date().toISOString()
      });

      // Emit to shop room
      emitToShop(shopDoc._id.toString(), 'order:new', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Real-time event emission failed:', error);
  }

  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully',
    data: { order: populatedOrder }
  });
});

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
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
    .populate('shop', 'businessName images.logo contactInfo')
    .populate('items.product', 'name images')
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

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('shop', 'businessName description images contactInfo address businessHours')
    .populate('customer', 'name phone email')
    .populate('items.product', 'name images');

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check if user can access this order
  const isCustomer = order.customer._id.toString() === req.user.id;
  const isShopOwner = req.user.role === 'shop_owner' && order.shop.owner?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isShopOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this order'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Update order status (Shop owner/Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Shop Owner/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  
  const order = await Order.findById(req.params.id).populate('shop customer');

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
      message: 'Not authorized to update this order'
    });
  }

  // Validate status transition
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['out_for_delivery', 'delivered'],
    'out_for_delivery': ['delivered'],
    'delivered': [],
    'cancelled': [],
    'refunded': []
  };

  if (!validTransitions[order.status].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot change order status from ${order.status} to ${status}`
    });
  }

  // Update order status
  order.status = status;
  
  // Add to status history
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy: req.user.id
  });

  await order.save();

  // Send notification to customer
  try {
    const statusMessages = {
      'confirmed': 'Your order has been confirmed and is being prepared',
      'preparing': 'Your order is being prepared',
      'ready': 'Your order is ready for pickup/delivery',
      'out_for_delivery': 'Your order is out for delivery',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };

    await sendNotification({
      type: 'all',
      to: order.customer.email,
      userId: order.customer._id,
      subject: `Order Update - #${order.orderNumber}`,
      message: statusMessages[status],
      data: {
        orderNumber: order.orderNumber,
        status: status,
        customerName: order.customer.name,
        shopName: order.shop.businessName
      }
    });
  } catch (error) {
    console.error('Notification sending failed:', error);
  }

  // Emit real-time events for order tracking
  try {
    const statusMessages = {
      'confirmed': 'Your order has been confirmed',
      'preparing': 'Your order is being prepared',
      'ready': 'Your order is ready',
      'out_for_delivery': 'Your order is out for delivery',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };

    // Emit to order-specific room (for real-time tracking page)
    emitToOrder(order._id.toString(), 'order:status_update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: statusMessages[status],
      note: note,
      timestamp: new Date().toISOString(),
      updatedBy: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    });

    // Emit to customer
    emitToUser(order.customer._id.toString(), 'order:updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: statusMessages[status],
      timestamp: new Date().toISOString()
    });

    // Emit to shop room (for shop dashboard)
    emitToShop(order.shop._id.toString(), 'order:status_changed', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Real-time event emission failed:', error);
  }

  res.status(200).json({
    status: 'success',
    message: 'Order status updated successfully',
    data: {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory
      }
    }
  });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const order = await Order.findById(req.params.id)
    .populate('shop', 'businessName owner')
    .populate('customer', 'name email');

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check if user can cancel this order
  const isCustomer = order.customer._id.toString() === req.user.id;
  const isShopOwner = req.user.role === 'shop_owner' && order.shop.owner?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isShopOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to cancel this order'
    });
  }

  // Check if order can be cancelled
  if (!order.canCancel) {
    return res.status(400).json({
      status: 'error',
      message: 'Order cannot be cancelled at this stage'
    });
  }

  // Cancel the order
  await order.cancelOrder(reason, req.user.id);

  // Release reserved stock
  for (let item of order.items) {
    const product = await Product.findById(item.product);
    if (product && product.trackQuantity) {
      await product.releaseStock(item.quantity);
    }
  }

  // Emit real-time events for order cancellation
  try {
    // Emit to order room
    emitToOrder(order._id.toString(), 'order:cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: reason,
      cancelledBy: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });

    // Emit to customer if cancelled by shop
    if (req.user.role !== 'customer') {
      emitToUser(order.customer._id.toString(), 'order:cancelled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: reason,
        message: 'Your order has been cancelled',
        timestamp: new Date().toISOString()
      });
    }

    // Emit to shop if cancelled by customer
    if (req.user.role === 'customer' && order.shop.owner) {
      emitToUser(order.shop.owner.toString(), 'order:cancelled_by_customer', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: reason,
        timestamp: new Date().toISOString()
      });

      emitToShop(order.shop._id.toString(), 'order:cancelled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Real-time event emission failed:', error);
  }

  res.status(200).json({
    status: 'success',
    message: 'Order cancelled successfully',
    data: { order }
  });
});

// @desc    Add order rating and review
// @route   POST /api/orders/:id/review
// @access  Private/Customer
const addOrderReview = asyncHandler(async (req, res) => {
  const { overall, delivery, quality, review } = req.body;
  
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }

  // Check if customer owns this order
  if (order.customer.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to review this order'
    });
  }

  // Check if order is delivered
  if (order.status !== 'delivered') {
    return res.status(400).json({
      status: 'error',
      message: 'Order must be delivered to add review'
    });
  }

  // Check if already reviewed
  if (order.rating.overall) {
    return res.status(400).json({
      status: 'error',
      message: 'Order already reviewed'
    });
  }

  // Add rating and review
  order.rating = {
    overall,
    delivery,
    quality,
    review,
    reviewDate: new Date()
  };

  await order.save();

  res.status(200).json({
    status: 'success',
    message: 'Review added successfully',
    data: { 
      rating: order.rating
    }
  });
});

// @desc    Get order analytics (Shop owner/Admin)
// @route   GET /api/orders/analytics
// @access  Private/Shop Owner/Admin
const getOrderAnalytics = asyncHandler(async (req, res) => {
  const { shopId, startDate, endDate, period = 'day' } = req.query;
  
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

  // Group by period
  let groupBy = {};
  switch (period) {
    case 'hour':
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
      break;
    case 'day':
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'month':
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
    case 'year':
      groupBy = {
        year: { $year: '$createdAt' }
      };
      break;
  }

  const analytics = await Order.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: groupBy,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);

  // Overall statistics
  const overallStats = await Order.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  // Top products
  const topProducts = await Order.aggregate([
    { $match: matchQuery },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      analytics,
      overallStats: overallStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        deliveredOrders: 0,
        cancelledOrders: 0
      },
      topProducts
    }
  });
});

// @desc    Reorder (Create order from previous order)
// @route   POST /api/orders/:id/reorder
// @access  Private/Customer
const reorder = asyncHandler(async (req, res) => {
  const previousOrder = await Order.findById(req.params.id)
    .populate('items.product');

  if (!previousOrder) {
    return res.status(404).json({
      status: 'error',
      message: 'Previous order not found'
    });
  }

  // Check if customer owns this order
  if (previousOrder.customer.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to reorder this order'
    });
  }

  // Check if shop is still active
  const shop = await Shop.findById(previousOrder.shop);
  if (!shop || !shop.isActive || shop.verification.status !== 'verified') {
    return res.status(400).json({
      status: 'error',
      message: 'Shop is no longer available'
    });
  }

  // Prepare order data
  const items = [];
  for (let item of previousOrder.items) {
    const product = await Product.findById(item.product);
    
    if (product && product.isActive && product.status === 'active') {
      // Check stock
      if (product.trackQuantity && product.stock < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }
      
      items.push({
        product: product._id,
        quantity: item.quantity
      });
    }
  }

  if (items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No items from previous order are currently available'
    });
  }

  // Create new order using the same logic as createOrder
  req.body = {
    shop: previousOrder.shop,
    items,
    delivery: {
      type: previousOrder.delivery.type,
      address: previousOrder.delivery.address,
      instructions: previousOrder.delivery.instructions
    },
    payment: {
      method: previousOrder.payment.method
    },
    customerNotes: `Reorder from #${previousOrder.orderNumber}`
  };

  // Call createOrder function
  return createOrder(req, res);
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderReview,
  getOrderAnalytics,
  reorder
};