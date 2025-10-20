const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.getCart(req.user.id);

  await cart.populate([
    { path: 'items.product', select: 'name price images stock status isActive comparePrice discountPercentage' },
    { path: 'items.shop', select: 'businessName images.logo isActive' }
  ]);

  const summary = cart.getSummary();

  res.status(200).json({
    status: 'success',
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        ...summary,
        lastActivity: cart.lastActivity,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    }
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variantId } = req.body;

  if (!productId) {
    return res.status(400).json({
      status: 'error',
      message: 'Product ID is required'
    });
  }

  if (quantity < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Quantity must be at least 1'
    });
  }

  const cart = await Cart.getCart(req.user.id);

  try {
    await cart.addItem(productId, quantity, variantId);

    await cart.populate([
      { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
      { path: 'items.shop', select: 'businessName images.logo isActive' }
    ]);

    const summary = cart.getSummary();

    res.status(200).json({
      status: 'success',
      message: 'Item added to cart successfully',
      data: {
        cart: {
          _id: cart._id,
          items: cart.items,
          ...summary
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity, variantId } = req.body;

  if (!quantity || quantity < 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid quantity is required'
    });
  }

  const cart = await Cart.getCart(req.user.id);

  try {
    await cart.updateItemQuantity(productId, quantity, variantId);

    await cart.populate([
      { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
      { path: 'items.shop', select: 'businessName images.logo isActive' }
    ]);

    const summary = cart.getSummary();

    res.status(200).json({
      status: 'success',
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated successfully',
      data: {
        cart: {
          _id: cart._id,
          items: cart.items,
          ...summary
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { variantId } = req.query;

  const cart = await Cart.getCart(req.user.id);

  await cart.removeItem(productId, variantId);

  await cart.populate([
    { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
    { path: 'items.shop', select: 'businessName images.logo isActive' }
  ]);

  const summary = cart.getSummary();

  res.status(200).json({
    status: 'success',
    message: 'Item removed from cart successfully',
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        ...summary
      }
    }
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.getCart(req.user.id);

  await cart.clearCart();

  res.status(200).json({
    status: 'success',
    message: 'Cart cleared successfully',
    data: {
      cart: {
        _id: cart._id,
        items: [],
        totalItems: 0,
        subtotal: 0,
        uniqueProducts: 0
      }
    }
  });
});

// @desc    Validate cart items (check availability and prices)
// @route   GET /api/cart/validate
// @access  Private
const validateCart = asyncHandler(async (req, res) => {
  const cart = await Cart.getCart(req.user.id);

  const hasChanges = await cart.validateItems();

  await cart.populate([
    { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
    { path: 'items.shop', select: 'businessName images.logo isActive' }
  ]);

  const summary = cart.getSummary();

  res.status(200).json({
    status: 'success',
    message: hasChanges ? 'Cart has been updated due to availability or price changes' : 'Cart is valid',
    data: {
      hasChanges,
      cart: {
        _id: cart._id,
        items: cart.items,
        ...summary
      }
    }
  });
});

// @desc    Get cart summary (quick overview)
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = asyncHandler(async (req, res) => {
  const cart = await Cart.getCart(req.user.id);

  const summary = cart.getSummary();

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalItems: summary.totalItems,
        uniqueProducts: summary.uniqueProducts,
        subtotal: summary.subtotal,
        hasUnavailableItems: summary.hasUnavailableItems,
        shopCount: summary.itemsByShop.length
      }
    }
  });
});

// @desc    Merge guest cart with user cart (for login/signup)
// @route   POST /api/cart/merge
// @access  Private
const mergeCart = asyncHandler(async (req, res) => {
  const { guestCartItems } = req.body;

  if (!guestCartItems || !Array.isArray(guestCartItems)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid cart items'
    });
  }

  const cart = await Cart.getCart(req.user.id);

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of guestCartItems) {
    try {
      await cart.addItem(item.productId, item.quantity, item.variantId);
      addedCount++;
    } catch (error) {
      console.log(`Skipped item ${item.productId}: ${error.message}`);
      skippedCount++;
    }
  }

  await cart.populate([
    { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
    { path: 'items.shop', select: 'businessName images.logo isActive' }
  ]);

  const summary = cart.getSummary();

  res.status(200).json({
    status: 'success',
    message: `Cart merged successfully. ${addedCount} items added, ${skippedCount} items skipped`,
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        ...summary
      },
      merged: {
        addedCount,
        skippedCount
      }
    }
  });
});

// @desc    Get items grouped by shop (for checkout)
// @route   GET /api/cart/by-shop
// @access  Private
const getCartByShop = asyncHandler(async (req, res) => {
  const cart = await Cart.getCart(req.user.id);

  await cart.populate([
    { path: 'items.product', select: 'name price images stock status isActive comparePrice' },
    { path: 'items.shop', select: 'businessName images.logo isActive settings.deliveryFee settings.minimumOrderAmount settings.freeDeliveryAbove' }
  ]);

  const itemsByShop = cart.itemsByShop;

  // Enhance with delivery info
  const enhancedShops = itemsByShop.map(shopGroup => {
    const shop = cart.items.find(item => item.shop._id.toString() === shopGroup.shop.toString())?.shop;

    const deliveryFee = shop?.settings?.deliveryFee || 0;
    const minimumOrder = shop?.settings?.minimumOrderAmount || 0;
    const freeDeliveryAbove = shop?.settings?.freeDeliveryAbove;

    const finalDeliveryFee = freeDeliveryAbove && shopGroup.subtotal >= freeDeliveryAbove ? 0 : deliveryFee;

    return {
      shop: {
        _id: shop?._id,
        businessName: shop?.businessName,
        logo: shop?.images?.logo,
        isActive: shop?.isActive
      },
      items: shopGroup.items,
      subtotal: shopGroup.subtotal,
      deliveryFee: finalDeliveryFee,
      total: shopGroup.subtotal + finalDeliveryFee,
      meetsMinimumOrder: shopGroup.subtotal >= minimumOrder,
      minimumOrderAmount: minimumOrder,
      freeDeliveryAbove
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      shops: enhancedShops,
      overallTotal: enhancedShops.reduce((sum, shop) => sum + shop.total, 0),
      overallSubtotal: cart.subtotal,
      totalDeliveryFees: enhancedShops.reduce((sum, shop) => sum + shop.deliveryFee, 0)
    }
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  getCartSummary,
  mergeCart,
  getCartByShop
};
