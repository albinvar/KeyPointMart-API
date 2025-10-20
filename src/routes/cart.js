const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  getCartSummary,
  mergeCart,
  getCartByShop
} = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *           description: Product ID
 *         variant:
 *           type: string
 *           description: Variant ID (optional)
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         quantity:
 *           type: integer
 *         shop:
 *           type: string
 *         image:
 *           type: string
 *         isAvailable:
 *           type: boolean
 *         availableStock:
 *           type: number
 *
 *     Cart:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         subtotal:
 *           type: number
 *         totalItems:
 *           type: number
 *         uniqueProducts:
 *           type: number
 *         lastActivity:
 *           type: string
 *           format: date-time
 *
 *     AddToCartRequest:
 *       type: object
 *       required:
 *         - productId
 *       properties:
 *         productId:
 *           type: string
 *           description: Product ID to add
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         variantId:
 *           type: string
 *           description: Product variant ID (optional)
 *       example:
 *         productId: 507f1f77bcf86cd799439011
 *         quantity: 2
 */

// All cart routes require authentication
router.use(protect);

// Only customers can access cart
router.use(authorize('customer'));

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Clear all items from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Not authorized
 */
router.route('/')
  .get(getCart)
  .delete(clearCart);

/**
 * @swagger
 * /api/cart/summary:
 *   get:
 *     summary: Get cart summary (quick overview)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: number
 *                         uniqueProducts:
 *                           type: number
 *                         subtotal:
 *                           type: number
 *                         hasUnavailableItems:
 *                           type: boolean
 *                         shopCount:
 *                           type: number
 */
router.get('/summary', getCartSummary);

/**
 * @swagger
 * /api/cart/validate:
 *   get:
 *     summary: Validate cart items (check availability and prices)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasChanges:
 *                       type: boolean
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 */
router.get('/validate', validateCart);

/**
 * @swagger
 * /api/cart/by-shop:
 *   get:
 *     summary: Get cart items grouped by shop (for checkout)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items grouped by shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     shops:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shop:
 *                             type: object
 *                           items:
 *                             type: array
 *                           subtotal:
 *                             type: number
 *                           deliveryFee:
 *                             type: number
 *                           total:
 *                             type: number
 *                           meetsMinimumOrder:
 *                             type: boolean
 *                     overallTotal:
 *                       type: number
 *                     overallSubtotal:
 *                       type: number
 *                     totalDeliveryFees:
 *                       type: number
 */
router.get('/by-shop', getCartByShop);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error or product not available
 *       401:
 *         description: Not authorized
 */
router.post('/items', addToCart);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: New quantity (0 to remove item)
 *               variantId:
 *                 type: string
 *                 description: Variant ID if applicable
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Item not found in cart
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: variantId
 *         schema:
 *           type: string
 *         description: Variant ID if applicable
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       404:
 *         description: Item not found in cart
 */
router.route('/items/:productId')
  .put(updateCartItem)
  .delete(removeFromCart);

/**
 * @swagger
 * /api/cart/merge:
 *   post:
 *     summary: Merge guest cart with user cart (after login/signup)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestCartItems
 *             properties:
 *               guestCartItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     variantId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Cart merged successfully
 *       400:
 *         description: Invalid cart items
 */
router.post('/merge', mergeCart);

module.exports = router;
