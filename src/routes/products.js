const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  removeProductImage,
  searchProducts,
  getFeaturedProducts,
  getProductRecommendations
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - category
 *         - price
 *         - stock
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 200
 *           description: Product name
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Product description
 *         shortDescription:
 *           type: string
 *           maxLength: 500
 *           description: Short product description
 *         category:
 *           type: string
 *           description: Category ID
 *         subcategories:
 *           type: array
 *           items:
 *             type: string
 *           description: Subcategory IDs
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Product price
 *         comparePrice:
 *           type: number
 *           minimum: 0
 *           description: Compare at price (for discounts)
 *         costPrice:
 *           type: number
 *           minimum: 0
 *           description: Cost price
 *         sku:
 *           type: string
 *           maxLength: 100
 *           description: Stock keeping unit
 *         stock:
 *           type: number
 *           minimum: 0
 *           description: Available stock quantity
 *         lowStockThreshold:
 *           type: number
 *           minimum: 0
 *           default: 5
 *         trackQuantity:
 *           type: boolean
 *           default: true
 *         weight:
 *           type: number
 *           minimum: 0
 *         dimensions:
 *           type: object
 *           properties:
 *             length:
 *               type: number
 *               minimum: 0
 *             width:
 *               type: number
 *               minimum: 0
 *             height:
 *               type: number
 *               minimum: 0
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *           default: true
 *         isFeatured:
 *           type: boolean
 *           default: false
 *         variants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               sku:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *       example:
 *         name: iPhone 14 Pro
 *         description: Latest iPhone with advanced camera system
 *         shortDescription: Premium smartphone with Pro camera system
 *         category: 507f1f77bcf86cd799439011
 *         price: 99999
 *         comparePrice: 109999
 *         stock: 50
 *         sku: IPH14PRO128
 *         tags: [smartphone, apple, premium]
 *         isActive: true
 *         isFeatured: true
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     tags: [Products]
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
 *         description: Search query for product names and descriptions
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: shop
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, rating, newest, popularity, name]
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
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
 *         description: Products retrieved successfully
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 *   post:
 *     summary: Create a new product (Shop owners only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error or shop not verified
 *       401:
 *         description: Not authorized
 */
router.route('/')
  .get(getProducts)
  .post(protect, authorize('shop_owner', 'admin'), validate(schemas.product), createProduct);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: shop
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc]
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
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
router.get('/search', searchProducts);

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Featured products retrieved successfully
 */
router.get('/featured', getFeaturedProducts);

/**
 * @swagger
 * /api/products/{identifier}:
 *   get:
 *     summary: Get product by ID or slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID or slug
 *     responses:
 *       200:
 *         description: Product retrieved successfully
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
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *                     similarProducts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update product (Shop owner or admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       403:
 *         description: Not authorized to update this product
 *   delete:
 *     summary: Delete product (Shop owner or admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       403:
 *         description: Not authorized to delete this product
 */
router.route('/:identifier')
  .get(getProduct)
  .put(protect, authorize('shop_owner', 'admin'), validate(schemas.product), updateProduct)
  .delete(protect, authorize('shop_owner', 'admin'), deleteProduct);

/**
 * @swagger
 * /api/products/{id}/images:
 *   post:
 *     summary: Upload product images (Shop owner or admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 10)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: No files uploaded or invalid file type
 *       404:
 *         description: Product not found
 *       403:
 *         description: Not authorized
 *   delete:
 *     summary: Remove product image (Shop owner or admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of image to remove
 *     responses:
 *       200:
 *         description: Image removed successfully
 *       400:
 *         description: Image URL is required
 *       404:
 *         description: Product not found
 *       403:
 *         description: Not authorized
 */
router.route('/:id/images')
  .post(protect, authorize('shop_owner', 'admin'), uploadProductImages)
  .delete(protect, authorize('shop_owner', 'admin'), removeProductImage);

/**
 * @swagger
 * /api/products/{id}/recommendations:
 *   get:
 *     summary: Get product recommendations
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id/recommendations', getProductRecommendations);

module.exports = router;