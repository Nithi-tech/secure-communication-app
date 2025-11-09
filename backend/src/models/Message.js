/**
 * Message Model
 * SECURITY: Stores only encrypted ciphertext, no plaintext
 * Server cannot decrypt messages
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true,
  },
  // Encrypted content - server cannot decrypt
  encryptedContent: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    enum: ['prekey', 'message'],
    default: 'message',
  },
  contentType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio'],
    default: 'text',
  },
  registrationId: Number,
  // Metadata only
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  deliveredAt: Date,
  readAt: Date,
  // For offline message delivery
  delivered: {
    type: Boolean,
    default: false,
  },
});

messageSchema.index({toUserId: 1, delivered: 1});
messageSchema.index({groupId: 1, createdAt: -1});
messageSchema.index({createdAt: -1});

module.exports = mongoose.model('Message', messageSchema);
