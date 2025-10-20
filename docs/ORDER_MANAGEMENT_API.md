# Order Management API Documentation

Complete API documentation for shop order management settings including auto-accept orders, preparation time, capacity limits, and order pause functionality.

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [API Endpoints](#api-endpoints)
4. [Order Management Settings](#order-management-settings)
5. [Auto-Accept Orders](#auto-accept-orders)
6. [Capacity Management](#capacity-management)
7. [Testing Examples](#testing-examples)
8. [Integration Guide](#integration-guide)

---

## Overview

The Order Management system allows shop owners to configure how their shop handles incoming orders. This includes automatic order confirmation, preparation time estimation, capacity limits, and temporary order pausing.

### Key Capabilities

✅ **Auto-Accept Orders** - Automatically confirm orders without manual approval
✅ **Preparation Time** - Set expected time to prepare orders (affects delivery estimates)
✅ **Capacity Limits** - Max active orders and hourly order limits
✅ **Temporary Pause** - Pause order acceptance until a specific datetime
✅ **Real-time Status** - Check shop's current order acceptance status
✅ **Public/Private Data** - Different information for customers vs shop owners

---

## Features

### 1. Auto-Accept Orders

When enabled, new orders are automatically moved from `pending` to `confirmed` status without requiring shop owner approval.

**Benefits:**
- Faster order processing
- Better customer experience
- Reduced manual workload for shop owners
- Automatic status history tracking

**How it works:**
```
Customer places order
        ↓
autoAcceptOrders: true?
        ↓ YES
Order status = 'confirmed'
Status history updated automatically
        ↓ NO
Order status = 'pending'
Awaits shop owner approval
```

### 2. Preparation Time

Estimated time (in minutes) for the shop to prepare an order. Used for:
- Delivery time estimates
- Customer expectations
- Order scheduling

**Constraints:**
- Minimum: 5 minutes
- Default: 30 minutes
- Can be updated per order type/size (future enhancement)

### 3. Capacity Management

#### Max Active Orders
Limits concurrent orders being processed simultaneously.

**Active orders include statuses:**
- pending
- confirmed
- preparing
- ready
- out_for_delivery

**Use cases:**
- Small kitchen with limited staff
- Quality control
- Resource management

#### Max Orders Per Hour
Limits total orders accepted within a rolling 1-hour window.

**Use cases:**
- Peak hour management
- Prevent overwhelming staff
- Maintain service quality

### 4. Order Pause

Temporarily stop accepting new orders until a specific date/time.

**Use cases:**
- Lunch/dinner rush management
- Staff breaks
- Inventory restocking
- Emergency situations
- Scheduled maintenance

---

## API Endpoints

### Base URL
```
http://your-domain.com/api/shops
```

### Authentication
Most endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Get Order Settings

Retrieve order management settings for a shop.

### Endpoint
```
GET /api/shops/:id/order-settings
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Shop ID (path parameter) |

### Authorization
- **Public access**: Returns basic settings (preparationTime, minimumOrderAmount, acceptsOrders)
- **Shop owner/admin**: Returns all settings including auto-accept, limits, and pause status

### Response (Public)
```json
{
  "status": "success",
  "data": {
    "orderSettings": {
      "preparationTime": 30,
      "minimumOrderAmount": 0,
      "acceptsOrders": true
    }
  }
}
```

### Response (Authenticated Owner)
```json
{
  "status": "success",
  "data": {
    "orderSettings": {
      "preparationTime": 45,
      "minimumOrderAmount": 100,
      "acceptsOrders": true,
      "autoAcceptOrders": true,
      "maxOrdersPerHour": 10,
      "maxActiveOrders": 5,
      "pauseOrdersUntil": null
    }
  }
}
```

### Example Request
```bash
# Public access
curl "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings"

# Authenticated (shop owner)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings"
```

---

## 2. Update Order Settings

Update order management settings (Shop owner only).

### Endpoint
```
PUT /api/shops/:id/order-settings
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Shop ID (path parameter) |

### Authorization
**Required**: Shop owner or admin

### Request Body
```json
{
  "autoAcceptOrders": true,
  "preparationTime": 45,
  "maxOrdersPerHour": 10,
  "maxActiveOrders": 5,
  "pauseOrdersUntil": "2025-10-20T18:00:00.000Z",
  "minimumOrderAmount": 100,
  "acceptsOrders": true
}
```

### Field Descriptions
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| autoAcceptOrders | boolean | - | Auto-confirm orders |
| preparationTime | number | min: 5 | Prep time in minutes |
| maxOrdersPerHour | number | min: 1, nullable | Max orders per hour (null = unlimited) |
| maxActiveOrders | number | min: 1, nullable | Max concurrent orders (null = unlimited) |
| pauseOrdersUntil | datetime | nullable | Pause orders until datetime (null = not paused) |
| minimumOrderAmount | number | min: 0 | Minimum order amount in currency |
| acceptsOrders | boolean | - | Whether shop accepts orders |

### Response
```json
{
  "status": "success",
  "message": "Order management settings updated successfully",
  "data": {
    "orderSettings": {
      "autoAcceptOrders": true,
      "preparationTime": 45,
      "maxOrdersPerHour": 10,
      "maxActiveOrders": 5,
      "pauseOrdersUntil": "2025-10-20T18:00:00.000Z",
      "minimumOrderAmount": 100,
      "acceptsOrders": true
    }
  }
}
```

### Example Request
```bash
curl -X PUT "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoAcceptOrders": true,
    "preparationTime": 45,
    "maxOrdersPerHour": 10,
    "maxActiveOrders": 5
  }'
```

---

## 3. Get Order Capacity Status

Get real-time order capacity status for a shop.

### Endpoint
```
GET /api/shops/:id/order-capacity
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Shop ID (path parameter) |

### Authorization
**Public** - No authentication required

### Response (Accepting Orders)
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": true,
      "preparationTime": 45,
      "activeOrders": 2,
      "maxActiveOrders": 5,
      "ordersThisHour": 6,
      "maxOrdersPerHour": 10
    }
  }
}
```

### Response (At Capacity)
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": false,
      "preparationTime": 45,
      "reason": "at_capacity",
      "activeOrders": 5,
      "maxActiveOrders": 5
    }
  }
}
```

### Response (Temporarily Paused)
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": false,
      "preparationTime": 45,
      "reason": "temporarily_paused",
      "pausedUntil": "2025-10-20T18:00:00.000Z"
    }
  }
}
```

### Response (Hourly Limit Reached)
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": false,
      "preparationTime": 45,
      "reason": "hourly_limit_reached",
      "ordersThisHour": 10,
      "maxOrdersPerHour": 10
    }
  }
}
```

### Reason Codes
| Reason | Description |
|--------|-------------|
| `temporarily_paused` | Orders paused until `pausedUntil` datetime |
| `at_capacity` | Max active orders limit reached |
| `hourly_limit_reached` | Max orders per hour limit reached |

### Example Request
```bash
curl "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-capacity"
```

---

## Order Management Settings

### Schema (Model: `src/models/Shop.js`)

```javascript
settings: {
  // Order Management
  autoAcceptOrders: {
    type: Boolean,
    default: false
  },
  preparationTime: {
    type: Number,
    default: 30,
    min: 5
  },
  maxOrdersPerHour: {
    type: Number,
    default: null, // null = unlimited
    min: 1
  },
  maxActiveOrders: {
    type: Number,
    default: null, // null = unlimited
    min: 1
  },
  pauseOrdersUntil: {
    type: Date,
    default: null
  },

  // Other settings
  minimumOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  acceptsOrders: {
    type: Boolean,
    default: true
  }
}
```

---

## Auto-Accept Orders

### Implementation

When `autoAcceptOrders` is enabled, the order creation process automatically confirms orders.

**Location**: `src/controllers/orderController.js` (lines 154-194)

```javascript
// Determine initial status based on auto-accept setting
const initialStatus = shopDoc.settings.autoAcceptOrders ? 'confirmed' : 'pending';

const orderData = {
  customer: req.user.id,
  shop: shopDoc._id,
  items: orderItems,
  status: initialStatus,
  // ... other fields
};

const order = await Order.create(orderData);

// Add status history for auto-confirmed orders
if (initialStatus === 'confirmed') {
  order.statusHistory.push({
    status: 'confirmed',
    timestamp: new Date(),
    note: 'Order automatically confirmed'
  });
  await order.save();
}
```

### Status Flow

#### Without Auto-Accept
```
Order Created → status: 'pending'
↓
Shop owner manually confirms
↓
status: 'confirmed'
```

#### With Auto-Accept
```
Order Created → status: 'confirmed' (automatic)
↓
Status history: "Order automatically confirmed"
↓
Ready for preparation
```

---

## Capacity Management

### Validation During Order Creation

**Location**: `src/controllers/orderController.js` (lines 76-114)

### 1. Check if Orders Are Paused

```javascript
if (shopDoc.settings.pauseOrdersUntil &&
    new Date(shopDoc.settings.pauseOrdersUntil) > new Date()) {
  const pausedUntil = new Date(shopDoc.settings.pauseOrdersUntil).toLocaleString();
  return res.status(400).json({
    status: 'error',
    message: `Shop is temporarily not accepting orders until ${pausedUntil}`
  });
}
```

### 2. Check Max Active Orders

```javascript
if (shopDoc.settings.maxActiveOrders) {
  const activeOrdersCount = await Order.countDocuments({
    shop: shopDoc._id,
    status: {
      $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']
    }
  });

  if (activeOrdersCount >= shopDoc.settings.maxActiveOrders) {
    return res.status(400).json({
      status: 'error',
      message: 'Shop is currently at full capacity. Please try again later.'
    });
  }
}
```

### 3. Check Max Orders Per Hour

```javascript
if (shopDoc.settings.maxOrdersPerHour) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOrdersCount = await Order.countDocuments({
    shop: shopDoc._id,
    createdAt: { $gte: oneHourAgo }
  });

  if (recentOrdersCount >= shopDoc.settings.maxOrdersPerHour) {
    return res.status(400).json({
      status: 'error',
      message: 'Shop has reached its order capacity for this hour. Please try again later.'
    });
  }
}
```

---

## Testing Examples

### Test Scenario 1: Get Order Settings (Public)

**Request**:
```bash
curl "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "orderSettings": {
      "preparationTime": 30,
      "minimumOrderAmount": 0,
      "acceptsOrders": true
    }
  }
}
```

✅ **Result**: Only public fields visible

---

### Test Scenario 2: Get Order Settings (Authenticated)

**Request**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "orderSettings": {
      "preparationTime": 30,
      "minimumOrderAmount": 0,
      "acceptsOrders": true,
      "autoAcceptOrders": false,
      "maxOrdersPerHour": null,
      "maxActiveOrders": null,
      "pauseOrdersUntil": null
    }
  }
}
```

✅ **Result**: All fields visible to shop owner

---

### Test Scenario 3: Enable Auto-Accept Orders

**Request**:
```bash
curl -X PUT "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoAcceptOrders": true, "preparationTime": 45}'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Order management settings updated successfully",
  "data": {
    "orderSettings": {
      "autoAcceptOrders": true,
      "preparationTime": 45,
      ...
    }
  }
}
```

✅ **Result**: Auto-accept enabled, preparation time updated

---

### Test Scenario 4: Set Capacity Limits

**Request**:
```bash
curl -X PUT "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxOrdersPerHour": 10,
    "maxActiveOrders": 5
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Order management settings updated successfully",
  "data": {
    "orderSettings": {
      "maxOrdersPerHour": 10,
      "maxActiveOrders": 5,
      ...
    }
  }
}
```

✅ **Result**: Capacity limits configured

---

### Test Scenario 5: Pause Orders Temporarily

**Request**:
```bash
curl -X PUT "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pauseOrdersUntil": "2025-10-20T18:00:00.000Z"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Order management settings updated successfully",
  "data": {
    "orderSettings": {
      "pauseOrdersUntil": "2025-10-20T18:00:00.000Z",
      ...
    }
  }
}
```

✅ **Result**: Orders paused until specified time

---

### Test Scenario 6: Check Order Capacity (Accepting)

**Request**:
```bash
curl "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-capacity"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": true,
      "preparationTime": 45,
      "activeOrders": 2,
      "maxActiveOrders": 5,
      "ordersThisHour": 6,
      "maxOrdersPerHour": 10
    }
  }
}
```

✅ **Result**: Shop is accepting orders (2/5 active, 6/10 this hour)

---

### Test Scenario 7: Check Order Capacity (At Capacity)

**Setup**: Create 5 active orders (shop's max)

**Request**:
```bash
curl "http://localhost:3000/api/shops/68f626819b8b4ebde5db8bd1/order-capacity"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "capacityStatus": {
      "acceptingOrders": false,
      "preparationTime": 45,
      "reason": "at_capacity",
      "activeOrders": 5,
      "maxActiveOrders": 5
    }
  }
}
```

✅ **Result**: Shop not accepting orders (capacity reached)

---

### Test Scenario 8: Create Order with Auto-Accept

**Setup**: Auto-accept enabled

**Request**:
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "68f626819b8b4ebde5db8bd1",
    "items": [...],
    "deliveryAddress": "..."
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "order": {
      "orderNumber": "ORD-1729432100123",
      "status": "confirmed",
      "statusHistory": [
        {
          "status": "confirmed",
          "timestamp": "2025-10-20T12:00:00.000Z",
          "note": "Order automatically confirmed"
        }
      ],
      ...
    }
  }
}
```

✅ **Result**: Order auto-confirmed immediately

---

### Test Scenario 9: Create Order When Paused

**Setup**: Orders paused until future datetime

**Request**:
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Shop is temporarily not accepting orders until 10/20/2025, 6:00:00 PM"
}
```

✅ **Result**: Order rejected, customer informed

---

### Test Scenario 10: Create Order at Max Capacity

**Setup**: Shop already has 5/5 active orders

**Request**:
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Shop is currently at full capacity. Please try again later."
}
```

✅ **Result**: Order rejected due to capacity limit

---

## Integration Guide

### For Mobile/Web Apps

#### 1. Display Shop Order Settings

```javascript
// Fetch order settings (public view for customers)
const getShopOrderInfo = async (shopId) => {
  const response = await fetch(`${API_BASE}/api/shops/${shopId}/order-settings`);
  const { data } = await response.json();

  // Display preparation time to customer
  console.log(`Estimated prep time: ${data.orderSettings.preparationTime} minutes`);
  console.log(`Minimum order: ₹${data.orderSettings.minimumOrderAmount}`);

  return data.orderSettings;
};
```

#### 2. Check Shop Availability Before Ordering

```javascript
const checkShopAvailability = async (shopId) => {
  const response = await fetch(`${API_BASE}/api/shops/${shopId}/order-capacity`);
  const { data } = await response.json();

  const { capacityStatus } = data;

  if (!capacityStatus.acceptingOrders) {
    // Show appropriate message to customer
    if (capacityStatus.reason === 'temporarily_paused') {
      const resumeTime = new Date(capacityStatus.pausedUntil).toLocaleString();
      showMessage(`Shop will resume accepting orders at ${resumeTime}`);
    } else if (capacityStatus.reason === 'at_capacity') {
      showMessage('Shop is currently busy. Please try again later.');
    } else if (capacityStatus.reason === 'hourly_limit_reached') {
      showMessage('Shop has reached its order limit for this hour.');
    }

    disableOrderButton();
    return false;
  }

  // Show capacity info if near limits
  if (capacityStatus.maxActiveOrders) {
    const { activeOrders, maxActiveOrders } = capacityStatus;
    if (activeOrders / maxActiveOrders > 0.8) {
      showWarning(`Shop is busy (${activeOrders}/${maxActiveOrders} active orders)`);
    }
  }

  return true;
};
```

#### 3. Shop Owner Dashboard

```javascript
const OrderManagementSettings = () => {
  const [settings, setSettings] = useState(null);
  const [capacity, setCapacity] = useState(null);

  useEffect(() => {
    // Fetch settings and capacity
    Promise.all([
      fetch(`${API_BASE}/api/shops/${shopId}/order-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/shops/${shopId}/order-capacity`)
    ])
    .then(async ([settingsRes, capacityRes]) => {
      const settingsData = await settingsRes.json();
      const capacityData = await capacityRes.json();

      setSettings(settingsData.data.orderSettings);
      setCapacity(capacityData.data.capacityStatus);
    });
  }, [shopId]);

  const updateSettings = async (newSettings) => {
    const response = await fetch(
      `${API_BASE}/api/shops/${shopId}/order-settings`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      }
    );

    const result = await response.json();
    if (result.status === 'success') {
      setSettings(result.data.orderSettings);
      showSuccessMessage('Settings updated successfully');
    }
  };

  return (
    <div>
      <h2>Order Management</h2>

      {/* Current Status */}
      <StatusCard>
        <h3>Current Status</h3>
        <p>Accepting Orders: {capacity?.acceptingOrders ? '✅ Yes' : '❌ No'}</p>
        {capacity?.reason && <p>Reason: {capacity.reason}</p>}
        <p>Active Orders: {capacity?.activeOrders}/{capacity?.maxActiveOrders || '∞'}</p>
        <p>Orders This Hour: {capacity?.ordersThisHour}/{capacity?.maxOrdersPerHour || '∞'}</p>
      </StatusCard>

      {/* Settings Form */}
      <SettingsForm>
        <Toggle
          label="Auto-Accept Orders"
          checked={settings?.autoAcceptOrders}
          onChange={(value) => updateSettings({ autoAcceptOrders: value })}
        />

        <NumberInput
          label="Preparation Time (minutes)"
          value={settings?.preparationTime}
          min={5}
          onChange={(value) => updateSettings({ preparationTime: value })}
        />

        <NumberInput
          label="Max Active Orders"
          value={settings?.maxActiveOrders}
          min={1}
          nullable
          onChange={(value) => updateSettings({ maxActiveOrders: value })}
        />

        <NumberInput
          label="Max Orders Per Hour"
          value={settings?.maxOrdersPerHour}
          min={1}
          nullable
          onChange={(value) => updateSettings({ maxOrdersPerHour: value })}
        />

        <DateTimePicker
          label="Pause Orders Until"
          value={settings?.pauseOrdersUntil}
          nullable
          onChange={(value) => updateSettings({ pauseOrdersUntil: value })}
        />
      </SettingsForm>
    </div>
  );
};
```

#### 4. Quick Pause/Resume

```javascript
const toggleOrderPause = async (shopId, isPaused) => {
  const pauseUntil = isPaused
    ? new Date(Date.now() + 60 * 60 * 1000) // Pause for 1 hour
    : null; // Resume immediately

  await fetch(`${API_BASE}/api/shops/${shopId}/order-settings`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pauseOrdersUntil: pauseUntil })
  });
};

// Usage
<Button onClick={() => toggleOrderPause(shopId, true)}>
  Pause for 1 Hour
</Button>
<Button onClick={() => toggleOrderPause(shopId, false)}>
  Resume Orders
</Button>
```

---

## Benefits

### For Shop Owners
- ⚡ **Faster order processing** with auto-accept
- 🎯 **Better resource management** with capacity limits
- ⏸️ **Flexible pause controls** for breaks and peak times
- 📊 **Real-time capacity monitoring**
- 🔧 **Fine-grained control** over order flow

### For Customers
- ✅ **Instant order confirmation** (auto-accept enabled shops)
- ⏰ **Accurate delivery estimates** (preparation time)
- 📍 **Shop availability info** before ordering
- 💬 **Clear messaging** when shops are busy/paused

### For Platform
- 📈 **Higher order success rate** (fewer rejections)
- 😊 **Better customer satisfaction**
- 🏪 **Shop efficiency improvements**
- 📉 **Reduced support tickets**

---

## Technical Notes

### Database Schema

All order management settings are stored in the `Shop` model under the `settings` object:

```javascript
// src/models/Shop.js (lines 197-220)
settings: {
  autoAcceptOrders: { type: Boolean, default: false },
  preparationTime: { type: Number, default: 30, min: 5 },
  maxOrdersPerHour: { type: Number, default: null, min: 1 },
  maxActiveOrders: { type: Number, default: null, min: 1 },
  pauseOrdersUntil: { type: Date, default: null }
}
```

### Controller Functions

- **`getOrderSettings`**: `src/controllers/shopController.js:957-996`
- **`updateOrderSettings`**: `src/controllers/shopController.js:998-1053`
- **`getOrderCapacity`**: `src/controllers/shopController.js:1055-1117`

### Order Creation Logic

- **Capacity validation**: `src/controllers/orderController.js:76-114`
- **Auto-accept logic**: `src/controllers/orderController.js:154-194`

### Performance

- Capacity queries use indexed fields (`shop`, `status`, `createdAt`)
- Date comparison is optimized with rolling window calculations
- No N+1 queries - single DB query per capacity check

---

## Summary

The Order Management API provides comprehensive control over how shops handle incoming orders:

✅ **Auto-Accept Orders** - Instant order confirmation
✅ **Preparation Time** - Accurate delivery estimates
✅ **Capacity Limits** - Prevent overload (hourly + concurrent)
✅ **Temporary Pause** - Flexible order control
✅ **Real-time Status** - Live capacity monitoring
✅ **Public/Private Views** - Appropriate data exposure

**All features tested and ready for production deployment.**

---

## Related Documentation

- [Shop Update Endpoints](./SHOP_UPDATE_ENDPOINTS.md)
- [Delivery Settings API](./DELIVERY_SETTINGS_API.md)
- [Location-Based Product Filtering](./LOCATION_BASED_PRODUCT_FILTERING.md)

---

**Last Updated**: October 2025
**API Version**: 1.0
**Status**: ✅ Production Ready
