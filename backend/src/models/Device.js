/**
 * Device Model
 * Tracks registered devices for each user
 * SECURITY: Public keys only, device attestation
 */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  model: String,
  os: String,
  osVersion: String,
  appVersion: String,
  pushToken: String,
  // Public keys only - never store private keys
  publicIdentityKey: {
    type: String,
    required: true,
  },
  publicSignedPreKey: {
    type: String,
    required: true,
  },
  signedPreKeyId: Number,
  signedPreKeySignature: String,
  signedPreKeyTimestamp: Date,
  approved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  revoked: {
    type: Boolean,
    default: false,
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  revokedAt: Date,
  revokeReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: Date,
});

deviceSchema.index({userId: 1, approved: 1});
deviceSchema.index({createdAt: -1});

module.exports = mongoose.model('Device', deviceSchema);
