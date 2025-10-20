# API Testing Guide

Complete guide for testing KeyPointMart API endpoints with cURL, Postman, and automated tests.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Shop Operations](#shop-operations)
5. [Product Management](#product-management)
6. [Order Processing](#order-processing)
7. [Location Services](#location-services)
8. [Payment Integration](#payment-integration)

---

## Quick Start

### Prerequisites
```bash
# Ensure Docker services are running
docker-compose up -d

# Seed the database
docker-compose exec app npm run seed

# Verify API is running
curl http://localhost:3000/health
```

### Base URL
```
http://localhost:3000/api
```

### Test Credentials
```bash
# Admin
EMAIL="admin@keypointmart.com"
PASSWORD="admin123"

# Shop Owner
EMAIL="rajesh@electronics.com"
PASSWORD="password123"

# Customer
EMAIL="john@example.com"
PASSWORD="password123"
```

---

## Authentication

### 1. Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+919876543299",
    "password": "test123",
    "role": "customer"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "john@example.com",
    "password": "password123"
  }'
```

**Save the token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"john@example.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo $TOKEN
```

### 3. Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Forgot Password
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

---

## User Management

### 1. Get User Profile
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Update Profile
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith Updated",
    "gender": "male",
    "dateOfBirth": "1990-05-15"
  }'
```

### 3. Get User Addresses
```bash
curl -X GET http://localhost:3000/api/users/addresses \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Add New Address
```bash
curl -X POST http://localhost:3000/api/users/addresses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "home",
    "nickname": "My Home",
    "fullName": "John Smith",
    "phone": "+919876543215",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "landmark": "Near City Mall",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "isDefault": true
  }'
```

### 5. Update Address
```bash
curl -X PUT http://localhost:3000/api/users/addresses/{addressId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressLine1": "456 New Street",
    "isDefault": true
  }'
```

### 6. Delete Address
```bash
curl -X DELETE http://localhost:3000/api/users/addresses/{addressId} \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Get User Orders
```bash
curl -X GET "http://localhost:3000/api/users/orders?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Shop Operations

### 1. List All Shops
```bash
curl -X GET "http://localhost:3000/api/shops?page=1&limit=10"
```

### 2. Filter Shops by Business Type
```bash
curl -X GET "http://localhost:3000/api/shops?businessType=electronics"
```

### 3. Get Shop Details
```bash
SHOP_ID="68f36090b9f4f172d0515613"
curl -X GET "http://localhost:3000/api/shops/$SHOP_ID"
```

### 4. Get Shop Dashboard (Shop Owner Only)
```bash
# First login as shop owner
SHOP_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"rajesh@electronics.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Get dashboard
curl -X GET "http://localhost:3000/api/shops/$SHOP_ID/dashboard" \
  -H "Authorization: Bearer $SHOP_TOKEN"
```

### 5. Get Shop Products
```bash
curl -X GET "http://localhost:3000/api/products?shop=$SHOP_ID"
```

---

## Product Management

### 1. List All Products
```bash
curl -X GET "http://localhost:3000/api/products?page=1&limit=20"
```

### 2. Search Products
```bash
curl -X GET "http://localhost:3000/api/products?search=iphone"
```

### 3. Filter by Category
```bash
CATEGORY_ID="68f36090b9f4f172d05155c3"
curl -X GET "http://localhost:3000/api/products?category=$CATEGORY_ID"
```

### 4. Filter by Price Range
```bash
curl -X GET "http://localhost:3000/api/products?minPrice=10000&maxPrice=100000"
```

### 5. Filter by Shop
```bash
curl -X GET "http://localhost:3000/api/products?shop=$SHOP_ID"
```

### 6. Get Product Details
```bash
PRODUCT_ID="68f36090b9f4f172d0515637"
curl -X GET "http://localhost:3000/api/products/$PRODUCT_ID"
```

### 7. Get Featured Products
```bash
curl -X GET "http://localhost:3000/api/products?isFeatured=true"
```

### 8. Sort Products
```bash
# By price (ascending)
curl -X GET "http://localhost:3000/api/products?sort=price"

# By price (descending)
curl -X GET "http://localhost:3000/api/products?sort=-price"

# By rating
curl -X GET "http://localhost:3000/api/products?sort=-rating.average"

# By newest
curl -X GET "http://localhost:3000/api/products?sort=-createdAt"
```

---

## Order Processing

### 1. Create New Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "68f36090b9f4f172d0515613",
    "items": [
      {
        "product": "68f36090b9f4f172d051563b",
        "quantity": 2
      },
      {
        "product": "68f36090b9f4f172d0515637",
        "quantity": 1
      }
    ],
    "delivery": {
      "type": "delivery",
      "address": "68f36090b9f4f172d0515603"
    },
    "payment": {
      "method": "upi"
    },
    "customerNotes": "Please pack items carefully"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Order placed successfully",
  "data": {
    "order": {
      "orderNumber": "KPM2510190001",
      "items": [...],
      "subtotal": 149799,
      "deliveryFee": 0,
      "tax": 7490,
      "total": 157289,
      "status": "pending"
    }
  }
}
```

### 2. Get Order Details
```bash
ORDER_ID="68f54ad3c26eb4df2d34d071"
curl -X GET "http://localhost:3000/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Cancel Order
```bash
curl -X PUT "http://localhost:3000/api/orders/$ORDER_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Changed my mind"
  }'
```

### 4. Update Order Status (Shop Owner/Admin)
```bash
curl -X PUT "http://localhost:3000/api/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $SHOP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

**Valid Status Transitions:**
```
pending → confirmed → preparing → ready → out_for_delivery → delivered
         ↘ cancelled
```

### 5. Add Order Review
```bash
curl -X POST "http://localhost:3000/api/orders/$ORDER_ID/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": {
      "overall": 5,
      "delivery": 4,
      "quality": 5
    },
    "review": "Great products, fast delivery!"
  }'
```

---

## Location Services

### 1. Find Nearby Shops
```bash
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10"
```

**With Filters:**
```bash
# Filter by business type
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10&businessType=electronics"

# Filter by category
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10&category=$CATEGORY_ID"
```

### 2. Check Delivery Availability
```bash
curl -X POST http://localhost:3000/api/location/delivery-check \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "68f36090b9f4f172d0515613",
    "latitude": 19.0760,
    "longitude": 72.8777
  }'
```

### 3. Calculate Distance Between Points
```bash
curl -X POST http://localhost:3000/api/location/distance \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "latitude": 19.076,
      "longitude": 72.8777
    },
    "destination": {
      "latitude": 19.085,
      "longitude": 72.885
    }
  }'
```

### 4. Geocode Address
```bash
curl -X POST http://localhost:3000/api/location/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main Street, Mumbai, Maharashtra, India"
  }'
```

### 5. Reverse Geocode
```bash
curl -X POST http://localhost:3000/api/location/reverse-geocode \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777
  }'
```

### 6. Get Pincode Details
```bash
curl -X GET "http://localhost:3000/api/location/pincode/400001"
```

### 7. Detect Location from IP
```bash
curl -X GET "http://localhost:3000/api/location/detect"
```

---

## Payment Integration

### 1. Get Payment Methods for Shop
```bash
curl -X GET "http://localhost:3000/api/payments/methods/$SHOP_ID"
```

### 2. Initiate Payment
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "68f54ad3c26eb4df2d34d071",
    "paymentMethod": "upi",
    "gateway": "razorpay"
  }'
```

### 3. Verify Payment
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "68f54ad3c26eb4df2d34d071",
    "paymentId": "pay_123456789",
    "signature": "signature_hash_here",
    "gateway": "razorpay"
  }'
```

### 4. Get Payment History
```bash
curl -X GET "http://localhost:3000/api/payments/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**With Filters:**
```bash
# Filter by status
curl -X GET "http://localhost:3000/api/payments/history?status=paid" \
  -H "Authorization: Bearer $TOKEN"

# Filter by method
curl -X GET "http://localhost:3000/api/payments/history?method=upi" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -X GET "http://localhost:3000/api/payments/history?startDate=2025-01-01&endDate=2025-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Request Refund (Shop Owner/Admin)
```bash
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Authorization: Bearer $SHOP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "68f54ad3c26eb4df2d34d071",
    "amount": 157289,
    "reason": "Product out of stock"
  }'
```

### 6. Get Payment Analytics (Shop Owner/Admin)
```bash
curl -X GET "http://localhost:3000/api/payments/analytics?shopId=$SHOP_ID&startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer $SHOP_TOKEN"
```

---

## Category Management

### 1. List All Categories
```bash
curl -X GET "http://localhost:3000/api/categories"
```

### 2. Get Category Tree
```bash
curl -X GET "http://localhost:3000/api/categories/tree"
```

### 3. Get Category Details
```bash
curl -X GET "http://localhost:3000/api/categories/$CATEGORY_ID"
```

### 4. Get Featured Categories
```bash
curl -X GET "http://localhost:3000/api/categories?isFeatured=true"
```

---

## Testing with Postman

### Import Collection

1. Create a new collection in Postman
2. Set base URL as environment variable: `{{baseUrl}} = http://localhost:3000/api`
3. Create environment variable for token: `{{token}}`

### Pre-request Script (for authenticated requests)
```javascript
// Auto-login and set token
const loginRequest = {
  url: pm.environment.get('baseUrl') + '/auth/login',
  method: 'POST',
  header: 'Content-Type: application/json',
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      login: 'john@example.com',
      password: 'password123'
    })
  }
};

pm.sendRequest(loginRequest, (err, response) => {
  if (!err) {
    const token = response.json().data.token;
    pm.environment.set('token', token);
  }
});
```

### Authorization Header
```
Authorization: Bearer {{token}}
```

---

## Automated Testing

### Using Jest

**Install dependencies:**
```bash
npm install --save-dev jest supertest
```

**Example test file** (`tests/api/auth.test.js`):
```javascript
const request = require('supertest');
const app = require('../../server');

describe('Authentication API', () => {
  let token;

  test('POST /api/auth/login - should login successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'john@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('token');

    token = response.body.data.token;
  });

  test('GET /api/users/profile - should get user profile', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toHaveProperty('email');
  });
});
```

**Run tests:**
```bash
npm test
```

---

## Common Error Codes

```
200 OK                  - Successful GET request
201 Created             - Successful POST request
400 Bad Request         - Validation error
401 Unauthorized        - Missing or invalid token
403 Forbidden           - Insufficient permissions
404 Not Found           - Resource not found
500 Internal Error      - Server error
```

---

## Tips & Best Practices

1. **Always save tokens** for authenticated requests
2. **Use environment variables** for sensitive data
3. **Check response status** before processing data
4. **Handle pagination** for list endpoints
5. **Test error cases** as well as success cases
6. **Monitor rate limits** (100 requests per 15 minutes)
7. **Use appropriate HTTP methods** (GET, POST, PUT, DELETE)
8. **Include proper headers** (Content-Type, Authorization)

---

## Troubleshooting

### Issue: "Not authorized, no token provided"
**Solution:** Include Authorization header with Bearer token

### Issue: "Invalid token"
**Solution:** Re-login to get a fresh token (tokens expire after 7 days)

### Issue: "Validation error"
**Solution:** Check request body matches the required schema

### Issue: "Resource not found"
**Solution:** Verify the ID exists in the database

### Issue: Connection refused
**Solution:** Ensure Docker services are running: `docker-compose up -d`

---

## Support

For issues or questions, refer to:
- [Testing Report](./TESTING-REPORT.md)
- [Issues Found](./ISSUES-AND-FIXES.md)
- [API Documentation](http://localhost:3000/api-docs)
