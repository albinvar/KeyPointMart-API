# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyPointMart is an e-commerce API platform built with Node.js, Express, and MongoDB. It's a multi-tenant marketplace connecting customers with local shops, featuring location-based services, order management, payment integration, and role-based access control.

## Development Commands

### Docker-based Development (Recommended)
```bash
# Start all services (API, MongoDB, Mongo Express)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Seed the database
docker-compose exec app npm run seed

# Access containers
docker-compose exec app sh
docker-compose exec mongo mongosh keypointmart
```

### Local Development
```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Production server
npm start

# Database seeding
npm run seed

# Run tests
npm test
```

### Access Points
- API Server: http://localhost:3000 (or http://100.100.22.22:3000 via Tailscale)
- API Documentation (Swagger): http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health
- MongoDB Express: http://localhost:8081 (admin/admin123)
- WebSocket: ws://localhost:3000 (Socket.io enabled)

## Architecture Overview

### Authentication & Authorization
- **JWT-based authentication**: Tokens are verified via the `protect` middleware in `src/middleware/auth.js`
- **Dual login methods**:
  - Traditional: Email/Phone + Password (`POST /api/auth/login`)
  - OTP-based: Phone + OTP (`POST /api/auth/send-otp` → `POST /api/auth/verify-otp`)
- **OTP Login**: Hardcoded OTP "1234" for all numbers in development (5-minute expiry)
- **Role-based access control**: Four roles - `admin`, `customer`, `shop_owner`, `delivery_partner`
- **Authorization middleware**: Use `authorize(...roles)` to restrict routes by role
- **Shop ownership validation**: `checkShopOwnership` middleware ensures shop owners can only access their own shops
- **User activation**: Inactive users (isActive: false) are blocked from authentication

### Request Flow
1. Request → Rate limiting (100 requests/15min per IP)
2. Request → Auth middleware (`protect`) extracts and validates JWT
3. Request → Role authorization (`authorize`) checks user role
4. Request → Route handler in controllers
5. Response ← Error handler middleware catches all errors

### Multi-tenant Architecture
- Each **Shop** is owned by a **User** with role `shop_owner`
- **Products** belong to a specific **Shop** (not global)
- **Orders** are shop-specific (each order is for one shop)
- Shop owners can only manage their own shop's products and orders
- Admins have access to all shops

### Database Relationships
- User → Addresses (One-to-Many)
- User → Cart (One-to-One)
- User → Shop (One-to-One via owner field)
- Shop → Products (One-to-Many)
- Category → Products (Many-to-Many via category reference)
- Order → User (customer reference)
- Order → Shop (shop reference)
- Order → Products (Many-to-Many via items array)
- Cart → Products (Many-to-Many via items array)
- Cart → Shops (Many-to-Many - multi-vendor cart)

### Location-Based Services
- Shops have GPS coordinates (location.coordinates)
- Location services use geospatial queries for "nearby shops" functionality
- Address geocoding converts addresses to coordinates
- Distance calculation between locations

### Payment Gateway Integration
- Multiple payment providers supported: Razorpay, Stripe, Paytm
- Cash on Delivery (COD) also available
- Payment methods are shop-specific (shops configure their own)
- Payment verification happens after initiation

### Shopping Cart System
- **Persistent cart** per user (MongoDB-backed with 30-day TTL)
- **Auto-validation**: Prices, stock availability, and product status checked on retrieval
- **Multi-vendor support**: Cart items grouped by shop for separate checkout
- **Delivery fee calculation**: Per-shop delivery fees with free delivery threshold
- **Stock tracking**: Real-time availability checks before adding items
- **Guest cart merging**: Ability to merge guest cart with user cart on login

### Real-time Order Tracking (WebSocket)
- **Socket.io integration** with JWT authentication
- **Room-based messaging**: User rooms, order rooms, shop rooms
- **Real-time events**:
  - Order creation notifications (customer & shop owner)
  - Order status updates (preparing, ready, out_for_delivery, delivered)
  - Order cancellations (with reason)
  - Delivery partner location updates (planned)
- **Event subscriptions**: Clients subscribe to specific order tracking
- **Connection health**: Ping/pong heartbeat mechanism

## Code Organization

### Controllers
All business logic lives in controllers (`src/controllers/`). Each controller handles a specific domain:
- `authController.js`: Registration, login (password & OTP), password reset, email/phone verification
- `userController.js`: User profile, addresses, order history
- `productController.js`: Product CRUD, search, filtering
- `categoryController.js`: Category hierarchy, tree structure
- `shopController.js`: Shop registration, dashboard, analytics
- `orderController.js`: Order creation, status updates, reviews, real-time event emission
- `paymentController.js`: Payment initiation, verification, history
- `locationController.js`: Nearby shops, geocoding, distance calculation
- `cartController.js`: Add/remove items, update quantities, cart validation, checkout preparation

### Models
Mongoose models in `src/models/` define schema and validation:
- `User.js`: Password hashing (bcrypt), JWT token generation, OTP storage (loginOtp, loginOtpExpire)
- `Shop.js`: Business hours, verification status, delivery zones
- `Product.js`: Variants, stock management, images
- `Order.js`: Order items, payment details, delivery tracking, status history
- `Category.js`: Hierarchical structure (parent-child)
- `Address.js`: GPS coordinates for delivery
- `Review.js`: Product/order reviews
- `Cart.js`: User cart with items, auto-validation, TTL (30 days), shop grouping

### Middleware
- `auth.js`: Authentication (protect, authorize, checkShopOwnership)
- `errorHandler.js`: Global error handling and asyncHandler wrapper

### Utilities
- `validation.js`: Joi schemas for input validation
- `notifications.js`: Email/SMS notifications (Nodemailer, Twilio)
- `location.js`: Geospatial calculations and geocoding

### Configuration
- `socket.js`: Socket.io initialization, room management, event handlers, real-time messaging

## Working with Authentication

### Adding Protected Routes
```javascript
const { protect, authorize } = require('../middleware/auth');

// Authenticated users only
router.get('/profile', protect, controller.getProfile);

// Admin only
router.get('/users', protect, authorize('admin'), controller.getAllUsers);

// Shop owners and admins
router.put('/products/:id', protect, authorize('shop_owner', 'admin'), controller.updateProduct);

// Shop ownership validation
router.get('/shops/:shopId/dashboard', protect, checkShopOwnership, controller.getDashboard);
```

### User Object in Requests
After `protect` middleware, `req.user` contains the authenticated user (password excluded):
```javascript
req.user._id        // User ID
req.user.role       // User role
req.user.email      // User email
req.user.isActive   // Account status
```

### OTP-Based Login
Passwordless login using phone number and OTP (one-time password):

**Step 1: Send OTP**
```javascript
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543211"
}

// Response (development only shows OTP)
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "phone": "+919876543211",
    "expiresIn": "5 minutes",
    "otp": "1234"  // Hardcoded in development
  }
}
```

**Step 2: Verify OTP and Login**
```javascript
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543211",
  "otp": "1234"
}

// Response includes JWT token
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { ... },
    "shop": { ... },  // If shop_owner
    "token": "eyJhbGc..."
  }
}
```

**Note**: In development, OTP is always "1234" for all phone numbers. In production, a random 6-digit OTP is generated and sent via SMS.

## Database Seeding

The seeder (`src/scripts/seedData.js`) creates realistic test data. Always run after fresh database setup.

### Seeded Test Credentials

**Traditional Login (Email/Phone + Password):**
```
Admin:
  Email: admin@keypointmart.com
  Phone: +919876543210
  Password: admin123

Shop Owner (Rajesh Electronics):
  Email: rajesh@electronics.com
  Phone: +919876543211
  Password: password123

Customer (John):
  Email: john@example.com
  Phone: +919876543214
  Password: password123
```

**OTP Login (Phone + OTP):**
```
All seeded users can login with their phone number using OTP "1234"
Example:
  Phone: +919876543211
  OTP: 1234
```

### Seeded Data Includes
- 1 admin user
- 4 shop owners with verified shops
- 4 customers with delivery addresses
- 15+ products across categories
- 20 sample orders with various statuses
- Category hierarchy (Electronics, Fashion, Food, Grocery)

## Environment Variables

Required variables (see `.env.example`):
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret (change in production!)
- `PORT`: Server port (default: 3000)

Optional but recommended for production:
- Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Payment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `STRIPE_SECRET_KEY`, etc.
- Location: `GOOGLE_MAPS_API_KEY`

## Common Development Patterns

### Error Handling
Use `asyncHandler` wrapper for async route handlers:
```javascript
const { asyncHandler } = require('../middleware/errorHandler');

exports.myController = asyncHandler(async (req, res) => {
  // Your async code - errors are automatically caught
});
```

### Validation
Input validation uses Joi schemas from `utils/validation.js`. Always validate user input before processing.

### Response Format
Standardized JSON responses:
```javascript
// Success
res.status(200).json({
  status: 'success',
  data: { ... }
});

// Error
res.status(400).json({
  status: 'error',
  message: 'Error description'
});
```

## Testing the API

1. Start services: `docker-compose up -d`
2. Seed database: `docker-compose exec app npm run seed`
3. Visit Swagger docs: http://localhost:3000/api-docs
4. Use test credentials to authenticate
5. Copy JWT token and use "Authorize" button in Swagger

## MongoDB Access

### Via Mongo Express (GUI)
- URL: http://localhost:8081
- Username: admin
- Password: admin123

### Via CLI
```bash
# Access MongoDB shell
docker-compose exec mongo mongosh keypointmart

# View collections
show collections

# Query examples
db.users.find({ role: 'admin' })
db.shops.find({ isVerified: true })
db.orders.find({ status: 'pending' })
```

## Important Notes

- **Never commit `.env` file** - use `.env.example` as template
- **JWT_SECRET must be changed** in production environments
- **Rate limiting** is set to 100 requests/15min per IP (adjust in `server.js`)
- **File uploads** go to `/uploads` directory (mapped via Docker volume)
- **Shop ownership** must be validated for shop-specific operations
- **Order numbers** are auto-generated and unique per order
- **Password hashing** happens automatically via User model pre-save hook

## Testing Summary (October 2025)

### All Features Tested and Working ✅

**Tested Features:**
1. ✅ Authentication (login, register, password reset)
2. ✅ User management (profile, addresses)
3. ✅ Categories (list, tree structure)
4. ✅ Products (list, search, pagination)
5. ✅ Shops (list, dashboard, business hours)
6. ✅ Orders (customer orders, shop orders, history)
7. ✅ Payments (methods, history)
8. ✅ Location services (nearby shops, delivery check)

### Issues Found and Fixed

#### Issue #1: Missing User Profile Endpoints (CRITICAL)
**Problem:** No `/api/users/profile` endpoint existed. Users had to use `/api/users/:id` with their own ID.

**Fix:** Added `getProfile()` and `updateProfile()` controller functions and routes.
- **Files Modified:**
  - `src/controllers/userController.js` - Added getProfile() and updateProfile()
  - `src/routes/users.js` - Added GET/PUT /profile routes
- **Location:** src/controllers/userController.js:84-169

**Impact:** Improved UX - users can now access their profile directly without knowing their ID.

#### Issue #2: Double Password Hashing (CRITICAL - From Previous Session)
**Problem:** Passwords were hashed twice (manually in seedData.js + automatically by User model hook).

**Fix:** Removed manual bcrypt hashing from seedData.js.
- **File:** src/scripts/seedData.js
- **Change:** Changed from `password: await bcrypt.hash('admin123', 12)` to `password: 'admin123'`

**Impact:** Authentication now works correctly for all seeded users.

#### Issue #3: Shop Business Hours Crash (CRITICAL - From Previous Session)
**Problem:** Shop endpoint crashed with "Value lowercase out of range" error.

**Fix:** Fixed toLocaleDateString() usage in Shop model.
- **File:** src/models/Shop.js:324
- **Before:** `{ weekday: 'lowercase' }`
- **After:** `{ weekday: 'long' }).toLowerCase()`

**Impact:** Shop endpoints now work correctly with business hours.

#### Issue #4: Duplicate MongoDB Indexes (WARNING - From Previous Session)
**Problem:** Mongoose warnings about duplicate indexes on unique fields.

**Fix:** Removed explicit `.index()` calls for fields with `unique: true`.
- **Files:** User.js, Category.js, Product.js, Shop.js, Order.js
- **Removed:** Duplicate index declarations for email, phone, slug, orderNumber

**Impact:** Cleaner logs, no performance impact.

#### Issue #5: Deprecated MongoDB Options (WARNING - From Previous Session)
**Problem:** Warnings about useNewUrlParser and useUnifiedTopology being deprecated.

**Fix:** Removed deprecated options from mongoose.connect().
- **Files:** src/config/database.js, src/scripts/seedData.js

**Impact:** Cleaner logs, using latest MongoDB driver defaults.

### Docker Configuration ✅

**Services Running:**
- **API**: http://localhost:3000 (Node.js/Express)
- **MongoDB**: localhost:27017 (MongoDB 7.0)
- **Mongo Express**: http://localhost:8081 (Database UI)

**Container Names:**
- keypointmart-api
- keypointmart-mongo
- keypointmart-mongo-express

**Code Hot-Reload:** Enabled via nodemon and Docker volume mounting.

### Test Data Summary

**Database includes:**
- 9 users (1 admin, 4 shop owners, 4 customers)
- 24 categories (8 root + 16 subcategories)
- 5 addresses
- 4 verified shops
- 15 products
- 20 orders (various statuses)

**Test Credentials:**
```
Admin:      admin@keypointmart.com / admin123
Shop Owner: rajesh@electronics.com / password123
Customer:   john@example.com / password123
```

### API Endpoints Verified

**Working Endpoints:**
- POST /api/auth/login
- POST /api/auth/register
- GET /api/users/profile (NEW)
- PUT /api/users/profile (NEW)
- GET /api/users/addresses
- POST /api/users/addresses
- GET /api/users/orders
- GET /api/categories
- GET /api/categories/tree
- GET /api/products
- GET /api/shops
- GET /api/shops/:id/dashboard
- GET /api/location/nearby-shops
- POST /api/location/delivery-check
- GET /api/payments/methods/:shopId
- GET /api/payments/history

**All endpoints tested with proper authentication and authorization.**

## Shopping Cart API

### Cart Operations

**Get User Cart:**
```bash
GET /api/cart
Authorization: Bearer <token>

# Returns cart with all items, prices, stock status
```

**Add Item to Cart:**
```bash
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "68f36090b9f4f172d0515614",
  "quantity": 2,
  "variantId": "optional-variant-id"
}
```

**Update Item Quantity:**
```bash
PUT /api/cart/items/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 5
}
```

**Remove Item:**
```bash
DELETE /api/cart/items/:productId
Authorization: Bearer <token>
```

**Get Cart Grouped by Shop (for checkout):**
```bash
GET /api/cart/by-shop
Authorization: Bearer <token>

# Returns cart items grouped by shop with delivery fees
```

**Validate Cart:**
```bash
GET /api/cart/validate
Authorization: Bearer <token>

# Checks prices, stock, and availability
# Updates cart if changes detected
```

### Cart Features
- ✅ Automatic price updates
- ✅ Stock availability validation
- ✅ Unavailable item marking
- ✅ Multi-shop cart support
- ✅ Delivery fee calculation per shop
- ✅ 30-day TTL (auto-cleanup)
- ✅ Minimum order validation

## Real-time WebSocket Integration

### Connecting to WebSocket

**Client-side (JavaScript):**
```javascript
import io from 'socket.io-client';

const socket = io('http://100.100.22.22:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  },
  transports: ['websocket', 'polling']
});

// Connection established
socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

### Order Tracking Events

**Subscribe to Order Updates:**
```javascript
// Subscribe to specific order
socket.emit('subscribe:order', orderId);

// Listen for status updates
socket.on('order:status_update', (data) => {
  console.log('Order Status:', data.status);
  console.log('Message:', data.message);
  console.log('Updated by:', data.updatedBy);
});

// Listen for order updates
socket.on('order:updated', (data) => {
  console.log('Order updated:', data);
});

// Unsubscribe when done
socket.emit('unsubscribe:order', orderId);
```

**Shop Owner - New Order Notifications:**
```javascript
// Subscribe to shop notifications
socket.emit('subscribe:shop', shopId);

// Listen for new orders
socket.on('order:new', (data) => {
  console.log('New order received!');
  console.log('Order:', data.orderNumber);
  console.log('Total:', data.total);
  playNotificationSound();
});

// Listen for order status changes
socket.on('order:status_changed', (data) => {
  updateDashboard(data);
});
```

**Customer - Order Creation:**
```javascript
socket.on('order:created', (data) => {
  console.log('Your order was placed!');
  console.log('Order Number:', data.orderNumber);
  console.log('Shop:', data.shop.businessName);
});
```

**Order Cancellation:**
```javascript
socket.on('order:cancelled', (data) => {
  console.log('Order cancelled');
  console.log('Reason:', data.reason);
  console.log('Cancelled by:', data.cancelledBy);
});
```

### WebSocket Events Reference

| Event | Emitted To | Description |
|-------|------------|-------------|
| `connected` | Client | Connection confirmation |
| `order:created` | Customer | New order created |
| `order:new` | Shop Owner | New order received |
| `order:status_update` | Order Room | Real-time status change |
| `order:updated` | Customer | Order updated notification |
| `order:status_changed` | Shop Room | Status changed in shop |
| `order:cancelled` | All parties | Order cancellation |
| `order:location_update` | Order Room | Delivery partner location |

### Health Check
```javascript
// Ping/pong for connection health
setInterval(() => {
  socket.emit('ping');
}, 30000);

socket.on('pong', (data) => {
  console.log('Connection alive:', data.timestamp);
});
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/phone + password
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Cart
- `GET /api/cart` - Get user cart
- `GET /api/cart/summary` - Quick cart overview
- `GET /api/cart/by-shop` - Cart grouped by shops
- `GET /api/cart/validate` - Validate cart items
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update item quantity
- `DELETE /api/cart/items/:productId` - Remove item
- `DELETE /api/cart` - Clear cart
- `POST /api/cart/merge` - Merge guest cart

### Products & Categories
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `GET /api/categories` - List categories
- `GET /api/categories/tree` - Category hierarchy

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status (shop owner)
- `PUT /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/review` - Add review

### Shops
- `GET /api/shops` - List shops
- `GET /api/shops/:id` - Get shop details
- `GET /api/shops/:id/dashboard` - Shop owner dashboard
- `GET /api/shops/:id/orders` - Shop orders

### Location
- `GET /api/location/nearby-shops` - Find nearby shops
- `POST /api/location/delivery-check` - Check delivery availability
- `POST /api/location/distance` - Calculate distance
- `POST /api/location/route` - Get route information

### Payments
- `GET /api/payments/methods/:shopId` - Get payment methods
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Payment history

