const Category = require('../models/Category');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const { parent, level, featured, active } = req.query;
  
  let query = {};
  
  if (parent !== undefined) {
    query.parent = parent === 'null' ? null : parent;
  }
  
  if (level !== undefined) {
    query.level = parseInt(level);
  }
  
  if (featured !== undefined) {
    query.isFeatured = featured === 'true';
  }
  
  if (active !== undefined) {
    query.isActive = active === 'true';
  } else {
    // Default to active categories only
    query.isActive = true;
  }
  
  const categories = await Category.find(query)
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 });

  // Add product count for each category
  for (let category of categories) {
    const productCount = await Product.countDocuments({
      $or: [
        { category: category._id },
        { subcategories: category._id }
      ],
      isActive: true,
      status: 'active'
    });
    category.metadata.totalProducts = productCount;
  }

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = asyncHandler(async (req, res) => {
  const categoryTree = await Category.getTree();
  
  res.status(200).json({
    status: 'success',
    data: { categoryTree }
  });
});

// @desc    Get category by ID or slug
// @route   GET /api/categories/:identifier
// @access  Public
const getCategory = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  
  // Try to find by ID first, then by slug
  let category = await Category.findById(identifier).populate('parent', 'name slug');
  
  if (!category) {
    category = await Category.findOne({ slug: identifier }).populate('parent', 'name slug');
  }
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }

  // Get subcategories
  const subcategories = await Category.find({ 
    parent: category._id, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });

  // Get breadcrumb
  const breadcrumb = await category.getBreadcrumb();

  // Get product count
  const productCount = await Product.countDocuments({
    $or: [
      { category: category._id },
      { subcategories: category._id }
    ],
    isActive: true,
    status: 'active'
  });

  res.status(200).json({
    status: 'success',
    data: {
      category: {
        ...category.toObject(),
        productCount
      },
      subcategories,
      breadcrumb
    }
  });
});

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const categoryData = {
    ...req.body,
    createdBy: req.user.id
  };

  const category = await Category.create(categoryData);

  res.status(201).json({
    status: 'success',
    message: 'Category created successfully',
    data: { category }
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }

  category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Category updated successfully',
    data: { category }
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }

  // Check if category has products
  const productCount = await Product.countDocuments({
    $or: [
      { category: category._id },
      { subcategories: category._id }
    ]
  });

  if (productCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete category that has products. Please move products to another category first.'
    });
  }

  // Check if category has subcategories
  const subcategoryCount = await Category.countDocuments({ parent: category._id });

  if (subcategoryCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete category that has subcategories. Please delete subcategories first.'
    });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Category deleted successfully'
  });
});

// @desc    Get category products
// @route   GET /api/categories/:identifier/products
// @access  Public
const getCategoryProducts = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const { sort, minPrice, maxPrice, rating, inStock } = req.query;

  // Find category
  let category = await Category.findById(identifier);
  if (!category) {
    category = await Category.findOne({ slug: identifier });
  }
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }

  // Build query
  let query = {
    $or: [
      { category: category._id },
      { subcategories: category._id }
    ],
    isActive: true,
    status: 'active'
  };

  // Apply filters
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (rating) {
    query['rating.average'] = { $gte: parseFloat(rating) };
  }

  if (inStock === 'true') {
    query.stock = { $gt: 0 };
  }

  // Build sort
  let sortQuery = {};
  switch (sort) {
    case 'price_asc':
      sortQuery.price = 1;
      break;
    case 'price_desc':
      sortQuery.price = -1;
      break;
    case 'rating':
      sortQuery['rating.average'] = -1;
      break;
    case 'newest':
      sortQuery.createdAt = -1;
      break;
    case 'name':
      sortQuery.name = 1;
      break;
    default:
      sortQuery.createdAt = -1;
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('shop', 'businessName images.logo verification.status')
    .populate('category', 'name slug')
    .select('-description -attributes -seo')
    .skip(skip)
    .limit(limit)
    .sort(sortQuery);

  res.status(200).json({
    status: 'success',
    data: {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      },
      products,
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

// @desc    Get featured categories
// @route   GET /api/categories/featured
// @access  Public
const getFeaturedCategories = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const categories = await Category.find({
    isFeatured: true,
    isActive: true
  })
  .select('name slug description image icon')
  .limit(limit)
  .sort({ sortOrder: 1, name: 1 });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private/Admin
const reorderCategories = asyncHandler(async (req, res) => {
  const { categories } = req.body; // Array of { id, sortOrder }

  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide categories array with id and sortOrder'
    });
  }

  // Update sort order for each category
  const updatePromises = categories.map(({ id, sortOrder }) => 
    Category.findByIdAndUpdate(id, { sortOrder }, { new: true })
  );

  await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    message: 'Categories reordered successfully'
  });
});

module.exports = {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  getFeaturedCategories,
  reorderCategories
};