# Delivery Settings API Documentation

Complete API documentation for shop delivery settings and delivery zones management.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Get Delivery Settings](#1-get-delivery-settings)
4. [Update Delivery Settings](#2-update-delivery-settings)
5. [Get Delivery Zones](#3-get-delivery-zones)
6. [Add Delivery Zone](#4-add-delivery-zone)
7. [Update Delivery Zone](#5-update-delivery-zone)
8. [Delete Delivery Zone](#6-delete-delivery-zone)
9. [Integration Guide](#integration-guide)
10. [Testing](#testing)

---

## Overview

The Delivery Settings API allows shop owners to configure their delivery options, including:
- **Global Delivery Settings**: Delivery fee, free delivery threshold, service radius
- **Delivery Zones**: Specific areas with custom delivery fees and times
- **Delivery Methods**: Own delivery vs third-party delivery services

### Key Features
- ✅ Global delivery fee configuration
- ✅ Free delivery threshold
- ✅ Service radius (1-50 km)
- ✅ Zone-based delivery (pincode, area, or radius)
- ✅ Per-zone delivery fees and minimum order amounts
- ✅ Estimated delivery times per zone
- ✅ Active/inactive zone management

---

## Authentication

Most endpoints require JWT authentication with shop owner or admin role.

```
Authorization: Bearer <your_jwt_token>
```

**Permissions:**
- **Shop Owner**: Can manage their own shop's delivery settings
- **Admin**: Can manage any shop's delivery settings
- **Public**: Can view active delivery zones and basic settings

---

## 1. Get Delivery Settings

Retrieve all delivery settings for a shop, including delivery zones.

### Endpoint
```
GET /api/shops/:id/delivery-settings
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Authorization: Bearer <token> (optional - provides additional details)
```

### Request Example
```bash
# Public access (basic info only)
curl -X GET http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-settings

# Authenticated access (full details)
curl -X GET http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)

**Public Response:**
```json
{
  "status": "success",
  "data": {
    "deliverySettings": {
      "deliveryFee": 75,
      "freeDeliveryAbove": 1500,
      "serviceRadius": 15,
      "deliveryZones": [
        {
          "name": "Andheri West",
          "type": "area",
          "value": "Andheri West, Mumbai",
          "deliveryFee": 35,
          "minimumOrderAmount": 200,
          "estimatedDeliveryTime": 30,
          "isActive": true,
          "_id": "68f61ed04e7b4b78c323c283"
        }
      ]
    }
  }
}
```

**Authenticated Response (Shop Owner/Admin):**
```json
{
  "status": "success",
  "data": {
    "deliverySettings": {
      "deliveryFee": 75,
      "freeDeliveryAbove": 1500,
      "serviceRadius": 15,
      "deliveryZones": [...],
      "usesOwnDelivery": true,
      "usesThirdPartyDelivery": false,
      "allDeliveryZones": [...]  // Includes inactive zones
    }
  }
}
```

---

## 2. Update Delivery Settings

Update global delivery settings for a shop.

### Endpoint
```
PUT /api/shops/:id/delivery-settings
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
  "deliveryFee": 75,
  "freeDeliveryAbove": 1500,
  "serviceRadius": 15,
  "usesOwnDelivery": true,
  "usesThirdPartyDelivery": false
}
```

**Field Descriptions:**
- `deliveryFee` (number, min: 0) - Default delivery charge
- `freeDeliveryAbove` (number, min: 0) - Order amount for free delivery
- `serviceRadius` (number, 1-50) - Service coverage radius in kilometers
- `usesOwnDelivery` (boolean) - Whether shop uses own delivery staff
- `usesThirdPartyDelivery` (boolean) - Whether shop uses third-party services

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deliveryFee": 75,
    "freeDeliveryAbove": 1500,
    "serviceRadius": 15,
    "usesOwnDelivery": true,
    "usesThirdPartyDelivery": false
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Delivery settings updated successfully",
  "data": {
    "deliverySettings": {
      "deliveryFee": 75,
      "freeDeliveryAbove": 1500,
      "serviceRadius": 15,
      "usesOwnDelivery": true,
      "usesThirdPartyDelivery": false
    }
  }
}
```

---

## 3. Get Delivery Zones

Retrieve all delivery zones for a shop.

### Endpoint
```
GET /api/shops/:id/delivery-zones
```

### Parameters
- `id` (path parameter) - Shop ID

### Headers
```
Authorization: Bearer <token> (optional - shows inactive zones)
```

### Request Example
```bash
curl -X GET http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones
```

### Response (200 OK)
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "deliveryZones": [
      {
        "name": "Andheri West",
        "type": "area",
        "value": "Andheri West, Mumbai",
        "deliveryFee": 35,
        "minimumOrderAmount": 200,
        "estimatedDeliveryTime": 30,
        "isActive": true,
        "_id": "68f61ed04e7b4b78c323c283"
      }
    ]
  }
}
```

**Zone Types:**
- `pincode` - Delivery zone based on PIN/ZIP code (e.g., "400053")
- `area` - Delivery zone based on area name (e.g., "Andheri West, Mumbai")
- `radius` - Delivery zone based on distance radius (e.g., "5" for 5km radius)

---

## 4. Add Delivery Zone

Create a new delivery zone for a shop.

### Endpoint
```
POST /api/shops/:id/delivery-zones
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
  "name": "Andheri West",
  "type": "area",
  "value": "Andheri West, Mumbai",
  "deliveryFee": 40,
  "minimumOrderAmount": 200,
  "estimatedDeliveryTime": 25,
  "isActive": true
}
```

**Field Descriptions:**
- `name` (string, required) - Zone name for display
- `type` (enum, required) - Zone type: `pincode`, `area`, or `radius`
- `value` (string, required) - Zone value (pincode number, area name, or radius in km)
- `deliveryFee` (number, required, min: 0) - Delivery charge for this zone
- `minimumOrderAmount` (number, default: 0, min: 0) - Minimum order amount
- `estimatedDeliveryTime` (number, default: 30, min: 5) - Delivery time in minutes
- `isActive` (boolean, default: true) - Whether zone is active

### Request Examples

**Area-based Zone:**
```bash
curl -X POST http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Andheri West",
    "type": "area",
    "value": "Andheri West, Mumbai",
    "deliveryFee": 40,
    "minimumOrderAmount": 200,
    "estimatedDeliveryTime": 25,
    "isActive": true
  }'
```

**Pincode-based Zone:**
```bash
curl -X POST http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "400053 Pincode Zone",
    "type": "pincode",
    "value": "400053",
    "deliveryFee": 30,
    "minimumOrderAmount": 150,
    "estimatedDeliveryTime": 20,
    "isActive": true
  }'
```

**Radius-based Zone:**
```bash
curl -X POST http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "5km Radius Zone",
    "type": "radius",
    "value": "5",
    "deliveryFee": 25,
    "minimumOrderAmount": 100,
    "estimatedDeliveryTime": 20,
    "isActive": true
  }'
```

### Response (201 Created)
```json
{
  "status": "success",
  "message": "Delivery zone added successfully",
  "data": {
    "deliveryZone": {
      "name": "Andheri West",
      "type": "area",
      "value": "Andheri West, Mumbai",
      "deliveryFee": 40,
      "minimumOrderAmount": 200,
      "estimatedDeliveryTime": 25,
      "isActive": true,
      "_id": "68f61ed04e7b4b78c323c283"
    }
  }
}
```

---

## 5. Update Delivery Zone

Update an existing delivery zone.

### Endpoint
```
PUT /api/shops/:id/delivery-zones/:zoneId
```

### Parameters
- `id` (path parameter) - Shop ID
- `zoneId` (path parameter) - Delivery zone ID

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
All fields are optional. Only include fields you want to update.

```json
{
  "deliveryFee": 35,
  "estimatedDeliveryTime": 30,
  "isActive": true
}
```

### Request Example
```bash
curl -X PUT http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones/68f61ed04e7b4b78c323c283 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deliveryFee": 35,
    "estimatedDeliveryTime": 30
  }'
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Delivery zone updated successfully",
  "data": {
    "deliveryZone": {
      "name": "Andheri West",
      "type": "area",
      "value": "Andheri West, Mumbai",
      "deliveryFee": 35,
      "minimumOrderAmount": 200,
      "estimatedDeliveryTime": 30,
      "isActive": true,
      "_id": "68f61ed04e7b4b78c323c283"
    }
  }
}
```

---

## 6. Delete Delivery Zone

Delete a delivery zone.

### Endpoint
```
DELETE /api/shops/:id/delivery-zones/:zoneId
```

### Parameters
- `id` (path parameter) - Shop ID
- `zoneId` (path parameter) - Delivery zone ID

### Headers
```
Authorization: Bearer <token>
```

### Request Example
```bash
curl -X DELETE http://100.100.22.22:3000/api/shops/68f36090b9f4f172d0515613/delivery-zones/68f61ed04e7b4b78c323c283 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Delivery zone deleted successfully",
  "data": null
}
```

---

## Integration Guide

### Setting Up Delivery Settings (Shop Onboarding)

```javascript
// Step 1: Configure global delivery settings
const setupDeliverySettings = async (shopId, token) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-settings`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        deliveryFee: 50,
        freeDeliveryAbove: 1000,
        serviceRadius: 10,
        usesOwnDelivery: true,
        usesThirdPartyDelivery: false
      })
    }
  );

  return await response.json();
};

// Step 2: Add delivery zones
const addDeliveryZone = async (shopId, token, zoneData) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-zones`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(zoneData)
    }
  );

  return await response.json();
};

// Usage
await setupDeliverySettings(shopId, token);
await addDeliveryZone(shopId, token, {
  name: 'Andheri West',
  type: 'area',
  value: 'Andheri West, Mumbai',
  deliveryFee: 40,
  minimumOrderAmount: 200,
  estimatedDeliveryTime: 25
});
```

### Displaying Delivery Information to Customers

```javascript
// Fetch delivery settings for display
const getDeliveryInfo = async (shopId) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-settings`
  );

  const { data } = await response.json();
  return data.deliverySettings;
};

// Check if user's address is in delivery zone
const checkDeliveryAvailability = (userPincode, deliveryZones) => {
  const zone = deliveryZones.find(zone =>
    zone.type === 'pincode' && zone.value === userPincode && zone.isActive
  );

  if (zone) {
    return {
      available: true,
      deliveryFee: zone.deliveryFee,
      minimumOrder: zone.minimumOrderAmount,
      estimatedTime: zone.estimatedDeliveryTime
    };
  }

  return { available: false };
};
```

### Managing Delivery Zones (Shop Owner Dashboard)

```javascript
// Fetch all zones
const getDeliveryZones = async (shopId, token) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-zones`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { data } = await response.json();
  return data.deliveryZones;
};

// Update zone
const updateZone = async (shopId, zoneId, token, updates) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-zones/${zoneId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }
  );

  return await response.json();
};

// Delete zone
const deleteZone = async (shopId, zoneId, token) => {
  const response = await fetch(
    `${API_BASE}/api/shops/${shopId}/delivery-zones/${zoneId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  return await response.json();
};
```

### Complete Delivery Settings Form Component Example

```javascript
const DeliverySettingsForm = ({ shopId, token }) => {
  const [settings, setSettings] = useState({
    deliveryFee: 0,
    freeDeliveryAbove: null,
    serviceRadius: 5,
    usesOwnDelivery: true,
    usesThirdPartyDelivery: false
  });

  const [zones, setZones] = useState([]);

  // Load existing settings
  useEffect(() => {
    loadSettings();
    loadZones();
  }, [shopId]);

  const loadSettings = async () => {
    const response = await fetch(
      `${API_BASE}/api/shops/${shopId}/delivery-settings`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const { data } = await response.json();
    setSettings(data.deliverySettings);
  };

  const loadZones = async () => {
    const response = await fetch(
      `${API_BASE}/api/shops/${shopId}/delivery-zones`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const { data } = await response.json();
    setZones(data.deliveryZones);
  };

  const handleSaveSettings = async () => {
    await fetch(`${API_BASE}/api/shops/${shopId}/delivery-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });

    alert('Delivery settings updated successfully!');
  };

  const handleAddZone = async (zoneData) => {
    await fetch(`${API_BASE}/api/shops/${shopId}/delivery-zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(zoneData)
    });

    loadZones(); // Reload zones
  };

  return (
    <div>
      {/* Settings form */}
      <h2>Global Delivery Settings</h2>
      <input
        type="number"
        value={settings.deliveryFee}
        onChange={e => setSettings({...settings, deliveryFee: +e.target.value})}
        placeholder="Delivery Fee"
      />
      <input
        type="number"
        value={settings.freeDeliveryAbove || ''}
        onChange={e => setSettings({...settings, freeDeliveryAbove: +e.target.value})}
        placeholder="Free Delivery Above"
      />
      <button onClick={handleSaveSettings}>Save Settings</button>

      {/* Zones list */}
      <h2>Delivery Zones</h2>
      {zones.map(zone => (
        <div key={zone._id}>
          <h3>{zone.name}</h3>
          <p>Fee: ₹{zone.deliveryFee} | Time: {zone.estimatedDeliveryTime} min</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Testing

### Test Credentials
```
Shop Owner:
  Email: rajesh@electronics.com
  Password: password123
  Shop ID: 68f36090b9f4f172d0515613
```

### Quick Test Script

```bash
# 1. Login
TOKEN=$(curl -X POST http://100.100.22.22:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"rajesh@electronics.com","password":"password123"}' \
  -s | jq -r '.data.token')

SHOP_ID="68f36090b9f4f172d0515613"

# 2. Update delivery settings
curl -X PUT http://100.100.22.22:3000/api/shops/$SHOP_ID/delivery-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"deliveryFee":75,"freeDeliveryAbove":1500,"serviceRadius":15}' | jq

# 3. Add a delivery zone
ZONE_RESPONSE=$(curl -X POST http://100.100.22.22:3000/api/shops/$SHOP_ID/delivery-zones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Zone",
    "type": "pincode",
    "value": "400001",
    "deliveryFee": 50,
    "minimumOrderAmount": 200,
    "estimatedDeliveryTime": 30
  }' -s)

echo $ZONE_RESPONSE | jq
ZONE_ID=$(echo $ZONE_RESPONSE | jq -r '.data.deliveryZone._id')

# 4. Update the zone
curl -X PUT http://100.100.22.22:3000/api/shops/$SHOP_ID/delivery-zones/$ZONE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"deliveryFee":45}' | jq

# 5. Get all zones
curl -X GET http://100.100.22.22:3000/api/shops/$SHOP_ID/delivery-zones | jq

# 6. Delete the zone
curl -X DELETE http://100.100.22.22:3000/api/shops/$SHOP_ID/delivery-zones/$ZONE_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Please provide name, type, value, and deliveryFee"
}
```

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "Not authorized to access this route"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Not authorized to update this shop"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Shop not found"
}
```

**404 Zone Not Found**
```json
{
  "status": "error",
  "message": "Delivery zone not found"
}
```

### Validation Errors

**Invalid Zone Type:**
```json
{
  "status": "error",
  "message": "`invalid_type` is not a valid enum value for path `deliveryZones.type`."
}
```

**Invalid Service Radius:**
```json
{
  "status": "error",
  "message": "Service radius must be between 1 and 50 kilometers"
}
```

---

## Summary

All delivery endpoints are fully functional and tested:

✅ GET `/api/shops/:id/delivery-settings` - Retrieve delivery settings
✅ PUT `/api/shops/:id/delivery-settings` - Update delivery settings
✅ GET `/api/shops/:id/delivery-zones` - List delivery zones
✅ POST `/api/shops/:id/delivery-zones` - Add delivery zone
✅ PUT `/api/shops/:id/delivery-zones/:zoneId` - Update delivery zone
✅ DELETE `/api/shops/:id/delivery-zones/:zoneId` - Delete delivery zone

**Swagger Documentation**: http://100.100.22.22:3000/api-docs

**Use Cases Supported:**
- Shop owners can configure global delivery settings
- Shop owners can create zone-based delivery pricing
- Shop owners can manage multiple delivery zones (pincode, area, radius)
- Customers can view available delivery zones and fees
- System calculates delivery fees based on customer location
- Shop owners can temporarily disable zones without deleting them

The API is production-ready and fully integrated with the existing KeyPointMart system.
