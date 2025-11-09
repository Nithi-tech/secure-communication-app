/**
 * Users Routes
 * Get all users for contact list
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {authenticate} = require('../middleware/auth');

/**
 * GET /api/users/search?q=query
 * Search users by name, posting, or police station
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim();

    // Search using regex for flexible matching
    const users = await User.find({
      _id: { $ne: req.userId },  // Exclude current user
      status: 'active',
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { policeStation: { $regex: searchTerm, $options: 'i' } },
        { posting: { $regex: searchTerm, $options: 'i' } },
        { badgeNo: { $regex: searchTerm, $options: 'i' } },
        { department: { $regex: searchTerm, $options: 'i' } },
      ],
    })
      .select('userId badgeNo name rank department policeStation posting phoneNumber')
      .limit(20);  // Limit results

    console.log(`🔍 Search for "${searchTerm}" returned ${users.length} results`);

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        userId: u.userId,
        badgeNo: u.badgeNo,
        name: u.name,
        rank: u.rank,
        department: u.department,
        policeStation: u.policeStation,
        posting: u.posting,
        phoneNumber: u.phoneNumber,
      })),
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/users
 * Get all users except current user (for contact list)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // Get all users except the authenticated one
    const users = await User.find({
      _id: {$ne: req.userId}, // Exclude current user
      status: 'active', // Only active users
    }).select('userId badgeNo name rank department policeStation posting phoneNumber role');

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        userId: u.userId,
        badgeNo: u.badgeNo,
        name: u.name,
        rank: u.rank,
        department: u.department,
        policeStation: u.policeStation,
        posting: u.posting,
        phoneNumber: u.phoneNumber,
        role: u.role,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({error: 'Failed to fetch users'});
  }
});

/**
 * GET /api/users/:id
 * Get single user details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        badgeNo: user.badgeNo,
        name: user.name,
        rank: user.rank,
        department: user.department,
        policeStation: user.policeStation,
        posting: user.posting,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({error: 'Failed to fetch user'});
  }
});

module.exports = router;
