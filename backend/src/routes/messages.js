/**
 * Message Routes
 * Handles sending, receiving, and searching messages
 * SECURITY: Only encrypted content is stored
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * POST /api/messages
 * Send a new message (encrypted)
 */
router.post('/', async (req, res) => {
  try {
    const { toUserId, groupId, encryptedContent, contentType, messageType } = req.body;

    // Validate required fields
    if (!encryptedContent) {
      return res.status(400).json({ error: 'Encrypted content is required' });
    }

    if (!toUserId && !groupId) {
      return res.status(400).json({ error: 'Either toUserId or groupId is required' });
    }

    // Verify recipient exists and is active
    if (toUserId) {
      const recipient = await User.findById(toUserId);
      if (!recipient || recipient.status !== 'active') {
        return res.status(404).json({ error: 'Recipient not found or inactive' });
      }
    }

    // Create message
    const message = new Message({
      fromUserId: req.userId,
      toUserId: toUserId || null,
      groupId: groupId || null,
      encryptedContent,
      contentType: contentType || 'text',
      messageType: messageType || 'message',
      delivered: false,
    });

    await message.save();

    // Real-time delivery via Socket.io
    const io = req.app.get('io');
    
    // Populate sender info for real-time notification
    const sender = await User.findById(req.userId).select('name badgeNo rank policeStation');
    
    const messagePayload = {
      id: message._id,
      fromUserId: req.userId,
      toUserId: toUserId,
      groupId: groupId,
      encryptedContent: message.encryptedContent,
      contentType: message.contentType,
      messageType: message.messageType,
      timestamp: message.createdAt,
      sender: {
        id: sender._id,
        name: sender.name,
        badgeNo: sender.badgeNo,
        rank: sender.rank,
        policeStation: sender.policeStation,
      },
    };

    // Send to recipient's room
    if (toUserId) {
      io.to(`user_${toUserId}`).emit('new_message', messagePayload);
    }

    // Send to group room
    if (groupId) {
      io.to(`group_${groupId}`).emit('new_message', messagePayload);
    }

    console.log(`✉️ Message sent from ${req.userId} to ${toUserId || `group_${groupId}`}`);

    res.status(201).json({
      success: true,
      message: {
        id: message._id,
        fromUserId: req.userId,
        toUserId: message.toUserId,
        groupId: message.groupId,
        timestamp: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

/**
 * GET /api/messages/conversation/:userId
 * Get chat history with a specific user
 */
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;

    // Build query for messages between current user and target user
    const query = {
      $or: [
        { fromUserId: req.userId, toUserId: userId },
        { fromUserId: userId, toUserId: req.userId },
      ],
    };

    // Pagination: load messages before a specific timestamp
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })  // Newest first
      .limit(parseInt(limit))
      .populate('fromUserId', 'name badgeNo rank policeStation')
      .populate('toUserId', 'name badgeNo rank policeStation');

    res.json({
      success: true,
      messages: messages.reverse().map(m => ({  // Reverse to oldest first
        id: m._id,
        fromUserId: m.fromUserId._id,
        toUserId: m.toUserId._id,
        encryptedContent: m.encryptedContent,
        contentType: m.contentType,
        messageType: m.messageType,
        timestamp: m.createdAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        sender: {
          name: m.fromUserId.name,
          badgeNo: m.fromUserId.badgeNo,
          rank: m.fromUserId.rank,
          policeStation: m.fromUserId.policeStation,
        },
      })),
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/messages/pending
 * Get undelivered messages for current user
 */
router.get('/pending', async (req, res) => {
  try {
    const messages = await Message.find({
      toUserId: req.userId,
      delivered: false,
    })
      .sort({ createdAt: 1 })  // Oldest first
      .limit(100)
      .populate('fromUserId', 'name badgeNo rank policeStation');

    res.json({
      success: true,
      messages: messages.map(m => ({
        id: m._id,
        fromUserId: m.fromUserId._id,
        encryptedContent: m.encryptedContent,
        contentType: m.contentType,
        messageType: m.messageType,
        timestamp: m.createdAt,
        sender: {
          name: m.fromUserId.name,
          badgeNo: m.fromUserId.badgeNo,
          rank: m.fromUserId.rank,
          policeStation: m.fromUserId.policeStation,
        },
      })),
    });
  } catch (error) {
    console.error('Get pending messages error:', error);
    res.status(500).json({ error: 'Failed to fetch pending messages' });
  }
});

/**
 * GET /api/messages/recent-chats
 * Get list of recent conversations for chat list screen
 */
router.get('/recent-chats', async (req, res) => {
  try {
    // Aggregate to get last message for each conversation
    const recentChats = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: req.userId },
            { toUserId: req.userId },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$fromUserId', req.userId] },
              '$toUserId',
              '$fromUserId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$toUserId', req.userId] },
                    { $eq: ['$readAt', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      {
        $limit: 50,
      },
    ]);

    // Populate user details
    const populatedChats = await User.populate(recentChats, {
      path: '_id',
      select: 'name badgeNo rank department policeStation posting phoneNumber',
    });

    res.json({
      success: true,
      chats: populatedChats.map(chat => ({
        userId: chat._id._id,
        user: {
          id: chat._id._id,
          name: chat._id.name,
          badgeNo: chat._id.badgeNo,
          rank: chat._id.rank,
          department: chat._id.department,
          policeStation: chat._id.policeStation,
          posting: chat._id.posting,
        },
        lastMessage: {
          id: chat.lastMessage._id,
          encryptedContent: chat.lastMessage.encryptedContent,
          timestamp: chat.lastMessage.createdAt,
          fromMe: chat.lastMessage.fromUserId.toString() === req.userId.toString(),
        },
        unreadCount: chat.unreadCount,
      })),
    });
  } catch (error) {
    console.error('Get recent chats error:', error);
    res.status(500).json({ error: 'Failed to fetch recent chats' });
  }
});

module.exports = router;
