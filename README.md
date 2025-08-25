# KeyPointMart E-Commerce API

A comprehensive e-commerce API platform built with Node.js, Express, MongoDB, and Docker. KeyPointMart connects customers with local shops and businesses, providing a complete marketplace solution with advanced features.

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Contributing](#-contributing)

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple shops and vendors
- **Role-based Access Control**: Admin, Shop Owner, Customer, Delivery Partner roles
- **Real-time Order Management**: Complete order lifecycle tracking
- **Location-based Services**: GPS integration for shop discovery and delivery
- **Payment Gateway Integration**: Multiple payment methods support
- **Inventory Management**: Real-time stock tracking and notifications

### Authentication & User Management
- JWT-based secure authentication
- Email and SMS verification
- Password reset functionality
- Account lockout protection
- Multi-role user management
- Profile and address management

### Product Catalog System
- Hierarchical category structure
- Product variants and options
- Image and video uploads
- SEO-friendly URLs
- Advanced search and filtering
- Stock management and alerts

### Shop Management
- Shop registration and verification
- Business hours management
- Dashboard analytics
- Revenue and order tracking
- Product inventory management
- Customer review system

### Order Processing
- Shopping cart persistence
- Order placement and tracking
- Status updates and notifications
- Delivery management
- Refund and return handling
- Order history and reordering

### Payment Integration
- Multiple payment gateways (Razorpay, Stripe, Paytm)
- Various payment methods (UPI, Cards, Wallets, COD)
- Secure payment processing
- Refund management
- Payment analytics

### Location Services
- GPS-based shop discovery
- Delivery zone management
- Distance calculation
- Address geocoding
- Nearby shops finder

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Database** | MongoDB 7.0 |
| **ODM** | Mongoose |
| **Authentication** | JWT |
| **Validation** | Joi |
| **File Upload** | Multer |
| **Documentation** | Swagger/OpenAPI 3.0 |
| **Containerization** | Docker & Docker Compose |
| **Development** | Nodemon |
| **Security** | Helmet.js, bcryptjs |
| **Email/SMS** | Nodemailer, Twilio |

## 🏗️ Architecture

### Project Structure
```
src/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── config.js     # Application configuration
├── controllers/      # Route controllers
│   ├── authController.js
│   ├── userController.js
│   ├── productController.js
│   ├── categoryController.js
│   ├── shopController.js
│   ├── orderController.js
│   ├── paymentController.js
│   └── locationController.js
├── middleware/       # Custom middleware
│   ├── auth.js       # Authentication middleware
│   └── errorHandler.js
├── models/          # Mongoose models
│   ├── User.js
│   ├── Address.js
│   ├── Category.js
│   ├── Shop.js
│   ├── Product.js
│   ├── Order.js
│   └── Review.js
├── routes/          # API routes
│   ├── auth.js
│   ├── users.js
│   ├── products.js
│   ├── categories.js
│   ├── shops.js
│   ├── orders.js
│   ├── payments.js
│   └── location.js
├── scripts/         # Utility scripts
│   └── seedData.js  # Database seeder
├── utils/           # Utility functions
│   ├── validation.js
│   ├── notifications.js
│   └── location.js
└── server.js        # Application entry point
```

### Database Design
- **Users**: Multi-role user management with profile data
- **Addresses**: Delivery addresses with geocoding
- **Categories**: Hierarchical product categorization
- **Shops**: Business profiles with verification status
- **Products**: Product catalog with variants and inventory
- **Orders**: Order management with status tracking
- **Reviews**: Rating and review system

## 📦 Installation & Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git
- MongoDB Compass (optional, for database visualization)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Seed the database**
   ```bash
   docker-compose exec app npm run seed
   ```

5. **Access the API**
   - API Server: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - MongoDB Express: http://localhost:8081 (admin/admin123)
   - Health Check: http://localhost:3000/health

### Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start MongoDB**
   ```bash
   docker run -d -p 27017:27017 --name keypointmart-mongo mongo:7.0
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```

## 📚 API Documentation

### Interactive Documentation
The API includes comprehensive Swagger documentation available at:
- **Local**: http://localhost:3000/api-docs
- **Production**: https://your-domain.com/api-docs

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/change-password` - Change password

#### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/addresses` - Add delivery address
- `GET /api/users/orders` - Get user order history

#### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/tree` - Get category hierarchy
- `POST /api/categories` - Create category (Admin)
- `GET /api/categories/:id/products` - Get category products

#### Products
- `GET /api/products` - Get products with filtering
- `GET /api/products/search` - Search products
- `POST /api/products` - Create product (Shop Owner)
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product (Shop Owner)
- `POST /api/products/:id/images` - Upload product images

#### Shops
- `GET /api/shops` - Get all shops
- `GET /api/shops/nearby` - Get nearby shops
- `POST /api/shops` - Create shop (Shop Owner)
- `GET /api/shops/:id/dashboard` - Shop analytics (Owner)
- `GET /api/shops/:id/orders` - Shop orders (Owner)

#### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status (Shop Owner)
- `POST /api/orders/:id/review` - Add order review

#### Payments
- `GET /api/payments/methods/:shopId` - Get payment methods
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Payment history

#### Location Services
- `GET /api/location/nearby-shops` - Get nearby shops
- `POST /api/location/geocode` - Geocode address
- `POST /api/location/distance` - Calculate distance
- `GET /api/location/pincode/:pincode` - Get pincode information

## 🗄️ Database Schema

### Collections Overview

#### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  role: ['admin', 'customer', 'shop_owner', 'delivery_partner'],
  profilePicture: String,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  isActive: Boolean,
  // ... additional fields
}
```

#### Products Collection
```javascript
{
  name: String,
  description: String,
  shop: ObjectId (ref: Shop),
  category: ObjectId (ref: Category),
  price: Number,
  comparePrice: Number,
  stock: Number,
  images: [String],
  variants: [VariantSchema],
  // ... additional fields
}
```

#### Orders Collection
```javascript
{
  orderNumber: String (unique),
  customer: ObjectId (ref: User),
  shop: ObjectId (ref: Shop),
  items: [OrderItemSchema],
  status: String,
  payment: PaymentSchema,
  delivery: DeliverySchema,
  // ... additional fields
}
```

### Database Relationships
- Users ↔ Addresses (One-to-Many)
- Shops ↔ Products (One-to-Many)
- Categories ↔ Products (Many-to-Many)
- Orders ↔ Products (Many-to-Many through OrderItems)
- Users ↔ Orders (One-to-Many)

## 🔧 Configuration

### Environment Variables

#### Core Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/keypointmart` | Yes |

#### Authentication
| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | JWT expiration time | No |

#### Email Service (Nodemailer)
| Variable | Description | Required |
|----------|-------------|----------|
| `EMAIL_HOST` | SMTP host | No |
| `EMAIL_PORT` | SMTP port | No |
| `EMAIL_USER` | SMTP username | No |
| `EMAIL_PASS` | SMTP password | No |

#### SMS Service (Twilio)
| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No |

#### Payment Gateways
| Variable | Description | Required |
|----------|-------------|----------|
| `RAZORPAY_KEY_ID` | Razorpay key ID | No |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | No |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `PAYTM_MERCHANT_ID` | Paytm merchant ID | No |
| `PAYTM_MERCHANT_KEY` | Paytm merchant key | No |

#### Location Services
| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | No |

## 🌱 Database Seeding

The project includes a comprehensive database seeder with realistic test data.

### Seeding Command
```bash
# With npm
npm run seed

# With Docker
docker-compose exec app npm run seed
```

### Seeded Data Includes
- **Admin User**: admin@keypointmart.com / admin123
- **Shop Owners**: 4 verified shops with different business types
- **Customers**: 4 customer accounts with delivery addresses
- **Categories**: Electronics, Fashion, Food, Grocery with subcategories
- **Products**: 15+ products across different categories with realistic pricing
- **Orders**: 20 sample orders with various statuses and payment methods
- **Addresses**: Multiple delivery addresses with GPS coordinates

### Test Credentials
```
Admin:
  Email: admin@keypointmart.com
  Password: admin123

Shop Owner:
  Email: rajesh@electronics.com
  Password: password123

Customer:
  Email: john@example.com
  Password: password123
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Manual API Testing
Use the interactive Swagger documentation at `/api-docs` or tools like Postman to test endpoints.

### Health Check
```bash
curl http://localhost:3000/health
```

## 🚀 Deployment

### Production Environment Setup

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-strong-jwt-secret
   MONGODB_URI=mongodb://your-production-mongodb-uri
   ```

2. **Docker Production Build**
   ```bash
   docker build -t keypointmart-api .
   docker run -d -p 3000:3000 --env-file .env keypointmart-api
   ```

3. **Production Considerations**
   - Use a production-grade MongoDB deployment
   - Configure SSL/TLS certificates
   - Set up reverse proxy (Nginx)
   - Configure monitoring and logging
   - Set up backup strategies
   - Configure email/SMS services
   - Set up payment gateway credentials

### Deployment Platforms
- **Docker**: Complete containerization support
- **AWS**: ECS, Lambda, or EC2 deployment
- **Google Cloud**: Cloud Run, App Engine
- **Heroku**: Direct deployment support
- **DigitalOcean**: App Platform or Droplets

## 🔒 Security Features

### Implemented Security Measures
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive Joi validation
- **CORS Protection**: Configurable CORS policy
- **Helmet Security**: Security headers implementation
- **Account Lockout**: Failed login attempt protection
- **Role-based Access**: Fine-grained permission system

### Security Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Environment variable security
- API key rotation
- Secure communication protocols
- Data encryption at rest and in transit

## 📝 API Versioning

- **Current Version**: v1
- **Base URL**: `/api/`
- **Versioning Strategy**: URL path versioning
- **Backward Compatibility**: Maintained across minor versions

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Use meaningful commit messages
- Write comprehensive tests
- Update documentation for new features
- Follow REST API conventions

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📞 Support & Maintenance

### Issue Reporting
- Use GitHub issues for bug reports
- Provide detailed reproduction steps
- Include environment information
- Attach relevant logs or screenshots

### Feature Requests
- Submit feature requests via GitHub issues
- Provide clear use case descriptions
- Include mockups or examples if applicable

## 📄 License

This project is proprietary software. All rights reserved.

## 📈 Roadmap

### Upcoming Features
- [ ] Real-time notifications with WebSocket
- [ ] Advanced analytics and reporting
- [ ] Mobile app API extensions
- [ ] Multi-language support
- [ ] Advanced search with Elasticsearch
- [ ] AI-powered recommendation engine
- [ ] Advanced inventory management
- [ ] Delivery partner management
- [ ] Multi-tenant architecture enhancements
- [ ] Performance optimizations

---

**Built with ❤️ for KeyPointMart**

For technical support or queries, please contact the development team.