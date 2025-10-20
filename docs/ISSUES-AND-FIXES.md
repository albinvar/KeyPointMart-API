# Issues Found and Fixes Applied

Detailed documentation of all issues discovered during testing and their resolutions.

---

## Summary

| Issue # | Severity | Status | Description |
|---------|----------|--------|-------------|
| #1 | 🔴 CRITICAL | ✅ FIXED | Missing User Profile Endpoints |
| #2 | 🔴 CRITICAL | ✅ FIXED | Double Password Hashing |
| #3 | 🔴 CRITICAL | ✅ FIXED | Shop Business Hours Crash |
| #4 | 🟡 WARNING | ✅ FIXED | Duplicate MongoDB Indexes |
| #5 | 🟡 WARNING | ✅ FIXED | Deprecated MongoDB Options |
| #6 | 🔴 CRITICAL | ✅ FIXED | Order Creation Failed |
| #7 | 🔴 CRITICAL | ✅ FIXED | Nearby Shops Returned Empty |

**Total Issues:** 7
**Critical:** 5
**Warning:** 2
**All Resolved:** ✅

---

## Issue #1: Missing User Profile Endpoints

### Metadata
- **Severity:** 🔴 CRITICAL
- **Status:** ✅ FIXED
- **Discovered:** October 19, 2025
- **Component:** User Management API
- **Impact:** Users unable to access their own profile conveniently

### Problem Description

The API lacked dedicated `/api/users/profile` endpoints for GET and PUT operations. Users had to use `/api/users/:id` with their own user ID, which created several problems:

1. **Poor UX:** Users needed to know their own ID
2. **Route Collision:** "profile" string was being interpreted as an ID parameter
3. **Error Prone:** Easy to access wrong user's data by mistake

### Error Message
```
GET /api/users/profile
→ 500 Internal Server Error

{
  "status": "error",
  "message": "Resource not found",
  "stack": "CastError: Cast to ObjectId failed for value \"profile\" (type string) at path \"_id\" for model \"User\""
}
```

### Root Cause Analysis

**routes/users.js:**
```javascript
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
```

The route parameter `:id` was matching "profile" as an ID value before any profile-specific route could handle it. Since "profile" is not a valid MongoDB ObjectId, Mongoose threw a CastError.

### Solution Implemented

**Step 1: Added Controller Functions**

File: `src/controllers/userController.js`

```javascript
// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken')
    .populate('addresses defaultAddress');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Get additional data based on user role
  let additionalData = {};

  if (user.role === 'shop_owner') {
    const shop = await Shop.findOne({ owner: user._id });
    if (shop) {
      additionalData.shop = shop;
    }
  }

  if (user.role === 'customer') {
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    additionalData.orderStats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
      ...additionalData
    }
  });
});

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'dateOfBirth', 'gender', 'preferences'];
  const fieldsToUpdate = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fieldsToUpdate[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password -resetPasswordToken -emailVerificationToken -phoneVerificationToken');

  if (!updatedUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
});
```

**Step 2: Updated Routes**

File: `src/routes/users.js`

```javascript
// Import new functions
const {
  getUsers,
  getProfile,        // NEW
  updateProfile,     // NEW
  getUserById,
  // ... rest
} = require('../controllers/userController');

// Add profile routes BEFORE /:id route to prevent collision
router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// This must come AFTER /profile route
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);
```

**Step 3: Exported Functions**

```javascript
module.exports = {
  getUsers,
  getProfile,        // NEW
  updateProfile,     // NEW
  getUserById,
  // ... rest
};
```

### Files Modified
- ✅ `src/controllers/userController.js` (lines 84-169)
- ✅ `src/routes/users.js` (lines 4-5, 187-189)

### Testing Verification

```bash
# Test GET profile
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# ✅ RESULT: Returns user profile with order stats

# Test PUT profile
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith Updated"}'

# ✅ RESULT: Profile updated successfully
```

### Lessons Learned
1. Route order matters in Express.js
2. Specific routes must come before parameterized routes
3. User-friendly endpoints improve API usability

---

## Issue #2: Double Password Hashing

### Metadata
- **Severity:** 🔴 CRITICAL
- **Status:** ✅ FIXED
- **Discovered:** October 18, 2025 (Previous Session)
- **Component:** Authentication System
- **Impact:** All users unable to login

### Problem Description

All login attempts failed with "Invalid credentials" error, even when using correct passwords from the seeder. This made the application completely unusable.

### Error Message
```bash
POST /api/auth/login
{
  "login": "admin@keypointmart.com",
  "password": "admin123"
}

→ 400 Bad Request
{
  "status": "error",
  "message": "Invalid credentials"
}
```

### Root Cause Analysis

Passwords were being hashed **TWICE**:

1. **First Hash:** Manual hashing in `seedData.js`
   ```javascript
   const bcrypt = require('bcryptjs');

   const users = [
     {
       name: 'KeyPointMart Admin',
       email: 'admin@keypointmart.com',
       password: await bcrypt.hash('admin123', 12),  // ← Hash #1
       role: 'admin'
     }
   ];
   ```

2. **Second Hash:** Automatic hashing in User model pre-save hook
   ```javascript
   // User.js
   userSchema.pre('save', async function(next) {
     if (!this.isModified('password')) {
       return next();
     }
     const salt = await bcrypt.genSalt(12);
     this.password = await bcrypt.hash(this.password, salt);  // ← Hash #2
     next();
   });
   ```

**Result:** Password stored as `hash(hash('admin123'))` instead of `hash('admin123')`

**Login Comparison:**
```
User enters: 'admin123'
Hashed as: hash('admin123')
Compare with DB: hash(hash('admin123'))
Result: ❌ NO MATCH
```

### Solution Implemented

Removed manual hashing from `seedData.js`, letting the model handle it.

File: `src/scripts/seedData.js`

**Before:**
```javascript
const bcrypt = require('bcryptjs');

const seedUsers = async () => {
  const users = [
    {
      name: 'KeyPointMart Admin',
      email: 'admin@keypointmart.com',
      password: await bcrypt.hash('admin123', 12),  // ← Removed
      role: 'admin'
    }
  ];

  const createdUsers = await User.create(users);
  return createdUsers;
};
```

**After:**
```javascript
// bcrypt import removed

const seedUsers = async () => {
  const users = [
    {
      name: 'KeyPointMart Admin',
      email: 'admin@keypointmart.com',
      password: 'admin123',  // ← Plain text, will be hashed by model
      role: 'admin'
    }
  ];

  const createdUsers = await User.create(users);  // Model hook hashes it
  return createdUsers;
};
```

### Files Modified
- ✅ `src/scripts/seedData.js` (lines 1-2, 48, 59, 69, 79, 89, 100, 112, 124, 136)

### Testing Verification
```bash
# Re-seed database
docker-compose exec app npm run seed

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin@keypointmart.com","password":"admin123"}'

# ✅ RESULT: Login successful, token returned
```

### Lessons Learned
1. Never hash passwords manually when model hooks exist
2. Single responsibility: Let the model handle password hashing
3. Document where password hashing occurs

---

## Issue #3: Shop Business Hours Crash

### Metadata
- **Severity:** 🔴 CRITICAL
- **Status:** ✅ FIXED
- **Discovered:** October 18, 2025 (Previous Session)
- **Component:** Shop Model
- **Impact:** Shops endpoint completely broken

### Problem Description

The `/api/shops` endpoint returned a 500 Internal Server Error, making it impossible to list shops or check their business hours.

### Error Message
```bash
GET /api/shops

→ 500 Internal Server Error
{
  "status": "error",
  "message": "Value lowercase out of range for Date.prototype.toLocaleDateString options property weekday"
}
```

### Stack Trace
```
RangeError: Value lowercase out of range for Date.prototype.toLocaleDateString options property weekday
    at Date.toLocaleDateString (<anonymous>)
    at model.isCurrentlyOpen (/app/src/models/Shop.js:324:29)
```

### Root Cause Analysis

File: `src/models/Shop.js` (line 324)

```javascript
shopSchema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });  // ← ERROR
  const currentTime = now.toTimeString().slice(0, 5);

  const todayHours = this.businessHours.find(h => h.day === currentDay);
  // ...
};
```

**Problem:** `toLocaleDateString()` doesn't accept `'lowercase'` as a valid value for the `weekday` option.

**Valid Values:**
- `'narrow'` → "M"
- `'short'` → "Mon"
- `'long'` → "Monday"
- ❌ `'lowercase'` → INVALID

### Solution Implemented

Changed to use `'long'` option and then convert to lowercase.

File: `src/models/Shop.js` (line 324)

**Before:**
```javascript
const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
```

**After:**
```javascript
const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
```

**Flow:**
```
Date object → toLocaleDateString('long') → "Monday" → toLowerCase() → "monday"
```

### Files Modified
- ✅ `src/models/Shop.js` (line 324)

### Testing Verification
```bash
# Test shops endpoint
curl -X GET http://localhost:3000/api/shops

# ✅ RESULT: Returns all shops with isCurrentlyOpen status

# Verify business hours calculation
curl -X GET http://localhost:3000/api/shops/68f36090b9f4f172d0515613

# Sample response showing calculated status
{
  "businessHours": [
    {"day": "monday", "openTime": "10:00", "closeTime": "20:00"}
  ],
  "isCurrentlyOpen": false  // ← Calculated correctly
}
```

### Lessons Learned
1. Always check API documentation for valid parameter values
2. Method chaining can solve formatting issues
3. Test date/time functions in different scenarios

---

## Issue #4: Duplicate MongoDB Indexes

### Metadata
- **Severity:** 🟡 WARNING
- **Status:** ✅ FIXED
- **Discovered:** October 18, 2025 (Previous Session)
- **Component:** Database Schema
- **Impact:** Console warnings, potential performance issues

### Problem Description

Multiple Mongoose warnings appearing in console logs:

```
[MONGOOSE] Warning: Duplicate schema index on {"email":1} found
[MONGOOSE] Warning: Duplicate schema index on {"phone":1} found
[MONGOOSE] Warning: Duplicate schema index on {"slug":1} found
[MONGOOSE] Warning: Duplicate schema index on {"orderNumber":1} found
```

### Root Cause Analysis

Fields marked with `unique: true` automatically create indexes, but the code also had explicit `.index()` calls, creating duplicates.

**Example in User.js:**
```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true  // ← Creates index automatically
  },
  phone: {
    type: String,
    unique: true  // ← Creates index automatically
  }
});

// Later in the same file:
userSchema.index({ email: 1 });   // ← DUPLICATE!
userSchema.index({ phone: 1 });   // ← DUPLICATE!
```

### Solution Implemented

Removed explicit index declarations for fields already marked as `unique`.

**User.js:**
```javascript
// REMOVED:
// userSchema.index({ email: 1 });
// userSchema.index({ phone: 1 });
```

**Category.js, Product.js, Shop.js:**
```javascript
// REMOVED:
// schema.index({ slug: 1 });
```

**Order.js:**
```javascript
// REMOVED:
// orderSchema.index({ orderNumber: 1 });
```

### Files Modified
- ✅ `src/models/User.js`
- ✅ `src/models/Category.js`
- ✅ `src/models/Product.js`
- ✅ `src/models/Shop.js`
- ✅ `src/models/Order.js`

### Testing Verification
```bash
# Re-seed database
docker-compose exec app npm run seed

# ✅ RESULT: No index warnings in console

# Verify indexes still exist
docker-compose exec mongo mongosh keypointmart --eval "db.users.getIndexes()"

# ✅ RESULT: Indexes present but not duplicated
```

### Impact
- Cleaner console logs
- Prevented potential index maintenance overhead
- No functional impact (indexes still work correctly)

---

## Issue #5: Deprecated MongoDB Options

### Metadata
- **Severity:** 🟡 WARNING
- **Status:** ✅ FIXED
- **Discovered:** October 18, 2025 (Previous Session)
- **Component:** Database Connection
- **Impact:** Deprecation warnings in logs

### Problem Description

MongoDB driver deprecation warnings:

```
[MONGODB DRIVER] Warning: useNewUrlParser is a deprecated option: useNewUrlParser has no effect since Node.js Driver version 4.0.0 and will be removed in the next major version

[MONGODB DRIVER] Warning: useUnifiedTopology is a deprecated option: useUnifiedTopology has no effect since Node.js Driver version 4.0.0 and will be removed in the next major version
```

### Root Cause Analysis

Using outdated connection options from MongoDB driver v3, but running v7.

**database.js:**
```javascript
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,      // ← Deprecated
  useUnifiedTopology: true,   // ← Deprecated
});
```

These options were required in MongoDB driver v3 but are now defaults in v4+.

### Solution Implemented

Removed deprecated options from all mongoose.connect() calls.

**database.js:**
```javascript
// Before
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// After
const conn = await mongoose.connect(process.env.MONGODB_URI);
```

**seedData.js:**
```javascript
// Before
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keypointmart', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// After
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keypointmart');
```

### Files Modified
- ✅ `src/config/database.js`
- ✅ `src/scripts/seedData.js`

### Testing Verification
```bash
# Restart services
docker-compose restart app

# ✅ RESULT: No deprecation warnings in logs

# Verify connection works
curl http://localhost:3000/health

# ✅ RESULT: Database connected successfully
```

### Lessons Learned
1. Keep up with driver version changes
2. Remove deprecated options when upgrading
3. Default options are often sufficient

---

## Issue #6: Order Creation Failed

### Metadata
- **Severity:** 🔴 CRITICAL
- **Status:** ✅ FIXED
- **Discovered:** October 19, 2025
- **Component:** Order Processing
- **Impact:** Users unable to create orders

### Problem Description

All attempts to create orders failed with validation error, making the entire order workflow non-functional.

### Error Message
```bash
POST /api/orders

→ 400 Bad Request
{
  "status": "error",
  "message": "Path `orderNumber` is required.",
  "stack": "ValidationError: Order validation failed: orderNumber: Path `orderNumber` is required."
}
```

### Root Cause Analysis

Mongoose validation lifecycle issue:

1. **Request arrives** with order data
2. **Mongoose validates** required fields → `orderNumber` is missing ❌
3. **Validation fails** before pre-save hook runs
4. Pre-save hook never executes (never generates orderNumber)

**Order.js Schema:**
```javascript
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,  // ← Validation happens FIRST
    unique: true
  }
});

// Pre-save hook runs AFTER validation
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate order number here  // ← Too late!
    this.orderNumber = `KPM${year}${month}${day}${sequence}`;
  }
  next();
});
```

**Mongoose Lifecycle:**
```
1. new Order(data)
2. Validation (orderNumber required? NO → ❌ FAIL)
3. Pre-save hooks (never reached)
4. Save to database (never reached)
```

### Solution Implemented

Made `orderNumber` not required since it's auto-generated.

File: `src/models/Order.js` (line 42)

**Before:**
```javascript
orderNumber: {
  type: String,
  required: true,  // ← Blocked auto-generation
  unique: true
}
```

**After:**
```javascript
orderNumber: {
  type: String,
  required: false,  // Auto-generated by pre-save hook
  unique: true
}
```

### Files Modified
- ✅ `src/models/Order.js` (line 42)

### Testing Verification
```bash
# Test order creation
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "68f36090b9f4f172d0515613",
    "items": [
      {"product": "68f36090b9f4f172d051563b", "quantity": 2},
      {"product": "68f36090b9f4f172d0515637", "quantity": 1}
    ],
    "delivery": {
      "type": "delivery",
      "address": "68f36090b9f4f172d0515603"
    },
    "payment": {
      "method": "upi"
    }
  }'

# ✅ RESULT: Order created successfully
{
  "status": "success",
  "data": {
    "order": {
      "orderNumber": "KPM2510190001",  // ← Auto-generated
      "total": 157289,
      "status": "pending"
    }
  }
}
```

### Lessons Learned
1. Understand Mongoose validation lifecycle
2. Don't mark auto-generated fields as required
3. Pre-save hooks run after validation
4. Use `required: false` for computed fields

---

## Issue #7: Nearby Shops Returned Empty

### Metadata
- **Severity:** 🔴 CRITICAL
- **Status:** ✅ FIXED
- **Discovered:** October 19, 2025
- **Component:** Location Services
- **Impact:** Location-based shop discovery not working

### Problem Description

The nearby shops endpoint always returned 0 results, even when shops existed at the exact coordinates being searched.

### Error Message
```bash
GET /api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10

→ 200 OK
{
  "status": "success",
  "results": 0,
  "data": {
    "shops": []  // ← Always empty!
  }
}
```

### Root Cause Analysis

The `findNearbyShops()` utility used MongoDB's `$near` geospatial operator:

**location.js (Before):**
```javascript
const findNearbyShops = async (Shop, coordinates, radiusKm = 10, filters = {}) => {
  const query = {
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: radiusKm * 1000
      }
    },
    isActive: true,
    'verification.status': 'verified'
  };

  const shops = await Shop.find(query);
  return shops;
};
```

**Problem 1: Data Format Mismatch**
- `$near` requires GeoJSON: `{type: "Point", coordinates: [lng, lat]}`
- Shops stored as plain object: `{latitude: 19.076, longitude: 72.8777}`

**Problem 2: Missing Index**
- `$near` requires 2dsphere index
- Shop model only had regular compound index on lat/lng fields

**Shop.js:**
```javascript
address: {
  coordinates: {
    latitude: Number,      // ← Plain number, not GeoJSON
    longitude: Number      // ← Plain number, not GeoJSON
  }
}

// Index (not 2dsphere):
shopSchema.index({
  'address.coordinates.latitude': 1,
  'address.coordinates.longitude': 1
});
```

### Solution Implemented

Replaced MongoDB geospatial query with manual distance calculation using Haversine formula.

File: `src/utils/location.js` (lines 161-203)

**After:**
```javascript
const findNearbyShops = async (Shop, coordinates, radiusKm = 10, filters = {}) => {
  // Step 1: Query all active, verified shops
  const query = {
    isActive: true,
    'verification.status': 'verified',
    'address.coordinates.latitude': { $exists: true },
    'address.coordinates.longitude': { $exists: true },
    ...filters
  };

  const allShops = await Shop.find(query);

  // Step 2: Calculate distance for each shop
  const shopsWithDistance = allShops.map(shop => {
    const distance = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      shop.address.coordinates.latitude,
      shop.address.coordinates.longitude
    );

    return {
      shop,
      distance
    };
  })
  // Step 3: Filter by radius
  .filter(item => item.distance <= radiusKm)
  // Step 4: Sort by distance (nearest first)
  .sort((a, b) => a.distance - b.distance)
  // Step 5: Limit results
  .slice(0, 50);

  // Step 6: Format response with distance info
  return shopsWithDistance.map(item => {
    return {
      ...item.shop.toObject(),
      distance: Math.round(item.distance * 100) / 100,
      estimatedDeliveryTime: calculateDeliveryTime(item.distance, item.shop.settings.preparationTime || 30)
    };
  });
};
```

**Haversine Formula (for distance calculation):**
```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;  // Distance in kilometers
};
```

### Files Modified
- ✅ `src/utils/location.js` (lines 161-203)

### Testing Verification
```bash
# Test nearby shops
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10"

# ✅ RESULT: Returns 4 shops
{
  "status": "success",
  "results": 4,
  "data": {
    "shops": [
      {
        "businessName": "Rajesh Electronics Store",
        "distance": 0,           // ← Exact match
        "estimatedDeliveryTime": 40
      },
      {
        "businessName": "Priya Fashion Boutique",
        "distance": 1.26,        // ← 1.26 km away
        "estimatedDeliveryTime": 40
      },
      {
        "businessName": "Ahmed's Delicious Kitchen",
        "distance": 1.81,        // ← 1.81 km away
        "estimatedDeliveryTime": 45
      },
      {
        "businessName": "Sita Daily Needs Grocery",
        "distance": 2.79,        // ← 2.79 km away
        "estimatedDeliveryTime": 45
      }
    ]
  }
}

# Test with business type filter
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=10&businessType=electronics"

# ✅ RESULT: Returns only 1 electronics shop

# Test with smaller radius
curl -X GET "http://localhost:3000/api/location/nearby-shops?latitude=19.076&longitude=72.8777&radius=2"

# ✅ RESULT: Returns only 3 shops (filters out the one at 2.79 km)
```

### Performance Comparison

**Before (with $near - didn't work):**
- Query time: N/A (returned 0 results)
- Index usage: Required 2dsphere index

**After (manual calculation):**
- Query time: ~82ms (4 shops)
- Scalability: O(n) where n = total shops
- Works with existing data structure

**Note:** For production with 1000+ shops, consider:
1. Adding 2dsphere index and converting data to GeoJSON
2. Using spatial database like PostGIS
3. Implementing caching for popular locations

### Lessons Learned
1. MongoDB geospatial queries require specific data format
2. 2dsphere indexes need GeoJSON Point format
3. Manual distance calculation is viable for small datasets
4. Haversine formula provides accurate distance calculation
5. Always test with actual data, not just schema validation

---

## Prevention Strategies

### Code Review Checklist
- [ ] Routes ordered correctly (specific before parameterized)
- [ ] No duplicate hashing in seeders when model hooks exist
- [ ] Valid options for all Date/Number API methods
- [ ] No duplicate indexes (check unique fields)
- [ ] Using latest options for external libraries
- [ ] Auto-generated fields not marked as required
- [ ] Data format matches query requirements

### Testing Requirements
- [ ] Test all CRUD operations
- [ ] Test edge cases (empty results, invalid IDs)
- [ ] Test with actual seeded data
- [ ] Monitor console for warnings
- [ ] Verify geolocation with multiple coordinates
- [ ] Test authentication flows end-to-end

### Monitoring
- [ ] Set up error logging (Winston/Morgan)
- [ ] Monitor deprecation warnings
- [ ] Track API response times
- [ ] Alert on validation failures
- [ ] Monitor database query performance

---

## Appendix: Quick Reference

### Error Patterns

| Error Pattern | Likely Cause | Solution |
|---------------|--------------|----------|
| CastError: Cast to ObjectId failed | Route parameter collision | Reorder routes |
| Invalid credentials | Password hashing mismatch | Check hashing points |
| Value X out of range | Invalid API option | Check documentation |
| Duplicate schema index | unique + .index() | Remove explicit index |
| Deprecated option warning | Old library usage | Update options |
| Path required validation | Pre-save timing | Change to required: false |
| Empty geolocation results | Data format mismatch | Check GeoJSON vs plain object |

### Common Fixes

```javascript
// Route ordering
router.route('/profile').get(...)  // ← Specific first
router.route('/:id').get(...)       // ← Parameterized after

// Password hashing
password: 'plaintext'  // ← Let model handle it

// Date formatting
.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

// Auto-generated fields
required: false  // ← When using pre-save hooks

// Distance calculation
// Use Haversine formula instead of $near for non-GeoJSON data
```

---

**Document Version:** 1.0
**Last Updated:** October 19, 2025
**Maintained By:** Development Team
