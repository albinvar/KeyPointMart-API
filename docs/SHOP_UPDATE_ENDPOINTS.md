# Shop Update Endpoints - Complete API Documentation

This document provides comprehensive documentation for all shop profile update endpoints, including request/response examples for app implementation.

## Table of Contents
1. [Authentication](#authentication)
2. [Get Shop Details](#1-get-shop-details)
3. [Update Basic Information](#2-update-basic-information)
4. [Update Contact Information](#3-update-contact-information)
5. [Update Address](#4-update-address)
6. [Update Business Hours](#5-update-business-hours)
7. [Update Settings](#6-update-settings)
8. [Update Bank Details](#7-update-bank-details)
9. [Error Responses](#error-responses)

---

## Authentication

All update endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Shop Owner Restriction**: Only the shop owner can update their shop. Admins have override access.

---

## 1. Get Shop Details

Retrieve complete shop information including profile, business hours, settings, and statistics.

### Endpoint
```
GET /api/shops/:id
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Authorization: Bearer <token> (optional for public viewing)
```

### Request Example
```bash
curl -X GET http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613 \
  -H "Authorization: Bearer eyJhbGc..."
```

### Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "businessName": "Rajesh Premium Electronics",
      "description": "Leading electronics retailer with the latest gadgets and home appliances",
      "businessType": "electronics",
      "slug": "rajesh-electronics-store-1760780432776",
      "contactInfo": {
        "phone": "+919876543211",
        "email": "contact@rajeshelectronics.com",
        "website": "https://rajeshelectronics.com"
      },
      "address": {
        "addressLine1": "456 New Electronics Hub",
        "addressLine2": "Ground Floor, Building A",
        "landmark": "Opposite City Mall",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "400001",
        "coordinates": {
          "latitude": 19.076,
          "longitude": 72.8777
        }
      },
      "businessHours": [
        {
          "day": "monday",
          "isOpen": true,
          "openTime": "09:00",
          "closeTime": "21:00"
        },
        {
          "day": "sunday",
          "isOpen": false
        }
      ],
      "settings": {
        "isOpen": true,
        "acceptsOrders": true,
        "minimumOrderAmount": 100,
        "deliveryFee": 50,
        "freeDeliveryAbove": 1000,
        "serviceRadius": 10,
        "preparationTime": 45,
        "paymentMethods": ["cash", "card", "upi"]
      },
      "verification": {
        "status": "verified",
        "verifiedAt": "2025-10-18T09:40:32.763Z"
      },
      "stats": {
        "totalOrders": 151,
        "totalRevenue": 750000,
        "averageRating": 4.5,
        "totalReviews": 89,
        "totalProducts": 5
      },
      "isActive": true,
      "isFeatured": true,
      "createdAt": "2025-10-18T09:40:32.775Z",
      "updatedAt": "2025-10-20T09:21:36.649Z"
    }
  }
}
```

---

## 2. Update Basic Information

Update shop's business name, description, business type, and categories.

### Endpoint
```
PUT /api/shops/:id/basic-info
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "businessName": "Rajesh Premium Electronics",
  "description": "Leading electronics retailer with the latest gadgets and home appliances",
  "businessType": "electronics",
  "categories": ["68f36090b9f4f172d05155c3"]
}
```

**Field Descriptions:**
- `businessName` (string, max 200 chars) - Business name displayed to customers
- `description` (string, max 1000 chars) - Business description
- `businessType` (enum) - One of: `restaurant`, `shop`, `firm`, `grocery`, `pharmacy`, `electronics`, `clothing`, `other`
- `categories` (array of ObjectIds) - Category IDs the shop belongs to

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/basic-info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "businessName": "Rajesh Premium Electronics",
    "description": "Leading electronics retailer with the latest gadgets and home appliances",
    "businessType": "electronics"
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Basic information updated successfully",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "businessName": "Rajesh Premium Electronics",
      "description": "Leading electronics retailer with the latest gadgets and home appliances",
      "businessType": "electronics",
      "categories": [
        {
          "_id": "68f36090b9f4f172d05155c3",
          "name": "Electronics",
          "slug": "electronics"
        }
      ],
      "owner": {
        "_id": "68f3608eb9f4f172d05155ac",
        "name": "Rajesh Electronics",
        "email": "rajesh@electronics.com"
      },
      "updatedAt": "2025-10-20T09:14:44.498Z"
    }
  }
}
```

---

## 3. Update Contact Information

Update shop's phone, email, website, and WhatsApp contact details.

### Endpoint
```
PUT /api/shops/:id/contact
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "phone": "+919876543211",
  "email": "contact@rajeshelectronics.com",
  "website": "https://rajeshelectronics.com",
  "whatsapp": "+919876543211"
}
```

**Field Descriptions:**
- `phone` (string, E.164 format) - Business phone number
- `email` (string, valid email) - Business email address
- `website` (string, valid URL) - Business website URL
- `whatsapp` (string, E.164 format) - WhatsApp number for customer support

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/contact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "phone": "+919876543211",
    "email": "contact@rajeshelectronics.com",
    "website": "https://rajeshelectronics.com",
    "whatsapp": "+919876543211"
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Contact information updated successfully",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "contactInfo": {
        "phone": "+919876543211",
        "email": "contact@rajeshelectronics.com",
        "website": "https://rajeshelectronics.com"
      },
      "updatedAt": "2025-10-20T09:15:54.372Z"
    }
  }
}
```

---

## 4. Update Address

Update shop's physical address and GPS coordinates.

### Endpoint
```
PUT /api/shops/:id/address
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "addressLine1": "456 New Electronics Hub",
  "addressLine2": "Ground Floor, Building A",
  "landmark": "Opposite City Mall",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pincode": "400001",
  "coordinates": {
    "latitude": 19.076,
    "longitude": 72.8777
  }
}
```

**Field Descriptions:**
- `addressLine1` (string, required) - Primary address line
- `addressLine2` (string, optional) - Secondary address line
- `landmark` (string, optional) - Nearby landmark for easier location
- `city` (string, required) - City name
- `state` (string, required) - State name
- `country` (string, default: "India") - Country name
- `pincode` (string, required, 6 digits) - Postal code
- `coordinates.latitude` (number, -90 to 90) - GPS latitude
- `coordinates.longitude` (number, -180 to 180) - GPS longitude

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "addressLine1": "456 New Electronics Hub",
    "addressLine2": "Ground Floor, Building A",
    "landmark": "Opposite City Mall",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "coordinates": {
      "latitude": 19.076,
      "longitude": 72.8777
    }
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Address updated successfully",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "address": {
        "addressLine1": "456 New Electronics Hub",
        "addressLine2": "Ground Floor, Building A",
        "landmark": "Opposite City Mall",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "400001",
        "coordinates": {
          "latitude": 19.076,
          "longitude": 72.8777
        }
      },
      "updatedAt": "2025-10-20T09:17:13.254Z"
    }
  }
}
```

---

## 5. Update Business Hours

Update shop's operating hours for each day of the week.

### Endpoint
```
PUT /api/shops/:id/business-hours
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "businessHours": [
    {
      "day": "monday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "tuesday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "wednesday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "thursday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "friday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "saturday",
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "21:00"
    },
    {
      "day": "sunday",
      "isOpen": false
    }
  ]
}
```

**Field Descriptions:**
- `businessHours` (array, required) - Array of business hours for each day
  - `day` (enum, required) - One of: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
  - `isOpen` (boolean, required) - Whether the shop is open on this day
  - `openTime` (string, HH:MM format) - Opening time (e.g., "09:00")
  - `closeTime` (string, HH:MM format) - Closing time (e.g., "21:00")

**Note:** If `isOpen` is `false`, `openTime` and `closeTime` are not required.

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/business-hours \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "businessHours": [
      {"day": "monday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "thursday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "friday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "saturday", "isOpen": true, "openTime": "09:00", "closeTime": "21:00"},
      {"day": "sunday", "isOpen": false}
    ]
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Business hours updated successfully",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "businessHours": [
        {
          "day": "monday",
          "isOpen": true,
          "openTime": "09:00",
          "closeTime": "21:00",
          "_id": "68f5fe2b3fc958d24a5efdb7"
        },
        {
          "day": "sunday",
          "isOpen": false,
          "_id": "68f5fe2b3fc958d24a5efdbd"
        }
      ],
      "updatedAt": "2025-10-20T09:17:31.642Z"
    }
  }
}
```

---

## 6. Update Settings

Update shop's operational settings including delivery, payments, and service configuration.

### Endpoint
```
PUT /api/shops/:id/settings
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "isOpen": true,
  "acceptsOrders": true,
  "minimumOrderAmount": 100,
  "deliveryFee": 50,
  "freeDeliveryAbove": 1000,
  "serviceRadius": 10,
  "preparationTime": 45,
  "paymentMethods": ["cash", "card", "upi"]
}
```

**Field Descriptions:**
- `isOpen` (boolean) - Whether the shop is currently open for business
- `acceptsOrders` (boolean) - Whether the shop is accepting new orders
- `minimumOrderAmount` (number, min: 0) - Minimum order value in currency
- `deliveryFee` (number, min: 0) - Delivery charge per order
- `freeDeliveryAbove` (number, min: 0) - Free delivery threshold amount
- `serviceRadius` (number, 1-50) - Service area radius in kilometers
- `preparationTime` (number, min: 5) - Average order preparation time in minutes
- `paymentMethods` (array of enums) - Accepted payment methods
  - Options: `cash`, `card`, `upi`, `wallet`, `bank_transfer`

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "deliveryFee": 50,
    "freeDeliveryAbove": 1000,
    "isOpen": true,
    "acceptsOrders": true,
    "minimumOrderAmount": 100,
    "paymentMethods": ["cash", "card", "upi"],
    "serviceRadius": 10,
    "preparationTime": 45
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Settings updated successfully",
  "data": {
    "shop": {
      "_id": "68f36090b9f4f172d0515613",
      "settings": {
        "isOpen": true,
        "acceptsOrders": true,
        "minimumOrderAmount": 100,
        "deliveryFee": 50,
        "freeDeliveryAbove": 1000,
        "serviceRadius": 10,
        "preparationTime": 45,
        "paymentMethods": ["cash", "card", "upi"]
      },
      "updatedAt": "2025-10-20T09:21:36.649Z"
    }
  }
}
```

---

## 7. Update Bank Details

Update shop's bank account information for payment settlements.

### Endpoint
```
PUT /api/shops/:id/bank-details
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "accountHolderName": "Rajesh Electronics Store",
  "accountNumber": "1234567890123456",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank"
}
```

**Field Descriptions:**
- `accountHolderName` (string) - Name on the bank account
- `accountNumber` (string) - Bank account number
- `ifscCode` (string) - IFSC code for Indian banks
- `bankName` (string) - Name of the bank

**Security Note:** Bank details are stored in the `documents.bankDetails` field and are only returned to the shop owner.

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/bank-details \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "accountHolderName": "Rajesh Electronics Store",
    "accountNumber": "1234567890123456",
    "ifscCode": "HDFC0001234",
    "bankName": "HDFC Bank"
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Bank details updated successfully",
  "data": {
    "bankDetails": {
      "accountNumber": "1234567890123456",
      "ifscCode": "HDFC0001234",
      "bankName": "HDFC Bank",
      "accountHolderName": "Rajesh Electronics Store"
    }
  }
}
```

**Note:** Only bank details are returned in the response for security reasons. The full shop object is not exposed.

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
No authentication token provided or token is invalid.

```json
{
  "status": "error",
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
User is not the shop owner (or admin).

```json
{
  "status": "error",
  "message": "Not authorized to update this shop"
}
```

### 404 Not Found
Shop with the given ID does not exist.

```json
{
  "status": "error",
  "message": "Shop not found"
}
```

### 400 Bad Request
Invalid data provided (validation error).

```json
{
  "status": "error",
  "message": "Validation error message describing the issue",
  "stack": "Error stack trace (in development mode only)"
}
```

**Common Validation Errors:**
- Invalid email format
- Invalid phone number format
- Invalid business type enum value
- Invalid payment method enum value
- Invalid time format (must be HH:MM)
- Invalid pincode format (must be 6 digits)
- Latitude/longitude out of range
- String exceeds maximum length

---

## Integration Notes for App Development

### 1. Authentication Flow
```javascript
// 1. User logs in
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: 'email@example.com', password: 'pass123' })
});
const { data } = await loginResponse.json();
const token = data.token;
const shopId = data.shop.id;

// 2. Use token for subsequent requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

### 2. Updating Shop Profile (Multi-Step Form Example)
```javascript
// Step 1: Basic Info
await fetch(`/api/shops/${shopId}/basic-info`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    businessName: 'My Shop',
    description: 'Shop description',
    businessType: 'electronics'
  })
});

// Step 2: Contact Info
await fetch(`/api/shops/${shopId}/contact`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    phone: '+919876543210',
    email: 'shop@example.com',
    website: 'https://myshop.com'
  })
});

// Step 3: Address
await fetch(`/api/shops/${shopId}/address`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    addressLine1: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    coordinates: { latitude: 19.076, longitude: 72.8777 }
  })
});
```

### 3. Fetching Shop Profile
```javascript
const response = await fetch(`/api/shops/${shopId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
const shop = data.shop;

// Access shop data
console.log(shop.businessName);
console.log(shop.settings.deliveryFee);
console.log(shop.businessHours);
```

### 4. Error Handling
```javascript
try {
  const response = await fetch(`/api/shops/${shopId}/basic-info`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updateData)
  });

  const result = await response.json();

  if (result.status === 'error') {
    // Handle error
    alert(result.message);
  } else {
    // Success
    console.log('Shop updated:', result.data.shop);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### 5. Business Hours Helper
```javascript
// Generate default business hours
const defaultBusinessHours = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
].map(day => ({
  day,
  isOpen: day !== 'sunday',
  openTime: '09:00',
  closeTime: '21:00'
}));

// Update business hours
await fetch(`/api/shops/${shopId}/business-hours`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ businessHours: defaultBusinessHours })
});
```

---

## Testing with Sample Data

Use the following test credentials from the seed data:

**Shop Owner:**
- Email: `rajesh@electronics.com`
- Password: `password123`
- Phone: `+919876543211`
- Shop ID: `68f36090b9f4f172d0515613`

**API Base URL:**
- Development: `http://100.100.22.22:3000`
- Swagger Docs: `http://100.100.22.22:3000/api-docs`

**Quick Test Sequence:**
```bash
# 1. Login
TOKEN=$(curl -X POST http://100.100.22.22:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"rajesh@electronics.com","password":"password123"}' \
  -s | jq -r '.data.token')

# 2. Get shop details
curl -X GET http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613 \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Update settings
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"deliveryFee":50,"freeDeliveryAbove":1000}' | jq
```

---

## Summary

All shop update endpoints follow a consistent pattern:
- **URL Pattern:** `/api/shops/:id/{section-name}`
- **Method:** `PUT`
- **Auth:** Required (Bearer token)
- **Access:** Shop owner or admin only
- **Response:** JSON with `status`, `message`, and `data` fields

Each endpoint updates only specific fields, ensuring security by preventing accidental updates to sensitive data like verification status or statistics.
