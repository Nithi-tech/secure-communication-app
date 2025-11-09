/**
 * Backend Server - Entry Point
 * Express API with Socket.io for real-time messaging
 * SECURITY: Metadata-only storage, no plaintext or keys
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');
const messageRoutes = require('./routes/messages');
const keyRoutes = require('./routes/keys');
const attachmentRoutes = require('./routes/attachments');
const groupRoutes = require('./routes/groups');
const adminRoutes = require('./routes/admin');

// Import middleware
const {authenticate} = require('./middleware/auth');
const {errorHandler} = require('./middleware/errorHandler');

// Import seeder
const {seedContacts} = require('./utils/seedContacts');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for local development
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - Relaxed for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

// Serve static files (HTML test interface)
app.use(express.static('public'));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Seed database with police contacts if empty
    await seedContacts();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/devices', authenticate, deviceRoutes);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/keys', authenticate, keyRoutes);
app.use('/api/attachments', authenticate, attachmentRoutes);
app.use('/api/groups', authenticate, groupRoutes);
app.use('/api/receipts', authenticate, require('./routes/receipts'));
app.use('/api/admin', authenticate, adminRoutes);

// Socket.io connection handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret-key');
    
    // Verify user is active
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return next(new Error('User inactive or revoked'));
    }
    
    socket.userId = decoded.userId;
    socket.userName = user.name;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', socket => {
  console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);

  // Join user's personal room for receiving messages
  socket.join(`user_${socket.userId}`);

  // Handle user online status
  socket.broadcast.emit('user_online', { userId: socket.userId });

  // Handle typing indicator
  socket.on('typing', data => {
    const { toUserId, isTyping } = data;
    io.to(`user_${toUserId}`).emit('typing', {
      fromUserId: socket.userId,
      isTyping,
    });
  });

  // Handle join group room
  socket.on('join_group', data => {
    const { groupId } = data;
    socket.join(`group_${groupId}`);
    console.log(`👥 User ${socket.userId} joined group ${groupId}`);
  });

  // Handle leave group room
  socket.on('leave_group', data => {
    const { groupId } = data;
    socket.leave(`group_${groupId}`);
    console.log(`👋 User ${socket.userId} left group ${groupId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userName} (${socket.userId})`);
    socket.broadcast.emit('user_offline', { userId: socket.userId });
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({error: 'Route not found'});
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.io enabled for real-time messaging`);
});

module.exports = {app, server, io};
