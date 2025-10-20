const express = require('express');
const {
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  getShopDashboard,
  getShopOrders,
  getShopProducts,
  uploadShopImages,
  verifyShop,
  getNearbyShops,
  updateBasicInfo,
  updateContactInfo,
  updateAddress,
  updateBusinessHours,
  updateSettings,
  updateBankDetails
} = require('../controllers/shopController');
const { protect, authorize, checkShopOwnership } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Shop:
 *       type: object
 *       required:
 *         - businessName
 *         - businessType
 *         - contactInfo
 *         - address
 *         - documents
 *       properties:
 *         businessName:
 *           type: string
 *           maxLength: 200
 *           description: Business name
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Business description
 *         businessType:
 *           type: string
 *           enum: [restaurant, shop, firm, grocery, pharmacy, electronics, clothing, other]
 *           description: Type of business
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Category IDs
 *         contactInfo:
 *           type: object
 *           required:
 *             - phone
 *           properties:
 *             phone:
 *               type: string
 *               description: Business phone number
 *             email:
 *               type: string
 *               format: email
 *               description: Business email
 *             website:
 *               type: string
 *               format: uri
 *               description: Business website
 *         address:
 *           type: object
 *           required:
 *             - addressLine1
 *             - city
 *             - state
 *             - pincode
 *           properties:
 *             addressLine1:
 *               type: string
 *               description: Address line 1
 *             addressLine2:
 *               type: string
 *               description: Address line 2
 *             landmark:
 *               type: string
 *               description: Nearby landmark
 *             city:
 *               type: string
 *               description: City
 *             state:
 *               type: string
 *               description: State
 *             country:
 *               type: string
 *               default: India
 *               description: Country
 *             pincode:
 *               type: string
 *               pattern: '^\\d{6}$'
 *               description: PIN code
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   minimum: -90
 *                   maximum: 90
 *                 longitude:
 *                   type: number
 *                   minimum: -180
 *                   maximum: 180
 *         documents:
 *           type: object
 *           required:
 *             - businessLicense
 *             - taxId
 *           properties:
 *             businessLicense:
 *               type: string
 *               description: Business license document
 *             taxId:
 *               type: string
 *               description: Tax ID/GST number
 *             panCard:
 *               type: string
 *               description: PAN card number
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               isOpen:
 *                 type: boolean
 *               openTime:
 *                 type: string
 *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               closeTime:
 *                 type: string
 *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *       example:
 *         businessName: KeyPoint Electronics Store
 *         description: Leading electronics retailer with latest gadgets
 *         businessType: electronics
 *         contactInfo:
 *           phone: '+919876543210'
 *           email: info@keypointelectronics.com
 *           website: 'https://keypointelectronics.com'
 *         address:
 *           addressLine1: '123 Electronic Market'
 *           addressLine2: 'Near Metro Station'
 *           landmark: City Mall
 *           city: Mumbai
 *           state: Maharashtra
 *           country: India
 *           pincode: '400001'
 *         documents:
 *           businessLicense: 'BL123456789'
 *           taxId: '27ABCDE1234F1Z5'
 */

/**
 * @swagger
 * /api/shops:
 *   get:
 *     summary: Get all shops with filtering
 *     tags: [Shops]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in business name and description
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [restaurant, shop, firm, grocery, pharmacy, electronics, clothing, other]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: User's latitude for location-based filtering
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: User's longitude for location-based filtering
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
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
 *                     shops:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Shop'
 *                     pagination:
 *                       type: object
 *   post:
 *     summary: Create a new shop (Shop owners only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Shop'
 *     responses:
 *       201:
 *         description: Shop created successfully
 *       400:
 *         description: Validation error or user already has a shop
 *       401:
 *         description: Not authorized
 */
router.route('/')
  .get(getShops)
  .post(protect, authorize('shop_owner', 'admin'), validate(schemas.shop), createShop);

/**
 * @swagger
 * /api/shops/nearby:
 *   get:
 *     summary: Get nearby shops
 *     tags: [Shops]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of shops to return
 *     responses:
 *       200:
 *         description: Nearby shops retrieved successfully
 *       400:
 *         description: Latitude and longitude are required
 */
router.get('/nearby', getNearbyShops);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     summary: Get shop by ID
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID or slug
 *     responses:
 *       200:
 *         description: Shop retrieved successfully
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
 *                       $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Shop not found
 *   put:
 *     summary: Update shop (Shop owner or admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Shop'
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Not authorized to update this shop
 *   delete:
 *     summary: Deactivate shop (Admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deactivated successfully
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Access forbidden
 */
router.route('/:id')
  .get(getShop)
  .put(protect, updateShop)
  .delete(protect, authorize('admin'), deleteShop);

/**
 * @swagger
 * /api/shops/{id}/dashboard:
 *   get:
 *     summary: Get shop dashboard data (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         today:
 *                           type: object
 *                         thisWeek:
 *                           type: object
 *                         thisMonth:
 *                           type: object
 *                     recentOrders:
 *                       type: array
 *                     lowStockProducts:
 *                       type: array
 *                     topProducts:
 *                       type: array
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Not authorized to access this dashboard
 */
router.get('/:id/dashboard', protect, getShopDashboard);

/**
 * @swagger
 * /api/shops/{id}/orders:
 *   get:
 *     summary: Get shop orders (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled, refunded]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Shop orders retrieved successfully
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Not authorized to access these orders
 */
router.get('/:id/orders', protect, getShopOrders);

/**
 * @swagger
 * /api/shops/{id}/products:
 *   get:
 *     summary: Get shop products
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, inactive, out_of_stock]
 *         description: Filter by product status (shop owner only)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name and description
 *     responses:
 *       200:
 *         description: Shop products retrieved successfully
 *       404:
 *         description: Shop not found
 */
router.get('/:id/products', getShopProducts);

/**
 * @swagger
 * /api/shops/{id}/upload:
 *   post:
 *     summary: Upload shop images (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Shop logo image
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Shop cover image
 *               gallery:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Gallery images (max 10)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: No files uploaded or invalid file type
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Not authorized to update this shop
 */
router.post('/:id/upload', protect, uploadShopImages);

/**
 * @swagger
 * /api/shops/{id}/verify:
 *   put:
 *     summary: Verify shop (Admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
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
 *                 enum: [verified, rejected]
 *               rejectionReason:
 *                 type: string
 *                 description: Required if status is 'rejected'
 *     responses:
 *       200:
 *         description: Shop verification status updated successfully
 *       400:
 *         description: Invalid verification status
 *       404:
 *         description: Shop not found
 *       403:
 *         description: Access forbidden
 */
router.put('/:id/verify', protect, authorize('admin'), verifyShop);

/**
 * @swagger
 * /api/shops/{id}/basic-info:
 *   put:
 *     summary: Update shop basic information (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               businessType:
 *                 type: string
 *                 enum: [restaurant, shop, firm, grocery, pharmacy, electronics, clothing, other]
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Basic information updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/basic-info', protect, updateBasicInfo);

/**
 * @swagger
 * /api/shops/{id}/contact:
 *   put:
 *     summary: Update shop contact information (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               website:
 *                 type: string
 *                 format: uri
 *               whatsapp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact information updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/contact', protect, updateContactInfo);

/**
 * @swagger
 * /api/shops/{id}/address:
 *   put:
 *     summary: Update shop address (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               landmark:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               pincode:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/address', protect, updateAddress);

/**
 * @swagger
 * /api/shops/{id}/business-hours:
 *   put:
 *     summary: Update shop business hours (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessHours:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     isOpen:
 *                       type: boolean
 *                     openTime:
 *                       type: string
 *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     closeTime:
 *                       type: string
 *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *     responses:
 *       200:
 *         description: Business hours updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/business-hours', protect, updateBusinessHours);

/**
 * @swagger
 * /api/shops/{id}/settings:
 *   put:
 *     summary: Update shop settings (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryFee:
 *                 type: number
 *                 minimum: 0
 *               freeDeliveryAbove:
 *                 type: number
 *                 minimum: 0
 *               isOpen:
 *                 type: boolean
 *               acceptsOrders:
 *                 type: boolean
 *               minimumOrderAmount:
 *                 type: number
 *                 minimum: 0
 *               paymentMethods:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cash, card, upi, wallet, bank_transfer]
 *               serviceRadius:
 *                 type: number
 *                 minimum: 0
 *               preparationTime:
 *                 type: number
 *                 minimum: 0
 *               requiresApproval:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/settings', protect, updateSettings);

/**
 * @swagger
 * /api/shops/{id}/bank-details:
 *   put:
 *     summary: Update shop bank details (Shop owner only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountHolderName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bank details updated successfully
 *       403:
 *         description: Not authorized to update this shop
 *       404:
 *         description: Shop not found
 */
router.put('/:id/bank-details', protect, updateBankDetails);

module.exports = router;