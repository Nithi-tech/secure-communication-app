/**
 * User Model
 * SECURITY: Stores only metadata, no message content
 * Authentication: userId + bcrypt hashed password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  badgeNo: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  rank: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  policeStation: {
    type: String,
    required: true,
    index: true,  // For search optimization
  },
  posting: {
    type: String,
    required: true,
    index: true,  // For search optimization
  },
  role: {
    type: String,
    enum: ['officer', 'admin', 'super_admin'],
    default: 'officer',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active',
  },
  registrationId: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: Date,
  // Refresh tokens (stored hashed for security)
  refreshTokens: [{
    tokenHash: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
  }]
});

// Compound index for search by name, posting, or station
userSchema.index({ 
  name: 'text', 
  policeStation: 'text', 
  posting: 'text' 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Don't return password and refresh tokens in JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

// Add refresh token
userSchema.methods.addRefreshToken = function(tokenHash, expiresIn) {
  const expiresAt = new Date();
  expiresAt.setMilliseconds(expiresAt.getMilliseconds() + ms(expiresIn || process.env.REFRESH_TOKEN_TTL || '7d'));
  
  this.refreshTokens.push({ tokenHash, expiresAt });
  
  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function(tokenHash) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.tokenHash !== tokenHash);
  return this.save();
};

// Remove expired tokens
userSchema.methods.removeExpiredTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
  if (this.isModified('refreshTokens')) {
    return this.save();
  }
  return Promise.resolve(this);
};

// Helper for ms parsing (simple version)
function ms(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
}

module.exports = mongoose.model('User', userSchema);
