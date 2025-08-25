const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderReview,
  getOrderAnalytics,
  reorder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - shop
 *         - items
 *         - delivery
 *         - payment
 *       properties:
 *         shop:
 *           type: string
 *           description: Shop ID
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - product
 *               - quantity
 *             properties:
 *               product:
 *                 type: string
 *                 description: Product ID
 *               variant:
 *                 type: string
 *                 description: Product variant ID (optional)
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to order
 *         delivery:
 *           type: object
 *           required:
 *             - type
 *           properties:
 *             type:
 *               type: string
 *               enum: [pickup, delivery]
 *               default: delivery
 *             address:
 *               type: string
 *               description: Address ID (required if type is delivery)
 *             instructions:
 *               type: string
 *               maxLength: 500
 *               description: Special delivery instructions
 *         payment:
 *           type: object
 *           required:
 *             - method
 *           properties:
 *             method:
 *               type: string
 *               enum: [cash, card, upi, wallet, bank_transfer]
 *         customerNotes:
 *           type: string
 *           maxLength: 500
 *           description: Special notes for the shop
 *       example:
 *         shop: 507f1f77bcf86cd799439011
 *         items:
 *           - product: 507f1f77bcf86cd799439012
 *             quantity: 2
 *           - product: 507f1f77bcf86cd799439013
 *             quantity: 1
 *         delivery:
 *           type: delivery
 *           address: 507f1f77bcf86cd799439014
 *           instructions: Leave at the door
 *         payment:
 *           method: upi
 *         customerNotes: Please prepare fresh
 * 
 *     OrderItem:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *           description: Product ID
 *         variant:
 *           type: string
 *           description: Variant ID
 *         name:
 *           type: string
 *           description: Product name
 *         price:
 *           type: number
 *           description: Product price at time of order
 *         quantity:
 *           type: integer
 *           description: Quantity ordered
 *         total:
 *           type: number
 *           description: Total price for this item
 * 
 *     OrderResponse:
 *       type: object
 *       properties:
 *         orderNumber:
 *           type: string
 *           description: Unique order number
 *         customer:
 *           type: string
 *           description: Customer ID
 *         shop:
 *           type: string
 *           description: Shop ID
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         subtotal:
 *           type: number
 *           description: Subtotal before fees and taxes
 *         deliveryFee:
 *           type: number
 *           description: Delivery fee
 *         tax:
 *           type: number
 *           description: Tax amount
 *         total:
 *           type: number
 *           description: Total order amount
 *         status:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled, refunded]
 *         delivery:
 *           type: object
 *         payment:
 *           type: object
 *         timestamps:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user orders with pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled, refunded]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: number
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OrderResponse'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Create a new order (Customer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                     order:
 *                       $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error or business rule violation
 *       401:
 *         description: Not authorized
 */
router.route('/')
  .get(getOrders)
  .post(authorize('customer'), validate(schemas.order), createOrder);

/**
 * @swagger
 * /api/orders/analytics:
 *   get:
 *     summary: Get order analytics (Shop owner/Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Shop ID (Admin only - shop owners automatically filter by their shop)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, month, year]
 *           default: day
 *         description: Grouping period for analytics
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                     analytics:
 *                       type: array
 *                       description: Time-series analytics data
 *                     overallStats:
 *                       type: object
 *                       description: Overall statistics
 *                     topProducts:
 *                       type: array
 *                       description: Top selling products
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.get('/analytics', authorize('shop_owner', 'admin'), getOrderAnalytics);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
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
 *                     order:
 *                       $ref: '#/components/schemas/OrderResponse'
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to access this order
 */
router.get('/:id', getOrder);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Shop owner/Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, preparing, ready, out_for_delivery, delivered, cancelled]
 *                 description: New order status
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional note about status change
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to update this order
 */
router.put('/:id/status', authorize('shop_owner', 'admin'), updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled at this stage
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to cancel this order
 */
router.put('/:id/cancel', cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/review:
 *   post:
 *     summary: Add order rating and review (Customer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - overall
 *             properties:
 *               overall:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Overall rating (1-5 stars)
 *               delivery:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Delivery rating (1-5 stars)
 *               quality:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Quality rating (1-5 stars)
 *               review:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Written review
 *     responses:
 *       200:
 *         description: Review added successfully
 *       400:
 *         description: Order not delivered or already reviewed
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to review this order
 */
router.post('/:id/review', authorize('customer'), addOrderReview);

/**
 * @swagger
 * /api/orders/{id}/reorder:
 *   post:
 *     summary: Reorder items from a previous order (Customer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Previous order ID to reorder from
 *     responses:
 *       201:
 *         description: Reorder created successfully
 *       400:
 *         description: Previous order items not available or insufficient stock
 *       404:
 *         description: Previous order not found
 *       403:
 *         description: Not authorized to reorder this order
 */
router.post('/:id/reorder', authorize('customer'), reorder);

module.exports = router;