const express = require('express');
const {
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
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required:
 *         - fullName
 *         - phone
 *         - addressLine1
 *         - city
 *         - state
 *         - pincode
 *       properties:
 *         type:
 *           type: string
 *           enum: [home, office, other]
 *           default: home
 *         nickname:
 *           type: string
 *           maxLength: 50
 *         fullName:
 *           type: string
 *           maxLength: 100
 *         phone:
 *           type: string
 *         addressLine1:
 *           type: string
 *           maxLength: 200
 *         addressLine2:
 *           type: string
 *           maxLength: 200
 *         landmark:
 *           type: string
 *           maxLength: 100
 *         city:
 *           type: string
 *           maxLength: 50
 *         state:
 *           type: string
 *           maxLength: 50
 *         country:
 *           type: string
 *           default: India
 *         pincode:
 *           type: string
 *           pattern: '^\\d{6}$'
 *         coordinates:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *               minimum: -90
 *               maximum: 90
 *             longitude:
 *               type: number
 *               minimum: -180
 *               maximum: 180
 *         isDefault:
 *           type: boolean
 *           default: false
 *         deliveryInstructions:
 *           type: string
 *           maxLength: 500
 *       example:
 *         type: home
 *         nickname: My Home
 *         fullName: John Doe
 *         phone: '+919876543210'
 *         addressLine1: '123 Main Street'
 *         addressLine2: 'Apartment 4B'
 *         landmark: Near City Mall
 *         city: Mumbai
 *         state: Maharashtra
 *         country: India
 *         pincode: '400001'
 *         isDefault: true
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, shop_owner, admin, delivery_partner]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.get('/', authorize('admin'), getUsers);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Get current user's addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
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
 *                     addresses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Address'
 *   post:
 *     summary: Add new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Validation error
 */
router.route('/addresses')
  .get(getUserAddresses)
  .post(validate(schemas.address), addAddress);

/**
 * @swagger
 * /api/users/addresses/{addressId}:
 *   put:
 *     summary: Update address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: Address not found
 *   delete:
 *     summary: Delete address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: Address not found
 */
router.route('/addresses/:addressId')
  .put(validate(schemas.address), updateAddress)
  .delete(deleteAddress);

/**
 * @swagger
 * /api/users/orders:
 *   get:
 *     summary: Get current user's order history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled, refunded]
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/orders', getUserOrders);

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: No file uploaded or invalid file type
 */
router.post('/upload-avatar', uploadProfilePicture);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Access forbidden
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               preferences:
 *                 type: object
 *               role:
 *                 type: string
 *                 enum: [customer, shop_owner, admin, delivery_partner]
 *                 description: Admin only
 *               isActive:
 *                 type: boolean
 *                 description: Admin only
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Access forbidden
 *   delete:
 *     summary: Deactivate user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Access forbidden
 */
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

/**
 * @swagger
 * /api/users/{id}/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Access forbidden
 */
router.get('/:id/stats', getUserStats);

module.exports = router;