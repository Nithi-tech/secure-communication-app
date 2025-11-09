/**
 * PreKey Model
 * Stores one-time pre-keys for X3DH key agreement
 * SECURITY: Public keys only, consumed after first use
 */

const mongoose = require('mongoose');

const preKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  keyId: {
    type: Number,
    required: true,
  },
  publicKey: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  consumed: {
    type: Boolean,
    default: false,
  },
  consumedAt: Date,
  consumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

preKeySchema.index({userId: 1, consumed: 1});
preKeySchema.index({userId: 1, keyId: 1}, {unique: true});

module.exports = mongoose.model('PreKey', preKeySchema);
