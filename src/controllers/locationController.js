const Shop = require('../models/Shop');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  calculateDistance,
  geocodeAddress,
  reverseGeocode,
  calculateDeliveryTime,
  findNearbyShops,
  validatePincode,
  getPincodeInfo,
  getRouteInfo,
  getLocationFromIP
} = require('../utils/location');

// @desc    Get nearby shops based on coordinates
// @route   GET /api/location/nearby-shops
// @access  Public
const getNearbyShops = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10, businessType, category } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude are required'
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid latitude or longitude'
    });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude must be between -90 and 90, longitude must be between -180 and 180'
    });
  }

  const coordinates = { latitude: lat, longitude: lng };
  const radiusKm = Math.min(parseFloat(radius), 50); // Max 50km radius

  let filters = {};
  if (businessType) {
    filters.businessType = businessType;
  }
  if (category) {
    filters.categories = category;
  }

  const nearbyShops = await findNearbyShops(Shop, coordinates, radiusKm, filters);

  // Populate additional shop data
  const populatedShops = await Shop.populate(nearbyShops, [
    { path: 'categories', select: 'name slug' },
    { path: 'owner', select: 'name' }
  ]);

  res.status(200).json({
    status: 'success',
    results: populatedShops.length,
    data: {
      location: {
        latitude: lat,
        longitude: lng,
        radius: radiusKm
      },
      shops: populatedShops.map(shop => ({
        ...shop,
        isCurrentlyOpen: Shop.prototype.isCurrentlyOpen.call(shop)
      }))
    }
  });
});

// @desc    Geocode an address to coordinates
// @route   POST /api/location/geocode
// @access  Public
const geocodeAddressAPI = asyncHandler(async (req, res) => {
  const { address } = req.body;

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Address is required'
    });
  }

  const result = await geocodeAddress(address.trim());

  if (!result) {
    return res.status(404).json({
      status: 'error',
      message: 'Address not found or geocoding service unavailable'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      address: address.trim(),
      coordinates: {
        latitude: result.latitude,
        longitude: result.longitude
      },
      formatted_address: result.formatted_address
    }
  });
});

// @desc    Reverse geocode coordinates to address
// @route   POST /api/location/reverse-geocode
// @access  Public
const reverseGeocodeAPI = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude are required'
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid latitude or longitude'
    });
  }

  const result = await reverseGeocode(lat, lng);

  if (!result) {
    return res.status(404).json({
      status: 'error',
      message: 'Location not found or geocoding service unavailable'
    });
  }

  res.status(200).json({
    status: 'success',
    data: result
  });
});

// @desc    Calculate distance between two locations
// @route   POST /api/location/distance
// @access  Public
const calculateDistanceAPI = asyncHandler(async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      status: 'error',
      message: 'Origin and destination are required'
    });
  }

  const { latitude: lat1, longitude: lng1 } = origin;
  const { latitude: lat2, longitude: lng2 } = destination;

  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return res.status(400).json({
      status: 'error',
      message: 'Both origin and destination must have latitude and longitude'
    });
  }

  const distance = calculateDistance(
    parseFloat(lat1),
    parseFloat(lng1),
    parseFloat(lat2),
    parseFloat(lng2)
  );

  const deliveryTime = calculateDeliveryTime(distance);

  res.status(200).json({
    status: 'success',
    data: {
      origin,
      destination,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      unit: 'km',
      estimatedDeliveryTime: deliveryTime,
      timeUnit: 'minutes'
    }
  });
});

// @desc    Get route information between two points
// @route   POST /api/location/route
// @access  Public
const getRoute = asyncHandler(async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      status: 'error',
      message: 'Origin and destination are required'
    });
  }

  const { latitude: lat1, longitude: lng1 } = origin;
  const { latitude: lat2, longitude: lng2 } = destination;

  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return res.status(400).json({
      status: 'error',
      message: 'Both origin and destination must have latitude and longitude'
    });
  }

  const routeInfo = await getRouteInfo(
    { latitude: parseFloat(lat1), longitude: parseFloat(lng1) },
    { latitude: parseFloat(lat2), longitude: parseFloat(lng2) }
  );

  if (!routeInfo) {
    return res.status(404).json({
      status: 'error',
      message: 'Route not found or routing service unavailable'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      origin,
      destination,
      distance: routeInfo.distance,
      distanceUnit: 'km',
      duration: routeInfo.duration,
      durationUnit: 'minutes',
      estimated: routeInfo.estimated,
      route: routeInfo.route
    }
  });
});

// @desc    Validate and get pincode information
// @route   GET /api/location/pincode/:pincode
// @access  Public
const getPincodeDetails = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  if (!validatePincode(pincode)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid pincode format. Must be 6 digits and not start with 0.'
    });
  }

  const pincodeInfo = await getPincodeInfo(pincode);

  if (!pincodeInfo) {
    return res.status(404).json({
      status: 'error',
      message: 'Pincode information not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      pincode,
      ...pincodeInfo,
      isValid: true
    }
  });
});

// @desc    Check delivery availability for coordinates
// @route   POST /api/location/delivery-check
// @access  Public
const checkDeliveryAvailability = asyncHandler(async (req, res) => {
  const { shopId, latitude, longitude } = req.body;

  if (!shopId || !latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Shop ID, latitude, and longitude are required'
    });
  }

  const shop = await Shop.findById(shopId);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  if (!shop.isActive || shop.verification.status !== 'verified') {
    return res.status(400).json({
      status: 'error',
      message: 'Shop is not available for delivery'
    });
  }

  const customerCoords = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
  const shopCoords = shop.address.coordinates;

  const distance = calculateDistance(
    shopCoords.latitude,
    shopCoords.longitude,
    customerCoords.latitude,
    customerCoords.longitude
  );

  const isWithinRadius = distance <= shop.settings.serviceRadius;
  const deliveryTime = calculateDeliveryTime(distance, shop.settings.preparationTime || 30);

  res.status(200).json({
    status: 'success',
    data: {
      shop: {
        id: shop._id,
        name: shop.businessName,
        address: shop.address,
        serviceRadius: shop.settings.serviceRadius,
        deliveryFee: shop.settings.deliveryFee
      },
      customer: {
        coordinates: customerCoords
      },
      delivery: {
        available: isWithinRadius,
        distance: Math.round(distance * 100) / 100,
        estimatedTime: deliveryTime,
        fee: isWithinRadius ? shop.settings.deliveryFee : 0,
        reason: isWithinRadius ? null : 'Location outside delivery area'
      }
    }
  });
});

// @desc    Get user location based on IP
// @route   GET /api/location/detect
// @access  Public
const detectLocation = asyncHandler(async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  const location = await getLocationFromIP(clientIP);

  res.status(200).json({
    status: 'success',
    data: {
      ip: clientIP,
      location,
      estimated: true,
      message: 'Location detected from IP address. For better accuracy, enable GPS.'
    }
  });
});

// @desc    Get shops by business type and location
// @route   GET /api/location/shops-by-type
// @access  Public
const getShopsByType = asyncHandler(async (req, res) => {
  const { latitude, longitude, businessType, radius = 10, limit = 20 } = req.query;

  if (!latitude || !longitude || !businessType) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude, longitude, and business type are required'
    });
  }

  const coordinates = { 
    latitude: parseFloat(latitude), 
    longitude: parseFloat(longitude) 
  };

  const filters = { businessType };
  const nearbyShops = await findNearbyShops(Shop, coordinates, parseFloat(radius), filters);

  // Limit results
  const limitedShops = nearbyShops.slice(0, parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: limitedShops.length,
    data: {
      businessType,
      location: coordinates,
      radius: parseFloat(radius),
      shops: limitedShops
    }
  });
});

// @desc    Get delivery zones for a shop
// @route   GET /api/location/delivery-zones/:shopId
// @access  Public
const getDeliveryZones = asyncHandler(async (req, res) => {
  const { shopId } = req.params;

  const shop = await Shop.findById(shopId);

  if (!shop) {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found'
    });
  }

  const serviceRadius = shop.settings.serviceRadius || 5;
  const shopCoords = shop.address.coordinates;

  // Create delivery zones (simplified)
  const zones = [
    {
      name: 'Express Zone',
      radius: Math.min(serviceRadius * 0.3, 2),
      deliveryTime: '15-25 mins',
      fee: 0,
      color: '#00FF00'
    },
    {
      name: 'Standard Zone',
      radius: Math.min(serviceRadius * 0.7, 5),
      deliveryTime: '25-35 mins',
      fee: shop.settings.deliveryFee * 0.5,
      color: '#FFFF00'
    },
    {
      name: 'Extended Zone',
      radius: serviceRadius,
      deliveryTime: '35-50 mins',
      fee: shop.settings.deliveryFee,
      color: '#FF6600'
    }
  ];

  res.status(200).json({
    status: 'success',
    data: {
      shop: {
        id: shop._id,
        name: shop.businessName,
        coordinates: shopCoords
      },
      zones: zones.map(zone => ({
        ...zone,
        center: shopCoords,
        radiusKm: zone.radius
      }))
    }
  });
});

module.exports = {
  getNearbyShops,
  geocodeAddressAPI,
  reverseGeocodeAPI,
  calculateDistanceAPI,
  getRoute,
  getPincodeDetails,
  checkDeliveryAvailability,
  detectLocation,
  getShopsByType,
  getDeliveryZones
};