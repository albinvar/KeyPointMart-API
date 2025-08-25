const express = require('express');
const {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  getFeaturedCategories,
  reorderCategories
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Category name
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Category description
 *         image:
 *           type: string
 *           description: Category image URL
 *         icon:
 *           type: string
 *           description: Category icon
 *         parent:
 *           type: string
 *           description: Parent category ID
 *         isActive:
 *           type: boolean
 *           default: true
 *         isFeatured:
 *           type: boolean
 *           default: false
 *         sortOrder:
 *           type: number
 *           default: 0
 *         attributes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, number, select, multiselect, boolean]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRequired:
 *                 type: boolean
 *               isFilterable:
 *                 type: boolean
 *       example:
 *         name: Electronics
 *         description: Electronic devices and accessories
 *         isActive: true
 *         isFeatured: true
 *         sortOrder: 1
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Parent category ID (use 'null' for root categories)
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Category level (0 for root, 1 for first level, etc.)
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured categories
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active categories
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), validate(schemas.category), createCategory);

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get('/tree', getCategoryTree);

/**
 * @swagger
 * /api/categories/featured:
 *   get:
 *     summary: Get featured categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of categories to return
 *     responses:
 *       200:
 *         description: Featured categories retrieved successfully
 */
router.get('/featured', getFeaturedCategories);

/**
 * @swagger
 * /api/categories/reorder:
 *   put:
 *     summary: Reorder categories (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categories
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - sortOrder
 *                   properties:
 *                     id:
 *                       type: string
 *                     sortOrder:
 *                       type: number
 *     responses:
 *       200:
 *         description: Categories reordered successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.put('/reorder', protect, authorize('admin'), reorderCategories);

/**
 * @swagger
 * /api/categories/{identifier}:
 *   get:
 *     summary: Get category by ID or slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID or slug
 *     responses:
 *       200:
 *         description: Category retrieved successfully
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
 *                     category:
 *                       $ref: '#/components/schemas/Category'
 *                     subcategories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *                     breadcrumb:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Category not found
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Category has products or subcategories
 *       404:
 *         description: Category not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Access forbidden
 */
router.route('/:identifier')
  .get(getCategory)
  .put(protect, authorize('admin'), validate(schemas.category), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

/**
 * @swagger
 * /api/categories/{identifier}/products:
 *   get:
 *     summary: Get products in a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID or slug
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
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, rating, newest, name]
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
 *         name: inStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Category products retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/:identifier/products', getCategoryProducts);

module.exports = router;