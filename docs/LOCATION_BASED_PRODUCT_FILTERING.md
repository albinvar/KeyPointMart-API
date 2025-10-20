# Location-Based Product Filtering Documentation

Complete guide on how the marketplace filters products based on customer location and shop delivery settings.

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Filtering Logic](#filtering-logic)
4. [API Usage](#api-usage)
5. [Testing Results](#testing-results)
6. [Integration Guide](#integration-guide)

---

## Overview

The KeyPointMart platform implements intelligent location-based product filtering to ensure customers only see products from shops that can deliver to their location. This system considers:

✅ **Delivery Zones** - Pincode, area, or radius-based zones with custom delivery fees
✅ **Service Radius** - Global shop delivery radius (fallback)
✅ **Shop Status** - Only active, verified, open shops accepting orders
✅ **Distance Calculation** - Haversine formula for accurate GPS-based distance
✅ **Multi-Shop Support** - Aggregates products from all available shops

---

## How It Works

### Filtering Flow

```
Customer provides location (lat/long, pincode, area)
            ↓
System finds all active, verified shops
            ↓
For each shop, check delivery availability:
  1. Check delivery zones (pincode, area, radius)
  2. If no zone match, check global service radius
  3. Verify shop is open and accepting orders
            ↓
Filter products to only include available shops
            ↓
Return products with pagination
```

### Delivery Availability Check

The system checks in this priority order:

1. **Delivery Zones (Highest Priority)**
   - Pincode match: Exact pincode matching
   - Area match: Case-insensitive substring matching
   - Radius zone: Distance within zone's radius

2. **Global Service Radius (Fallback)**
   - If no zones configured or no zone matches
   - Uses shop's global `serviceRadius` setting
   - Calculates GPS distance using Haversine formula

3. **Shop Operational Status**
   - `isActive`: true
   - `verification.status`: "verified"
   - `settings.acceptsOrders`: true
   - `settings.isOpen`: true

---

## Filtering Logic

### Code Implementation

Location: `src/controllers/productController.js:107-176`

```javascript
// Location-based filtering with delivery zones support
if (latitude && longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const userPincode = req.query.pincode;
  const userArea = req.query.area;

  // Get all active and verified shops
  const allShops = await Shop.find({
    isActive: true,
    'verification.status': 'verified',
    'settings.acceptsOrders': true,
    'settings.isOpen': true
  });

  const availableShops = [];

  for (const shop of allShops) {
    let canDeliver = false;

    // 1. Check delivery zones first (more specific)
    if (shop.deliveryZones && shop.deliveryZones.length > 0) {
      for (const zone of shop.deliveryZones) {
        if (!zone.isActive) continue;

        // Pincode matching
        if (zone.type === 'pincode' && userPincode && zone.value === userPincode) {
          canDeliver = true;
          break;
        }

        // Area matching
        else if (zone.type === 'area' && userArea &&
                 zone.value.toLowerCase().includes(userArea.toLowerCase())) {
          canDeliver = true;
          break;
        }

        // Radius zone matching
        else if (zone.type === 'radius' &&
                 shop.address?.coordinates?.latitude &&
                 shop.address?.coordinates?.longitude) {
          const distance = calculateDistance(
            lat, lon,
            shop.address.coordinates.latitude,
            shop.address.coordinates.longitude
          );
          if (distance <= parseFloat(zone.value)) {
            canDeliver = true;
            break;
          }
        }
      }
    }

    // 2. Fallback to global service radius
    if (!canDeliver &&
        shop.address?.coordinates?.latitude &&
        shop.address?.coordinates?.longitude) {
      const distance = calculateDistance(
        lat, lon,
        shop.address.coordinates.latitude,
        shop.address.coordinates.longitude
      );
      const serviceRadius = shop.settings?.serviceRadius || 5;
      if (distance <= serviceRadius) {
        canDeliver = true;
      }
    }

    if (canDeliver) {
      availableShops.push(shop._id);
    }
  }

  if (availableShops.length > 0) {
    query.shop = { $in: availableShops };
  } else {
    query.shop = { $in: [] }; // No shops can deliver
  }
}
```

### Distance Calculation

Uses the Haversine formula for accurate great-circle distance:

```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};
```

---

## API Usage

### Endpoint
```
GET /api/products
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `latitude` | number | Yes* | User's GPS latitude |
| `longitude` | number | Yes* | User's GPS longitude |
| `pincode` | string | No | User's PIN code for zone matching |
| `area` | string | No | User's area name for zone matching |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Results per page (default: 20) |

*Required for location-based filtering

### Example Requests

#### 1. Location-Based Filtering (GPS Only)
```bash
curl "http://100.100.22.22:3000/api/products?latitude=19.076&longitude=72.8777&limit=5"
```

**Response**: Returns products from shops within delivery range of the coordinates.

#### 2. With Pincode (Zone Matching)
```bash
curl "http://100.100.22.22:3000/api/products?latitude=18.5&longitude=73.8&pincode=400001&limit=5"
```

**Response**: Returns products from shops with delivery zones matching pincode "400001", even if GPS coordinates are far away.

#### 3. With Area Name
```bash
curl "http://100.100.22.22:3000/api/products?latitude=19.076&longitude=72.8777&area=Andheri West&limit=5"
```

**Response**: Returns products from shops with delivery zones matching "Andheri West".

#### 4. No Location (All Products)
```bash
curl "http://100.100.22.22:3000/api/products?limit=5"
```

**Response**: Returns all active products without location filtering.

---

## Testing Results

### Test Scenario 1: Products Near Mumbai
**Request**:
```bash
curl "http://100.100.22.22:3000/api/products?latitude=19.076&longitude=72.8777&limit=5"
```

**Result**: ✅ **SUCCESS**
- Found 5 products from Rajesh Electronics
- Shop is within 15km service radius
- All products from verified, open shop

### Test Scenario 2: Products Far from Mumbai (Pune)
**Request**:
```bash
curl "http://100.100.22.22:3000/api/products?latitude=18.5&longitude=73.8&limit=5"
```

**Result**: ✅ **SUCCESS**
- Found 0 products
- No shops can deliver to Pune from Mumbai
- Correctly filtered out all products

### Test Scenario 3: Pincode-Based Delivery
**Setup**: Added delivery zone for pincode "400001"

**Request**:
```bash
curl "http://100.100.22.22:3000/api/products?latitude=18.5&longitude=73.8&pincode=400001&limit=5"
```

**Result**: ✅ **SUCCESS**
- Found 5 products from Rajesh Electronics
- Matched delivery zone even though GPS is far
- Pincode matching overrides distance

### Test Scenario 4: Shop Closed (Not Accepting Orders)
**Setup**: Set `acceptsOrders: false` for Rajesh Electronics

**Request**:
```bash
curl "http://100.100.22.22:3000/api/products?latitude=19.076&longitude=72.8777&limit=5"
```

**Result**: ✅ **SUCCESS**
- Found 5 products from OTHER shops (Fashion, Food)
- Rajesh Electronics products NOT shown
- Correctly filtered based on operational status

### Test Scenario 5: Shop Re-opened
**Setup**: Set `acceptsOrders: true` for Rajesh Electronics

**Request**:
```bash
curl "http://100.100.22.22:3000/api/products?latitude=19.076&longitude=72.8777&shop=68f36090b9f4f172d0515613&limit=3"
```

**Result**: ✅ **SUCCESS**
- Rajesh Electronics products visible again
- Shop operational status properly tracked

---

## Integration Guide

### For Mobile Apps

```javascript
// Get user's location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;

  // Fetch products based on location
  const response = await fetch(
    `${API_BASE}/api/products?latitude=${latitude}&longitude=${longitude}&limit=20`
  );

  const { data } = await response.json();
  displayProducts(data.products);
});
```

### With User Address (Pincode)

```javascript
const fetchProductsByAddress = async (address) => {
  const params = new URLSearchParams({
    latitude: address.latitude,
    longitude: address.longitude,
    pincode: address.pincode,
    area: address.area,
    limit: 20
  });

  const response = await fetch(`${API_BASE}/api/products?${params}`);
  const { data } = await response.json();

  return data.products;
};

// Usage
const products = await fetchProductsByAddress({
  latitude: 19.076,
  longitude: 72.8777,
  pincode: '400001',
  area: 'Andheri West'
});
```

### Handling No Products Available

```javascript
const fetchProducts = async (location) => {
  const response = await fetch(
    `${API_BASE}/api/products?latitude=${location.lat}&longitude=${location.lon}`
  );

  const { data } = await response.json();

  if (data.products.length === 0) {
    // Show "No delivery available in your area" message
    showNoDeliveryMessage();
  } else {
    // Display products
    displayProducts(data.products);
  }
};
```

### With Loading States

```javascript
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Get user location
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });
    });
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchProducts = async () => {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/products?latitude=${location.lat}&longitude=${location.lon}`
      );

      const { data } = await response.json();
      setProducts(data.products);
      setLoading(false);
    };

    fetchProducts();
  }, [location]);

  if (loading) return <Loader />;
  if (products.length === 0) return <NoDeliveryMessage />;

  return <ProductList products={products} />;
};
```

---

## Behavior Summary

### When Customer Browses Products

1. **With Location Permission**:
   - System filters to show only deliverable products
   - Customers see relevant, available products
   - Better user experience

2. **Without Location Permission**:
   - System shows all products (no filtering)
   - Customer may see products not available for delivery
   - Should prompt for location or address

3. **With Saved Address**:
   - Use saved address coordinates + pincode
   - Most accurate delivery filtering
   - Best user experience

### Shop Visibility Rules

A shop's products are visible if ALL conditions are met:

✅ Shop is active (`isActive: true`)
✅ Shop is verified (`verification.status: 'verified'`)
✅ Shop is accepting orders (`settings.acceptsOrders: true`)
✅ Shop is open (`settings.isOpen: true`)
✅ Shop can deliver to customer location (zone or radius match)

### Product Display

- Products are aggregated from ALL available shops
- Each product shows shop information
- Customers can filter by specific shop if needed
- Pagination works across all shops

---

## Benefits

### For Customers
- Only see available products
- No false expectations
- Better shopping experience
- Accurate delivery information

### For Shop Owners
- Control delivery areas precisely
- Zone-based pricing
- Manage operational hours
- Reduce failed deliveries

### For Platform
- Reduced customer complaints
- Improved order success rate
- Better marketplace efficiency
- Scalable multi-shop system

---

## Technical Notes

### Performance

- Shop filtering happens in application layer (not database query)
- For large number of shops (100+), consider caching
- Delivery zones are indexed for fast lookup
- Distance calculation is optimized with early exit

### Scalability

Current implementation supports:
- ✅ Unlimited shops
- ✅ Multiple delivery zones per shop
- ✅ Real-time operational status changes
- ✅ Dynamic delivery radius updates

For very large scale (1000+ shops):
- Consider geospatial MongoDB indexes
- Use Redis for caching active shops
- Implement shop search radius limits
- Add database-level location queries

### Future Enhancements

Potential improvements:
- Add delivery time estimation based on distance
- Show delivery fee in product listing
- Sort products by delivery distance
- Add "out of delivery area" with alternate suggestions
- Implement geofencing for complex zones

---

## Summary

The location-based product filtering system ensures customers only see products from shops that can deliver to their location. It supports:

✅ GPS-based distance calculation
✅ Pincode-based zone matching
✅ Area-based zone matching
✅ Radius-based zone matching
✅ Global service radius fallback
✅ Real-time shop status checking
✅ Multi-shop product aggregation

**All tested and working in production environment.**
