require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Address = require('../models/Address');
const Category = require('../models/Category');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keypointmart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Clear all data
const clearDatabase = async () => {
  try {
    await Review.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Shop.deleteMany({});
    await Category.deleteMany({});
    await Address.deleteMany({});
    await User.deleteMany({});
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed Users
const seedUsers = async () => {
  const users = [
    // Admin user
    {
      name: 'KeyPointMart Admin',
      email: 'admin@keypointmart.com',
      phone: '+919876543210',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    // Shop owners
    {
      name: 'Rajesh Electronics',
      email: 'rajesh@electronics.com',
      phone: '+919876543211',
      password: await bcrypt.hash('password123', 12),
      role: 'shop_owner',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    {
      name: 'Priya Fashions',
      email: 'priya@fashions.com',
      phone: '+919876543212',
      password: await bcrypt.hash('password123', 12),
      role: 'shop_owner',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    {
      name: 'Ahmed Restaurant',
      email: 'ahmed@restaurant.com',
      phone: '+919876543213',
      password: await bcrypt.hash('password123', 12),
      role: 'shop_owner',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    {
      name: 'Sita Grocery Store',
      email: 'sita@grocery.com',
      phone: '+919876543214',
      password: await bcrypt.hash('password123', 12),
      role: 'shop_owner',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    // Customers
    {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+919876543215',
      password: await bcrypt.hash('password123', 12),
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+919876543216',
      password: await bcrypt.hash('password123', 12),
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      dateOfBirth: new Date('1985-08-22'),
      gender: 'female',
    },
    {
      name: 'Michael Brown',
      email: 'michael@example.com',
      phone: '+919876543217',
      password: await bcrypt.hash('password123', 12),
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      dateOfBirth: new Date('1992-12-10'),
      gender: 'male',
    },
    {
      name: 'Emily Davis',
      email: 'emily@example.com',
      phone: '+919876543218',
      password: await bcrypt.hash('password123', 12),
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      dateOfBirth: new Date('1988-03-18'),
      gender: 'female',
    }
  ];

  const createdUsers = await User.create(users);
  console.log(`Created ${createdUsers.length} users`);
  return createdUsers;
};

// Helper function to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Seed Categories
const seedCategories = async () => {
  const categories = [
    // Root categories
    { name: 'Electronics', slug: generateSlug('Electronics'), description: 'Electronic devices and accessories', isActive: true, isFeatured: true, sortOrder: 1 },
    { name: 'Fashion', slug: generateSlug('Fashion'), description: 'Clothing and accessories', isActive: true, isFeatured: true, sortOrder: 2 },
    { name: 'Food & Restaurants', slug: generateSlug('Food & Restaurants'), description: 'Food delivery and restaurants', isActive: true, isFeatured: true, sortOrder: 3 },
    { name: 'Grocery', slug: generateSlug('Grocery'), description: 'Daily essentials and groceries', isActive: true, isFeatured: true, sortOrder: 4 },
    { name: 'Health & Beauty', slug: generateSlug('Health & Beauty'), description: 'Health and beauty products', isActive: true, isFeatured: false, sortOrder: 5 },
    { name: 'Home & Garden', slug: generateSlug('Home & Garden'), description: 'Home improvement and garden supplies', isActive: true, isFeatured: false, sortOrder: 6 },
    { name: 'Sports & Fitness', slug: generateSlug('Sports & Fitness'), description: 'Sports equipment and fitness gear', isActive: true, isFeatured: false, sortOrder: 7 },
    { name: 'Books & Education', slug: generateSlug('Books & Education'), description: 'Books and educational materials', isActive: true, isFeatured: false, sortOrder: 8 }
  ];

  const rootCategories = await Category.create(categories);
  
  // Subcategories for Electronics
  const electronicsSubcats = [
    { name: 'Smartphones', slug: generateSlug('Smartphones'), description: 'Mobile phones and accessories', parent: rootCategories[0]._id, level: 1, isActive: true },
    { name: 'Laptops', slug: generateSlug('Laptops'), description: 'Laptops and computers', parent: rootCategories[0]._id, level: 1, isActive: true },
    { name: 'TVs', slug: generateSlug('TVs'), description: 'Televisions and entertainment', parent: rootCategories[0]._id, level: 1, isActive: true },
    { name: 'Audio', slug: generateSlug('Audio'), description: 'Headphones and speakers', parent: rootCategories[0]._id, level: 1, isActive: true }
  ];

  // Subcategories for Fashion
  const fashionSubcats = [
    { name: 'Men\'s Clothing', slug: generateSlug('Men\'s Clothing'), description: 'Clothing for men', parent: rootCategories[1]._id, level: 1, isActive: true },
    { name: 'Women\'s Clothing', slug: generateSlug('Women\'s Clothing'), description: 'Clothing for women', parent: rootCategories[1]._id, level: 1, isActive: true },
    { name: 'Shoes', slug: generateSlug('Shoes'), description: 'Footwear for all', parent: rootCategories[1]._id, level: 1, isActive: true },
    { name: 'Accessories', slug: generateSlug('Accessories'), description: 'Fashion accessories', parent: rootCategories[1]._id, level: 1, isActive: true }
  ];

  // Subcategories for Food
  const foodSubcats = [
    { name: 'Indian Cuisine', slug: generateSlug('Indian Cuisine'), description: 'Indian restaurants and food', parent: rootCategories[2]._id, level: 1, isActive: true },
    { name: 'Chinese Cuisine', slug: generateSlug('Chinese Cuisine'), description: 'Chinese restaurants and food', parent: rootCategories[2]._id, level: 1, isActive: true },
    { name: 'Fast Food', slug: generateSlug('Fast Food'), description: 'Quick service restaurants', parent: rootCategories[2]._id, level: 1, isActive: true },
    { name: 'Beverages', slug: generateSlug('Beverages'), description: 'Drinks and beverages', parent: rootCategories[2]._id, level: 1, isActive: true }
  ];

  // Subcategories for Grocery
  const grocerySubcats = [
    { name: 'Fruits & Vegetables', slug: generateSlug('Fruits & Vegetables'), description: 'Fresh produce', parent: rootCategories[3]._id, level: 1, isActive: true },
    { name: 'Dairy Products', slug: generateSlug('Dairy Products'), description: 'Milk, cheese, and dairy', parent: rootCategories[3]._id, level: 1, isActive: true },
    { name: 'Packaged Food', slug: generateSlug('Packaged Food'), description: 'Packaged and processed food', parent: rootCategories[3]._id, level: 1, isActive: true },
    { name: 'Personal Care', slug: generateSlug('Personal Care'), description: 'Personal hygiene products', parent: rootCategories[3]._id, level: 1, isActive: true }
  ];

  const subcategories = await Category.create([
    ...electronicsSubcats,
    ...fashionSubcats,
    ...foodSubcats,
    ...grocerySubcats
  ]);

  console.log(`Created ${rootCategories.length + subcategories.length} categories`);
  return { rootCategories, subcategories };
};

// Seed Addresses
const seedAddresses = async (users) => {
  const customers = users.filter(user => user.role === 'customer');
  const addresses = [];

  for (let customer of customers) {
    addresses.push({
      user: customer._id,
      type: 'home',
      nickname: 'Home',
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: `${Math.floor(Math.random() * 999) + 1} Main Street`,
      addressLine2: `Apartment ${Math.floor(Math.random() * 99) + 1}B`,
      landmark: 'Near City Mall',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      coordinates: {
        latitude: 19.0760 + (Math.random() - 0.5) * 0.1,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.1
      },
      isDefault: true,
      isActive: true
    });

    // Add work address for some customers
    if (Math.random() > 0.5) {
      addresses.push({
        user: customer._id,
        type: 'office',
        nickname: 'Office',
        fullName: customer.name,
        phone: customer.phone,
        addressLine1: `Office ${Math.floor(Math.random() * 99) + 1}`,
        addressLine2: `Business Park ${Math.floor(Math.random() * 9) + 1}`,
        landmark: 'Near Business District',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400051',
        coordinates: {
          latitude: 19.0760 + (Math.random() - 0.5) * 0.1,
          longitude: 72.8777 + (Math.random() - 0.5) * 0.1
        },
        isDefault: false,
        isActive: true
      });
    }
  }

  const createdAddresses = await Address.create(addresses);
  console.log(`Created ${createdAddresses.length} addresses`);
  return createdAddresses;
};

// Seed Shops
const seedShops = async (users, categories) => {
  const shopOwners = users.filter(user => user.role === 'shop_owner');
  const { rootCategories } = categories;

  const shops = [
    {
      owner: shopOwners[0]._id, // Rajesh Electronics
      businessName: 'Rajesh Electronics Store',
      description: 'Your one-stop shop for all electronic needs. We offer the latest smartphones, laptops, TVs, and accessories at competitive prices.',
      businessType: 'electronics',
      categories: [rootCategories[0]._id], // Electronics
      contactInfo: {
        phone: shopOwners[0].phone,
        email: shopOwners[0].email,
        website: 'https://rajeshelectronics.com'
      },
      address: {
        addressLine1: '123 Electronics Market',
        addressLine2: 'Shop No. 45',
        landmark: 'Near Metro Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400002',
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        }
      },
      documents: {
        businessLicense: 'EL123456789',
        taxId: '27ABCDE1234F1Z5',
        panCard: 'ABCDE1234F'
      },
      businessHours: [
        { day: 'monday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'tuesday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'wednesday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'thursday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'friday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'saturday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'sunday', isOpen: true, openTime: '11:00', closeTime: '19:00' }
      ],
      verification: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: users[0]._id // Admin
      },
      isActive: true,
      isFeatured: true,
      stats: {
        totalOrders: 150,
        totalRevenue: 750000,
        averageRating: 4.5,
        totalReviews: 89,
        totalProducts: 0
      }
    },
    {
      owner: shopOwners[1]._id, // Priya Fashions
      businessName: 'Priya Fashion Boutique',
      description: 'Trendy clothing and accessories for men and women. Latest fashion at affordable prices.',
      businessType: 'clothing',
      categories: [rootCategories[1]._id], // Fashion
      contactInfo: {
        phone: shopOwners[1].phone,
        email: shopOwners[1].email
      },
      address: {
        addressLine1: '456 Fashion Street',
        addressLine2: 'Ground Floor',
        landmark: 'Opposite City Mall',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400003',
        coordinates: {
          latitude: 19.0850,
          longitude: 72.8850
        }
      },
      documents: {
        businessLicense: 'FB123456789',
        taxId: '27FGHIJ5678G2A6',
        panCard: 'FGHIJ5678G'
      },
      businessHours: [
        { day: 'monday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'tuesday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'wednesday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'thursday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'friday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'saturday', isOpen: true, openTime: '10:30', closeTime: '21:00' },
        { day: 'sunday', isOpen: true, openTime: '11:00', closeTime: '20:00' }
      ],
      verification: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: users[0]._id // Admin
      },
      isActive: true,
      isFeatured: true,
      stats: {
        totalOrders: 89,
        totalRevenue: 234500,
        averageRating: 4.2,
        totalReviews: 56,
        totalProducts: 0
      }
    },
    {
      owner: shopOwners[2]._id, // Ahmed Restaurant
      businessName: 'Ahmed\'s Delicious Kitchen',
      description: 'Authentic Indian and Chinese cuisine. Fresh ingredients and traditional recipes.',
      businessType: 'restaurant',
      categories: [rootCategories[2]._id], // Food & Restaurants
      contactInfo: {
        phone: shopOwners[2].phone,
        email: shopOwners[2].email
      },
      address: {
        addressLine1: '789 Food Court Lane',
        addressLine2: 'Second Floor',
        landmark: 'Near Hospital',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400004',
        coordinates: {
          latitude: 19.0650,
          longitude: 72.8650
        }
      },
      documents: {
        businessLicense: 'RT123456789',
        taxId: '27KLMNO9012H3B7',
        panCard: 'KLMNO9012H'
      },
      businessHours: [
        { day: 'monday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'tuesday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'wednesday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'thursday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'friday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'saturday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
        { day: 'sunday', isOpen: true, openTime: '11:00', closeTime: '23:00' }
      ],
      verification: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: users[0]._id // Admin
      },
      isActive: true,
      isFeatured: false,
      stats: {
        totalOrders: 267,
        totalRevenue: 145600,
        averageRating: 4.7,
        totalReviews: 123,
        totalProducts: 0
      }
    },
    {
      owner: shopOwners[3]._id, // Sita Grocery
      businessName: 'Sita Daily Needs Grocery',
      description: 'Fresh fruits, vegetables, dairy products, and daily essentials at your doorstep.',
      businessType: 'grocery',
      categories: [rootCategories[3]._id], // Grocery
      contactInfo: {
        phone: shopOwners[3].phone,
        email: shopOwners[3].email
      },
      address: {
        addressLine1: '321 Market Road',
        addressLine2: 'Corner Shop',
        landmark: 'Near Bus Stand',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400005',
        coordinates: {
          latitude: 19.0950,
          longitude: 72.8950
        }
      },
      documents: {
        businessLicense: 'GR123456789',
        taxId: '27PQRST3456I4C8',
        panCard: 'PQRST3456I'
      },
      businessHours: [
        { day: 'monday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'tuesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'wednesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'thursday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'friday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'saturday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'sunday', isOpen: true, openTime: '08:00', closeTime: '21:00' }
      ],
      verification: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: users[0]._id // Admin
      },
      isActive: true,
      isFeatured: false,
      stats: {
        totalOrders: 445,
        totalRevenue: 89300,
        averageRating: 4.1,
        totalReviews: 78,
        totalProducts: 0
      }
    }
  ];

  const createdShops = await Shop.create(shops);
  console.log(`Created ${createdShops.length} shops`);
  return createdShops;
};

// Seed Products
const seedProducts = async (shops, categories) => {
  const { rootCategories, subcategories } = categories;
  const products = [];

  // Electronics products for Rajesh Electronics
  const electronicsShop = shops[0];
  const smartphonesCat = subcategories.find(cat => cat.name === 'Smartphones');
  const laptopsCat = subcategories.find(cat => cat.name === 'Laptops');
  const tvsCat = subcategories.find(cat => cat.name === 'TVs');
  const audioCat = subcategories.find(cat => cat.name === 'Audio');

  const electronicsProducts = [
    {
      name: 'iPhone 14 Pro',
      description: 'The most advanced iPhone yet with A16 Bionic chip, Pro camera system, and Dynamic Island.',
      shortDescription: 'Latest iPhone with Pro camera system',
      shop: electronicsShop._id,
      category: rootCategories[0]._id,
      subcategories: [smartphonesCat._id],
      price: 99999,
      comparePrice: 109999,
      stock: 25,
      sku: 'IP14PRO128',
      tags: ['smartphone', 'apple', 'premium'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.8, count: 45 },
      stats: { views: 1250, orders: 23 }
    },
    {
      name: 'Samsung Galaxy S23 Ultra',
      description: 'Premium Android smartphone with S Pen, incredible cameras, and long-lasting battery.',
      shortDescription: 'Premium Samsung flagship with S Pen',
      shop: electronicsShop._id,
      category: rootCategories[0]._id,
      subcategories: [smartphonesCat._id],
      price: 89999,
      comparePrice: 94999,
      stock: 18,
      sku: 'SGS23U256',
      tags: ['smartphone', 'samsung', 'android'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.6, count: 32 },
      stats: { views: 890, orders: 15 }
    },
    {
      name: 'MacBook Air M2',
      description: 'Supercharged by M2 chip. Incredibly portable design with all-day battery life.',
      shortDescription: 'Ultra-thin laptop powered by M2 chip',
      shop: electronicsShop._id,
      category: rootCategories[0]._id,
      subcategories: [laptopsCat._id],
      price: 119900,
      comparePrice: 124900,
      stock: 12,
      sku: 'MBA13M2256',
      tags: ['laptop', 'apple', 'macbook'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.9, count: 28 },
      stats: { views: 1150, orders: 12 }
    },
    {
      name: 'Sony Bravia 55" 4K TV',
      description: 'Experience stunning 4K HDR picture quality with intelligent TV processing.',
      shortDescription: '55-inch 4K Smart TV with HDR',
      shop: electronicsShop._id,
      category: rootCategories[0]._id,
      subcategories: [tvsCat._id],
      price: 54999,
      comparePrice: 59999,
      stock: 8,
      sku: 'SONY55X80K',
      tags: ['tv', 'sony', '4k', 'smart'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.4, count: 19 },
      stats: { views: 750, orders: 8 }
    },
    {
      name: 'AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation, Adaptive Transparency, and spatial audio.',
      shortDescription: 'Premium wireless earbuds with ANC',
      shop: electronicsShop._id,
      category: rootCategories[0]._id,
      subcategories: [audioCat._id],
      price: 24900,
      comparePrice: 26900,
      stock: 35,
      sku: 'APP2ND',
      tags: ['earbuds', 'apple', 'wireless'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.7, count: 67 },
      stats: { views: 1890, orders: 34 }
    }
  ];

  // Fashion products for Priya Fashion Boutique
  const fashionShop = shops[1];
  const mensCat = subcategories.find(cat => cat.name === 'Men\'s Clothing');
  const womensCat = subcategories.find(cat => cat.name === 'Women\'s Clothing');
  const shoesCat = subcategories.find(cat => cat.name === 'Shoes');

  const fashionProducts = [
    {
      name: 'Men\'s Cotton Casual Shirt',
      description: 'Premium quality cotton shirt perfect for casual and semi-formal occasions.',
      shortDescription: '100% cotton casual shirt',
      shop: fashionShop._id,
      category: rootCategories[1]._id,
      subcategories: [mensCat._id],
      price: 1299,
      comparePrice: 1599,
      stock: 45,
      sku: 'MCS001',
      tags: ['shirt', 'men', 'cotton', 'casual'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.2, count: 23 },
      stats: { views: 567, orders: 18 }
    },
    {
      name: 'Women\'s Ethnic Kurti',
      description: 'Beautiful ethnic kurti with traditional embroidery work, perfect for festivals.',
      shortDescription: 'Traditional embroidered kurti',
      shop: fashionShop._id,
      category: rootCategories[1]._id,
      subcategories: [womensCat._id],
      price: 999,
      comparePrice: 1299,
      stock: 32,
      sku: 'WEK001',
      tags: ['kurti', 'women', 'ethnic', 'embroidery'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.5, count: 34 },
      stats: { views: 890, orders: 25 }
    },
    {
      name: 'Casual Sneakers',
      description: 'Comfortable and stylish sneakers perfect for daily wear and light exercise.',
      shortDescription: 'Comfortable casual sneakers',
      shop: fashionShop._id,
      category: rootCategories[1]._id,
      subcategories: [shoesCat._id],
      price: 2499,
      comparePrice: 2999,
      stock: 28,
      sku: 'CS001',
      tags: ['sneakers', 'shoes', 'casual', 'comfortable'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.1, count: 15 },
      stats: { views: 423, orders: 12 }
    }
  ];

  // Food products for Ahmed's Restaurant
  const restaurantShop = shops[2];
  const indianCat = subcategories.find(cat => cat.name === 'Indian Cuisine');
  const chineseCat = subcategories.find(cat => cat.name === 'Chinese Cuisine');
  const beveragesCat = subcategories.find(cat => cat.name === 'Beverages');

  const foodProducts = [
    {
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice cooked with tender chicken pieces and traditional spices.',
      shortDescription: 'Authentic chicken biryani',
      shop: restaurantShop._id,
      category: rootCategories[2]._id,
      subcategories: [indianCat._id],
      price: 299,
      stock: 50,
      sku: 'CB001',
      tags: ['biryani', 'chicken', 'indian', 'spicy'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.8, count: 89 },
      stats: { views: 2340, orders: 156 }
    },
    {
      name: 'Paneer Butter Masala',
      description: 'Rich and creamy cottage cheese curry cooked in buttery tomato gravy.',
      shortDescription: 'Creamy paneer curry',
      shop: restaurantShop._id,
      category: rootCategories[2]._id,
      subcategories: [indianCat._id],
      price: 249,
      stock: 40,
      sku: 'PBM001',
      tags: ['paneer', 'curry', 'vegetarian', 'indian'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.6, count: 67 },
      stats: { views: 1890, orders: 98 }
    },
    {
      name: 'Hakka Noodles',
      description: 'Stir-fried noodles with vegetables and your choice of chicken or vegetables.',
      shortDescription: 'Indo-Chinese stir-fried noodles',
      shop: restaurantShop._id,
      category: rootCategories[2]._id,
      subcategories: [chineseCat._id],
      price: 199,
      stock: 60,
      sku: 'HN001',
      tags: ['noodles', 'chinese', 'stir-fry'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.4, count: 45 },
      stats: { views: 1450, orders: 78 }
    },
    {
      name: 'Fresh Lime Soda',
      description: 'Refreshing lime soda with a perfect balance of sweet and tangy flavors.',
      shortDescription: 'Refreshing lime soda',
      shop: restaurantShop._id,
      category: rootCategories[2]._id,
      subcategories: [beveragesCat._id],
      price: 49,
      stock: 100,
      sku: 'FLS001',
      tags: ['beverage', 'lime', 'refreshing', 'cold'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.2, count: 34 },
      stats: { views: 890, orders: 89 }
    }
  ];

  // Grocery products for Sita Grocery
  const groceryShop = shops[3];
  const fruitsCat = subcategories.find(cat => cat.name === 'Fruits & Vegetables');
  const dairyCat = subcategories.find(cat => cat.name === 'Dairy Products');
  const packagedCat = subcategories.find(cat => cat.name === 'Packaged Food');

  const groceryProducts = [
    {
      name: 'Fresh Bananas (1 Dozen)',
      description: 'Fresh and ripe bananas, rich in potassium and perfect for daily nutrition.',
      shortDescription: 'Fresh ripe bananas',
      shop: groceryShop._id,
      category: rootCategories[3]._id,
      subcategories: [fruitsCat._id],
      price: 60,
      stock: 150,
      sku: 'FB12',
      tags: ['fruit', 'banana', 'fresh', 'healthy'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.3, count: 78 },
      stats: { views: 1234, orders: 145 }
    },
    {
      name: 'Full Cream Milk (1L)',
      description: 'Fresh full cream milk from local dairy farms, rich in calcium and protein.',
      shortDescription: 'Fresh full cream milk',
      shop: groceryShop._id,
      category: rootCategories[3]._id,
      subcategories: [dairyCat._id],
      price: 62,
      stock: 80,
      sku: 'FCM1L',
      tags: ['milk', 'dairy', 'fresh', 'calcium'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.5, count: 56 },
      stats: { views: 2340, orders: 234 }
    },
    {
      name: 'Basmati Rice (5kg)',
      description: 'Premium quality aged basmati rice with long grains and aromatic fragrance.',
      shortDescription: 'Premium basmati rice',
      shop: groceryShop._id,
      category: rootCategories[3]._id,
      subcategories: [packagedCat._id],
      price: 450,
      comparePrice: 500,
      stock: 45,
      sku: 'BR5KG',
      tags: ['rice', 'basmati', 'premium', 'staple'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.4, count: 23 },
      stats: { views: 890, orders: 67 }
    }
  ];

  products.push(...electronicsProducts, ...fashionProducts, ...foodProducts, ...groceryProducts);

  const createdProducts = await Product.create(products);
  
  // Update shop product counts
  for (let shop of shops) {
    const productCount = createdProducts.filter(p => p.shop.toString() === shop._id.toString()).length;
    shop.stats.totalProducts = productCount;
    await shop.save();
  }

  console.log(`Created ${createdProducts.length} products`);
  return createdProducts;
};

// Generate order number helper
const generateOrderNumber = (index) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = String(index + 1).padStart(4, '0');
  return `KPM${year}${month}${day}${sequence}`;
};

// Seed Orders
const seedOrders = async (users, shops, products, addresses) => {
  const customers = users.filter(user => user.role === 'customer');
  const orders = [];

  // Create sample orders
  for (let i = 0; i < 20; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const shop = shops[Math.floor(Math.random() * shops.length)];
    const customerAddresses = addresses.filter(addr => addr.user.toString() === customer._id.toString());
    const customerAddress = customerAddresses[Math.floor(Math.random() * customerAddresses.length)];
    
    // Get random products from the same shop
    const shopProducts = products.filter(p => p.shop.toString() === shop._id.toString());
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = shopProducts[Math.floor(Math.random() * shopProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      const itemTotal = product.price * quantity;
      
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        total: itemTotal,
        shop: shop._id
      });
      
      subtotal += itemTotal;
    }

    const deliveryFee = subtotal < 500 ? 40 : 0;
    const tax = Math.round(subtotal * 0.05); // 5% tax
    const total = subtotal + deliveryFee + tax;

    const statuses = ['delivered', 'confirmed', 'preparing', 'pending', 'cancelled'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const order = {
      orderNumber: generateOrderNumber(i),
      customer: customer._id,
      shop: shop._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      status,
      delivery: {
        type: 'delivery',
        address: {
          fullName: customerAddress.fullName,
          phone: customerAddress.phone,
          addressLine1: customerAddress.addressLine1,
          addressLine2: customerAddress.addressLine2,
          landmark: customerAddress.landmark,
          city: customerAddress.city,
          state: customerAddress.state,
          country: customerAddress.country,
          pincode: customerAddress.pincode,
          coordinates: customerAddress.coordinates
        },
        estimatedTime: 30
      },
      payment: {
        method: ['cash', 'card', 'upi'][Math.floor(Math.random() * 3)],
        status: status === 'delivered' ? 'paid' : 'pending'
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    };

    orders.push(order);
  }

  // Create orders individually to ensure pre-save middleware runs
  const createdOrders = [];
  for (const orderData of orders) {
    const order = await Order.create(orderData);
    createdOrders.push(order);
  }
  
  console.log(`Created ${createdOrders.length} orders`);
  return createdOrders;
};

// Main seed function
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await clearDatabase();
    
    // Seed data in order
    console.log('👥 Seeding users...');
    const users = await seedUsers();
    
    console.log('📦 Seeding categories...');
    const categories = await seedCategories();
    
    console.log('📍 Seeding addresses...');
    const addresses = await seedAddresses(users);
    
    console.log('🏪 Seeding shops...');
    const shops = await seedShops(users, categories);
    
    console.log('📱 Seeding products...');
    const products = await seedProducts(shops, categories);
    
    console.log('🛒 Seeding orders...');
    const orders = await seedOrders(users, shops, products, addresses);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log(`
📊 Summary:
- Users: ${users.length}
- Categories: ${categories.rootCategories.length + categories.subcategories.length}
- Addresses: ${addresses.length}
- Shops: ${shops.length}
- Products: ${products.length}
- Orders: ${orders.length}

🔐 Login Credentials:
Admin: admin@keypointmart.com / admin123
Shop Owner: rajesh@electronics.com / password123
Customer: john@example.com / password123
    `);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, clearDatabase };