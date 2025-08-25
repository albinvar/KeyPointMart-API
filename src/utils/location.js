const axios = require('axios');

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Geocode address to coordinates using Google Maps API
const geocodeAddress = async (address) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: response.data.results[0].formatted_address
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

// Reverse geocode coordinates to address
const reverseGeocode = async (latitude, longitude) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const addressComponents = result.address_components;

      // Extract address components
      const getComponent = (type) => {
        const component = addressComponents.find(comp => comp.types.includes(type));
        return component ? component.long_name : '';
      };

      return {
        formatted_address: result.formatted_address,
        components: {
          street_number: getComponent('street_number'),
          route: getComponent('route'),
          locality: getComponent('locality'),
          administrative_area_level_2: getComponent('administrative_area_level_2'),
          administrative_area_level_1: getComponent('administrative_area_level_1'),
          country: getComponent('country'),
          postal_code: getComponent('postal_code')
        },
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
};

// Get distance matrix between origins and destinations
const getDistanceMatrix = async (origins, destinations) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
    const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');

    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: originsStr,
        destinations: destinationsStr,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    if (response.data.status === 'OK') {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Distance matrix error:', error.message);
    return null;
  }
};

// Calculate delivery time based on distance and traffic
const calculateDeliveryTime = (distance, baseTime = 30) => {
  // Base calculation: baseTime + 2 minutes per km
  let deliveryTime = baseTime + (distance * 2);
  
  // Add buffer for traffic (20% extra time)
  deliveryTime *= 1.2;
  
  // Round to nearest 5 minutes
  return Math.ceil(deliveryTime / 5) * 5;
};

// Check if coordinates are within delivery radius
const isWithinDeliveryRadius = (shopCoords, customerCoords, radiusKm) => {
  const distance = calculateDistance(
    shopCoords.latitude,
    shopCoords.longitude,
    customerCoords.latitude,
    customerCoords.longitude
  );
  
  return distance <= radiusKm;
};

// Get nearby shops using MongoDB geospatial query
const findNearbyShops = async (Shop, coordinates, radiusKm = 10, filters = {}) => {
  const query = {
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    },
    isActive: true,
    'verification.status': 'verified',
    ...filters
  };

  try {
    const shops = await Shop.find(query).limit(50);
    
    // Add calculated distance to each shop
    return shops.map(shop => {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        shop.address.coordinates.latitude,
        shop.address.coordinates.longitude
      );
      
      return {
        ...shop.toObject(),
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        estimatedDeliveryTime: calculateDeliveryTime(distance, shop.settings.preparationTime || 30)
      };
    });
  } catch (error) {
    console.error('Error finding nearby shops:', error);
    return [];
  }
};

// Validate Indian pincode format
const validatePincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

// Get city and state from pincode (mock data - in production use external API)
const getPincodeInfo = async (pincode) => {
  // Mock pincode data for Indian cities
  const pincodeData = {
    '400001': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai' },
    '400002': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai' },
    '400003': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai' },
    '400004': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai' },
    '400005': { city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai' },
    '110001': { city: 'New Delhi', state: 'Delhi', district: 'Central Delhi' },
    '560001': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore Urban' },
    '600001': { city: 'Chennai', state: 'Tamil Nadu', district: 'Chennai' },
    '700001': { city: 'Kolkata', state: 'West Bengal', district: 'Kolkata' },
    '411001': { city: 'Pune', state: 'Maharashtra', district: 'Pune' },
    '500001': { city: 'Hyderabad', state: 'Telangana', district: 'Hyderabad' },
    '380001': { city: 'Ahmedabad', state: 'Gujarat', district: 'Ahmedabad' },
    '302001': { city: 'Jaipur', state: 'Rajasthan', district: 'Jaipur' }
  };

  if (!validatePincode(pincode)) {
    return null;
  }

  return pincodeData[pincode] || null;
};

// Calculate service area polygon (simplified version)
const createServiceAreaPolygon = (centerCoords, radiusKm) => {
  const points = [];
  const numPoints = 16; // Create 16-sided polygon
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 360 / numPoints) * Math.PI / 180;
    const lat = centerCoords.latitude + (radiusKm / 111.32) * Math.cos(angle);
    const lon = centerCoords.longitude + (radiusKm / (111.32 * Math.cos(centerCoords.latitude * Math.PI / 180))) * Math.sin(angle);
    points.push([lon, lat]);
  }
  
  // Close the polygon
  points.push(points[0]);
  
  return {
    type: 'Polygon',
    coordinates: [points]
  };
};

// Check if point is within service area
const isPointInServiceArea = (point, serviceArea) => {
  // Simplified point-in-polygon check
  // In production, use a proper geospatial library like turf.js
  if (serviceArea.type !== 'Polygon') {
    return false;
  }
  
  const polygon = serviceArea.coordinates[0];
  let isInside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if ((yi > point.longitude) !== (yj > point.longitude) &&
        (point.latitude < (xj - xi) * (point.longitude - yi) / (yj - yi) + xi)) {
      isInside = !isInside;
    }
  }
  
  return isInside;
};

// Get route information between two points
const getRouteInfo = async (origin, destination) => {
  if (!GOOGLE_MAPS_API_KEY) {
    // Return estimated values if no API key
    const distance = calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    return {
      distance: Math.round(distance * 100) / 100,
      duration: calculateDeliveryTime(distance),
      estimated: true
    };
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.value / 1000, // Convert to km
        duration: Math.ceil(leg.duration.value / 60), // Convert to minutes
        route: route,
        estimated: false
      };
    }

    return null;
  } catch (error) {
    console.error('Route calculation error:', error.message);
    return null;
  }
};

// Get current location based on IP (mock implementation)
const getLocationFromIP = async (ipAddress) => {
  // Mock location for common IP ranges
  // In production, use a proper IP geolocation service
  const mockLocations = {
    '127.0.0.1': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
    '::1': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' }
  };

  return mockLocations[ipAddress] || { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' };
};

module.exports = {
  calculateDistance,
  geocodeAddress,
  reverseGeocode,
  getDistanceMatrix,
  calculateDeliveryTime,
  isWithinDeliveryRadius,
  findNearbyShops,
  validatePincode,
  getPincodeInfo,
  createServiceAreaPolygon,
  isPointInServiceArea,
  getRouteInfo,
  getLocationFromIP
};