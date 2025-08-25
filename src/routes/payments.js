const express = require('express');
const {
  getPaymentMethods,
  initiatePayment,
  verifyPayment,
  processRefund,
  getPaymentHistory,
  getPaymentAnalytics
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Payment method identifier
 *         name:
 *           type: string
 *           description: Display name
 *         type:
 *           type: string
 *           enum: [cash, online]
 *           description: Payment type
 *         enabled:
 *           type: boolean
 *           description: Whether this method is enabled for the shop
 *         description:
 *           type: string
 *           description: Payment method description
 *         icon:
 *           type: string
 *           description: Icon identifier
 *         gateways:
 *           type: array
 *           items:
 *             type: string
 *           description: Supported payment gateways
 * 
 *     PaymentInitiation:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentMethod
 *       properties:
 *         orderId:
 *           type: string
 *           description: Order ID to pay for
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, upi, wallet, bank_transfer]
 *           description: Selected payment method
 *         gateway:
 *           type: string
 *           enum: [razorpay, stripe, paytm]
 *           default: razorpay
 *           description: Payment gateway for online payments
 * 
 *     PaymentVerification:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentId
 *       properties:
 *         orderId:
 *           type: string
 *           description: Order ID
 *         paymentId:
 *           type: string
 *           description: Payment transaction ID from gateway
 *         signature:
 *           type: string
 *           description: Payment signature (required for Razorpay)
 *         gateway:
 *           type: string
 *           enum: [razorpay, stripe, paytm]
 *           default: razorpay
 *           description: Payment gateway used
 * 
 *     RefundRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - reason
 *       properties:
 *         orderId:
 *           type: string
 *           description: Order ID to refund
 *         amount:
 *           type: number
 *           minimum: 0
 *           description: Refund amount (defaults to full order amount)
 *         reason:
 *           type: string
 *           maxLength: 500
 *           description: Reason for refund
 */

/**
 * @swagger
 * /api/payments/methods/{shopId}:
 *   get:
 *     summary: Get available payment methods for a shop
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
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
 *                     shop:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     paymentMethods:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PaymentMethod'
 *       404:
 *         description: Shop not found
 */
router.get('/methods/:shopId', getPaymentMethods);

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate payment for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiation'
 *     responses:
 *       200:
 *         description: Payment initiated successfully
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
 *                     orderId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     gateway:
 *                       type: string
 *                     total:
 *                       type: number
 *                     requiresOnlinePayment:
 *                       type: boolean
 *                     transactionId:
 *                       type: string
 *                     razorpayOrderId:
 *                       type: string
 *                       description: Razorpay order ID (for Razorpay payments)
 *                     clientSecret:
 *                       type: string
 *                       description: Client secret (for Stripe payments)
 *       400:
 *         description: Invalid order or payment method
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to pay for this order
 */
router.post('/initiate', protect, initiatePayment);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify payment completion
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentVerification'
 *     responses:
 *       200:
 *         description: Payment verified successfully
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
 *                     orderId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                       enum: [paid, failed]
 *                     orderStatus:
 *                       type: string
 *       400:
 *         description: Payment verification failed
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to verify payment for this order
 */
router.post('/verify', protect, verifyPayment);

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Process refund for an order (Shop owner/Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundRequest'
 *     responses:
 *       200:
 *         description: Refund processed successfully
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
 *                     orderId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     refundId:
 *                       type: string
 *                     refundAmount:
 *                       type: number
 *                     paymentStatus:
 *                       type: string
 *                       enum: [refunded, partially_refunded]
 *       400:
 *         description: Invalid refund request or order not eligible
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to process refund for this order
 */
router.post('/refund', protect, authorize('shop_owner', 'admin'), processRefund);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history for current user
 *     tags: [Payments]
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
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded, partially_refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [cash, card, upi, wallet, bank_transfer]
 *         description: Filter by payment method
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           orderNumber:
 *                             type: string
 *                           total:
 *                             type: number
 *                           payment:
 *                             type: object
 *                           shop:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Not authorized
 */
router.get('/history', protect, getPaymentHistory);

/**
 * @swagger
 * /api/payments/analytics:
 *   get:
 *     summary: Get payment analytics (Shop owner/Admin only)
 *     tags: [Payments]
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
 *     responses:
 *       200:
 *         description: Payment analytics retrieved successfully
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
 *                     paymentMethodStats:
 *                       type: array
 *                       description: Statistics by payment method
 *                     paymentStatusStats:
 *                       type: array
 *                       description: Statistics by payment status
 *                     dailyTrends:
 *                       type: array
 *                       description: Daily payment trends
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.get('/analytics', protect, authorize('shop_owner', 'admin'), getPaymentAnalytics);

module.exports = router;