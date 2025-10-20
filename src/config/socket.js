const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const User = require('../models/User');

let io;

// Store connected users: { userId: [socketId1, socketId2, ...] }
const connectedUsers = new Map();

// Store socket-to-user mapping: { socketId: userId }
const socketUserMap = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication error: Account is inactive'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`✅ User connected: ${socket.user.name} (${userId}) - Socket: ${socket.id}`);

    // Add user to connected users map
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId).push(socket.id);
    socketUserMap.set(socket.id, userId);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to KeyPointMart real-time server',
      userId: userId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // If user is a shop owner, join shop rooms
    if (socket.user.role === 'shop_owner') {
      socket.join(`shop_owner:${userId}`);
    }

    // If user is a delivery partner, join delivery room
    if (socket.user.role === 'delivery_partner') {
      socket.join('delivery_partners');
    }

    // If user is admin, join admin room
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    // Handle order tracking subscription
    socket.on('subscribe:order', (orderId) => {
      console.log(`📦 User ${userId} subscribed to order: ${orderId}`);
      socket.join(`order:${orderId}`);

      socket.emit('subscribed:order', {
        orderId,
        message: 'Subscribed to order updates',
        timestamp: new Date().toISOString()
      });
    });

    // Handle order tracking unsubscription
    socket.on('unsubscribe:order', (orderId) => {
      console.log(`📦 User ${userId} unsubscribed from order: ${orderId}`);
      socket.leave(`order:${orderId}`);

      socket.emit('unsubscribed:order', {
        orderId,
        message: 'Unsubscribed from order updates',
        timestamp: new Date().toISOString()
      });
    });

    // Handle shop order notifications subscription (for shop owners)
    socket.on('subscribe:shop', (shopId) => {
      if (socket.user.role === 'shop_owner' || socket.user.role === 'admin') {
        console.log(`🏪 User ${userId} subscribed to shop: ${shopId}`);
        socket.join(`shop:${shopId}`);

        socket.emit('subscribed:shop', {
          shopId,
          message: 'Subscribed to shop order notifications',
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Unauthorized: Only shop owners can subscribe to shop notifications' });
      }
    });

    // Handle location updates from delivery partners
    socket.on('update:location', (data) => {
      if (socket.user.role === 'delivery_partner') {
        const { orderId, latitude, longitude } = data;

        console.log(`📍 Delivery partner ${userId} location updated for order ${orderId}`);

        // Emit location update to order room
        io.to(`order:${orderId}`).emit('order:location_update', {
          orderId,
          location: { latitude, longitude },
          timestamp: new Date().toISOString(),
          deliveryPartnerId: userId
        });
      }
    });

    // Handle typing indicators (for chat if implemented)
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('user:typing', {
        userId,
        userName: socket.user.name
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('user:stopped_typing', {
        userId,
        userName: socket.user.name
      });
    });

    // Handle ping for connection health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.name} - Reason: ${reason}`);

      // Remove from connected users
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }

        // Remove user entry if no more sockets
        if (userSockets.length === 0) {
          connectedUsers.delete(userId);
        }
      }

      socketUserMap.delete(socket.id);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  console.log('🔌 Socket.io initialized successfully');
  return io;
};

// Helper functions to emit events

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to user ${userId}`);
  }
};

const emitToOrder = (orderId, event, data) => {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to order ${orderId}`);
  }
};

const emitToShop = (shopId, event, data) => {
  if (io) {
    io.to(`shop:${shopId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to shop ${shopId}`);
  }
};

const emitToDeliveryPartners = (event, data) => {
  if (io) {
    io.to('delivery_partners').emit(event, data);
    console.log(`📤 Emitted ${event} to all delivery partners`);
  }
};

const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
    console.log(`📤 Emitted ${event} to all admins`);
  }
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.keys());
};

const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

const getConnectedSocketsCount = () => {
  return socketUserMap.size;
};

module.exports = {
  initializeSocket,
  getIO: () => io,
  emitToUser,
  emitToOrder,
  emitToShop,
  emitToDeliveryPartners,
  emitToAdmins,
  getConnectedUsers,
  isUserOnline,
  getConnectedSocketsCount
};
