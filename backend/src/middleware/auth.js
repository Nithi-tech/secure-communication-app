/**
 * Authentication Middleware
 * Verifies JWT tokens for REST and Socket.io connections
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Sign access token (short-lived)
 */
function signAccessToken(user) {
  return jwt.sign(
    { 
      sub: user._id.toString(),
      userId: user._id.toString(),
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );
}

/**
 * Sign refresh token (longer-lived)
 */
function signRefreshToken(user) {
  return jwt.sign(
    { 
      sub: user._id.toString(),
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '7d' }
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * Authenticate JWT token for REST endpoints
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({error: 'No token provided'});
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Verify user is still active
    const user = await User.findById(decoded.sub || decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(403).json({error: 'User inactive or revoked'});
    }

    // Store both user object and userId for routes
    req.userId = user._id;        // MongoDB ObjectId
    req.user = user;              // Full user object
    req.userRole = user.role;     // User role
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({error: 'Token expired', code: 'TOKEN_EXPIRED'});
    }
    return res.status(401).json({error: 'Invalid token'});
  }
};

/**
 * Socket.io authentication middleware
 * Verifies JWT during handshake and attaches userId to socket
 */
exports.socketAuth = async (socket, next) => {
  try {
    // Try to get token from auth object or headers
    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await User.findById(decoded.sub || decoded.userId);
    if (!user || user.status !== 'active') {
      return next(new Error('Authentication error: User inactive'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      rank: user.rank,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Require admin role
 */
exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({error: 'Admin access required'});
  }
  next();
};

// Export token functions
module.exports.signAccessToken = signAccessToken;
module.exports.signRefreshToken = signRefreshToken;
module.exports.verifyAccessToken = verifyAccessToken;
module.exports.verifyRefreshToken = verifyRefreshToken;

