const express = require('express');
const {
  getNearbyShops,
  geocodeAddressAPI,
  reverseGeocodeAPI,
  calculateDistanceAPI,
  getRoute,
  getPincodeDetails,
  checkDeliveryAvailability,
  detectLocation,
  getShopsByType,
  getDeliveryZones
} = require('../controllers/locationController');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Coordinates:
 *       type: object
 *       required:
 *         - latitude
 *         - longitude
 *       properties:
 *         latitude:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *           description: Latitude coordinate
 *         longitude:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *           description: Longitude coordinate
 *       example:
 *         latitude: 19.0760
 *         longitude: 72.8777
 * 
 *     LocationResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         data:
 *           type: object
 *         message:
 *           type: string
 * 
 *     DeliveryCheck:
 *       type: object
 *       required:
 *         - shopId
 *         - latitude
 *         - longitude
 *       properties:
 *         shopId:
 *           type: string
 *           description: Shop ID to check delivery for
 *         latitude:
 *           type: number
 *           description: Customer latitude
 *         longitude:
 *           type: number
 *           description: Customer longitude
 */

/**
 * @swagger
 * /api/location/nearby-shops:
 *   get:
 *     summary: Get nearby shops based on location
 *     tags: [Location]
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
 *           maximum: 50
 *         description: Search radius in kilometers
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [restaurant, shop, firm, grocery, pharmacy, electronics, clothing, other]
 *         description: Filter by business type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *     responses:
 *       200:
 *         description: Nearby shops retrieved successfully
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
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         radius:
 *                           type: number
 *                     shops:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid coordinates
 */
router.get('/nearby-shops', getNearbyShops);

/**
 * @swagger
 * /api/location/geocode:
 *   post:
 *     summary: Convert address to coordinates
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Address to geocode
 *             example:
 *               address: "123 Main Street, Mumbai, Maharashtra, India"
 *     responses:
 *       200:
 *         description: Address geocoded successfully
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
 *                     address:
 *                       type: string
 *                     coordinates:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     formatted_address:
 *                       type: string
 *       400:
 *         description: Address is required
 *       404:
 *         description: Address not found
 */
router.post('/geocode', geocodeAddressAPI);

/**
 * @swagger
 * /api/location/reverse-geocode:
 *   post:
 *     summary: Convert coordinates to address
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coordinates'
 *     responses:
 *       200:
 *         description: Coordinates reverse geocoded successfully
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
 *                     formatted_address:
 *                       type: string
 *                     components:
 *                       type: object
 *                     coordinates:
 *                       $ref: '#/components/schemas/Coordinates'
 *       400:
 *         description: Invalid coordinates
 *       404:
 *         description: Location not found
 */
router.post('/reverse-geocode', reverseGeocodeAPI);

/**
 * @swagger
 * /api/location/distance:
 *   post:
 *     summary: Calculate distance between two locations
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 $ref: '#/components/schemas/Coordinates'
 *               destination:
 *                 $ref: '#/components/schemas/Coordinates'
 *     responses:
 *       200:
 *         description: Distance calculated successfully
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
 *                     origin:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     destination:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     distance:
 *                       type: number
 *                       description: Distance in kilometers
 *                     unit:
 *                       type: string
 *                       example: km
 *                     estimatedDeliveryTime:
 *                       type: number
 *                       description: Estimated delivery time in minutes
 *                     timeUnit:
 *                       type: string
 *                       example: minutes
 *       400:
 *         description: Invalid coordinates
 */
router.post('/distance', calculateDistanceAPI);

/**
 * @swagger
 * /api/location/route:
 *   post:
 *     summary: Get route information between two points
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 $ref: '#/components/schemas/Coordinates'
 *               destination:
 *                 $ref: '#/components/schemas/Coordinates'
 *     responses:
 *       200:
 *         description: Route information retrieved successfully
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
 *                     origin:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     destination:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     distance:
 *                       type: number
 *                     distanceUnit:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     durationUnit:
 *                       type: string
 *                     estimated:
 *                       type: boolean
 *                     route:
 *                       type: object
 *       404:
 *         description: Route not found
 */
router.post('/route', getRoute);

/**
 * @swagger
 * /api/location/pincode/{pincode}:
 *   get:
 *     summary: Get information about a pincode
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: pincode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[1-9][0-9]{5}$'
 *         description: 6-digit Indian pincode
 *     responses:
 *       200:
 *         description: Pincode information retrieved successfully
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
 *                     pincode:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     district:
 *                       type: string
 *                     isValid:
 *                       type: boolean
 *       400:
 *         description: Invalid pincode format
 *       404:
 *         description: Pincode information not found
 */
router.get('/pincode/:pincode', getPincodeDetails);

/**
 * @swagger
 * /api/location/delivery-check:
 *   post:
 *     summary: Check if delivery is available at a location
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryCheck'
 *     responses:
 *       200:
 *         description: Delivery availability checked successfully
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
 *                     customer:
 *                       type: object
 *                     delivery:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         distance:
 *                           type: number
 *                         estimatedTime:
 *                           type: number
 *                         fee:
 *                           type: number
 *                         reason:
 *                           type: string
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Shop not found
 */
router.post('/delivery-check', checkDeliveryAvailability);

/**
 * @swagger
 * /api/location/detect:
 *   get:
 *     summary: Detect user location from IP address
 *     tags: [Location]
 *     responses:
 *       200:
 *         description: Location detected successfully
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
 *                     ip:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                     estimated:
 *                       type: boolean
 *                     message:
 *                       type: string
 */
router.get('/detect', detectLocation);

/**
 * @swagger
 * /api/location/shops-by-type:
 *   get:
 *     summary: Get shops by business type near a location
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: businessType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [restaurant, shop, firm, grocery, pharmacy, electronics, clothing, other]
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Shops by type retrieved successfully
 */
router.get('/shops-by-type', getShopsByType);

/**
 * @swagger
 * /api/location/delivery-zones/{shopId}:
 *   get:
 *     summary: Get delivery zones for a shop
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Delivery zones retrieved successfully
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
 *                     zones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           radius:
 *                             type: number
 *                           deliveryTime:
 *                             type: string
 *                           fee:
 *                             type: number
 *                           color:
 *                             type: string
 *       404:
 *         description: Shop not found
 */
router.get('/delivery-zones/:shopId', getDeliveryZones);

module.exports = router;