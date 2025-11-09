/**
 * Authentication Routes
 * Username/Password login (no OTP)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {authenticate} = require('../middleware/auth');
const { auditAuth } = require('../middleware/auditLogger');

/**
 * POST /api/auth/login
 * Login with userId + password
 */
router.post('/login', auditAuth('login'), async (req, res) => {
  try {
    const {userId, password} = req.body;

    if (!userId || !password) {
      return res.status(400).json({error: 'User ID and password are required'});
    }

    const user = await User.findOne({userId: userId.toLowerCase().trim()});
    if (!user) {
      return res.status(401).json({error: 'Invalid credentials'});
    }

    if (user.status !== 'active') {
      return res.status(403).json({error: 'Account suspended or revoked'});
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({error: 'Invalid credentials'});
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = jwt.sign(
      {userId: user._id, role: user.role},
      process.env.JWT_SECRET || 'demo-secret-key',
      {expiresIn: '24h'}
    );

    const refreshToken = jwt.sign(
      {userId: user._id},
      process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret',
      {expiresIn: '7d'}
    );

    console.log(` User logged in: ${userId}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        badgeNo: user.badgeNo,
        name: user.name,
        rank: user.rank,
        department: user.department,
        role: user.role,
        phoneNumber: user.phoneNumber,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 86400,
      },
      needsProvisioning: false,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({error: 'Login failed', details: error.message});
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const {refreshToken} = req.body;
    if (!refreshToken) {
      return res.status(400).json({error: 'Refresh token required'});
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret');
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({error: 'Invalid token'});
    }

    const accessToken = jwt.sign(
      {userId: user._id, role: user.role},
      process.env.JWT_SECRET || 'demo-secret-key',
      {expiresIn: '24h'}
    );

    res.json({tokens: {accessToken, refreshToken, expiresIn: 86400}});
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({error: 'Invalid or expired refresh token'});
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.json({
      user: {
        id: user._id,
        userId: user.userId,
        badgeNo: user.badgeNo,
        name: user.name,
        rank: user.rank,
        department: user.department,
        role: user.role,
        phoneNumber: user.phoneNumber,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({error: 'Failed to get user'});
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    console.log(`User logged out: ${req.userId}`);
    res.json({success: true, message: 'Logged out successfully'});
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({error: 'Logout failed'});
  }
});

module.exports = router;
