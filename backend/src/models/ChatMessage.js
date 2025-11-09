/**
 * ChatMessage Model
 * Stores encrypted messages with delivery/seen tracking
 * 
 * SECURITY: Messages stored encrypted (ciphertext + iv + authTag)
 * Server decrypts only for authorized recipient
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Encrypted message content
  ciphertext: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  authTag: {
    type: String,
    required: true
  },
  // Message metadata
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio'],
    default: 'text'
  },
  // Delivery tracking
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  // Read tracking
  seen: {
    type: Boolean,
    default: false
  },
  seenAt: {
    type: Date,
    default: null
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
chatMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
chatMessageSchema.index({ receiver: 1, delivered: 1 }); // For undelivered messages
chatMessageSchema.index({ receiver: 1, seen: 1 }); // For unread messages

// Virtual for conversation ID (normalized sender/receiver pair)
chatMessageSchema.virtual('conversationId').get(function() {
  const ids = [this.sender.toString(), this.receiver.toString()].sort();
  return ids.join('_');
});

// Method to mark as delivered
chatMessageSchema.methods.markDelivered = function() {
  this.delivered = true;
  this.deliveredAt = new Date();
  return this.save();
};

// Method to mark as seen
chatMessageSchema.methods.markSeen = function() {
  this.seen = true;
  this.seenAt = new Date();
  return this.save();
};

// Static method to get undelivered messages for a user
chatMessageSchema.statics.getUndelivered = function(userId) {
  return this.find({
    receiver: userId,
    delivered: false
  }).populate('sender', 'name rank userId').sort({ createdAt: 1 });
};

// Static method to get conversation history
chatMessageSchema.statics.getConversation = function(user1Id, user2Id, limit = 50, skip = 0) {
  return this.find({
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id }
    ]
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('sender', 'name rank userId')
  .populate('receiver', 'name rank userId');
};

// Static method to get recent conversations
chatMessageSchema.statics.getRecentConversations = async function(userId) {
  // Aggregate to get last message per conversation
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [{ sender: mongoose.Types.ObjectId(userId) }, { receiver: mongoose.Types.ObjectId(userId) }]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
            '$receiver',
            '$sender'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$receiver', mongoose.Types.ObjectId(userId)] },
                { $eq: ['$seen', false] }
              ]},
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);

  // Populate user details
  await this.populate(conversations, {
    path: '_id lastMessage.sender lastMessage.receiver',
    select: 'name rank userId department'
  });

  return conversations;
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
