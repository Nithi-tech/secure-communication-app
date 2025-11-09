/**
 * Message Receipt Routes
 * Handles delivered and read receipts
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

/**
 * POST /api/receipts
 * Mark message as delivered or read
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, type } = req.body;

    if (!messageId || !type) {
      return res.status(400).json({ error: 'messageId and type are required' });
    }

    if (!['delivered', 'read'].includes(type)) {
      return res.status(400).json({ error: 'type must be "delivered" or "read"' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only recipient can mark as delivered/read
    if (message.toUserId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update status
    const update = {};
    if (type === 'delivered') {
      update.delivered = true;
      update.deliveredAt = new Date();
    } else if (type === 'read') {
      update.readAt = new Date();
      // Also mark as delivered if not already
      if (!message.delivered) {
        update.delivered = true;
        update.deliveredAt = new Date();
      }
    }

    await Message.findByIdAndUpdate(messageId, update);

    // Send real-time receipt to sender
    const io = req.app.get('io');
    io.to(`user_${message.fromUserId}`).emit('message_receipt', {
      messageId,
      type,
      timestamp: new Date(),
    });

    console.log(`📬 Message ${messageId} marked as ${type}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Receipt error:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

/**
 * POST /api/receipts/bulk
 * Mark multiple messages as delivered (when user opens chat)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { messageIds, type } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    const update = {};
    if (type === 'delivered') {
      update.delivered = true;
      update.deliveredAt = new Date();
    } else if (type === 'read') {
      update.readAt = new Date();
      update.delivered = true;
      update.deliveredAt = new Date();
    }

    // Update all messages where current user is recipient
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        toUserId: req.userId,
      },
      update
    );

    // Send receipts to senders
    const messages = await Message.find({ _id: { $in: messageIds } });
    const io = req.app.get('io');
    
    messages.forEach(message => {
      io.to(`user_${message.fromUserId}`).emit('message_receipt', {
        messageId: message._id,
        type,
        timestamp: new Date(),
      });
    });

    console.log(`📬 Bulk update: ${result.modifiedCount} messages marked as ${type}`);

    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error('Bulk receipt error:', error);
    res.status(500).json({ error: 'Failed to update messages' });
  }
});

module.exports = router;
