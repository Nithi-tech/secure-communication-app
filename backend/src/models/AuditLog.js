/**
 * Audit Log Model
 * Tamper-evident logging for admin actions
 * SECURITY: Signed entries, immutable
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'device_approved',
      'device_revoked',
      'user_suspended',
      'user_activated',
      'policy_updated',
      'keys_rotated',
      'audit_log_viewed',
      'group_created',
      'group_member_added',
      'group_member_removed',
    ],
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  targetDeviceId: String,
  targetGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Digital signature for tamper-evidence
  signature: String,
});

auditLogSchema.index({timestamp: -1});
auditLogSchema.index({action: 1, timestamp: -1});

module.exports = mongoose.model('AuditLog', auditLogSchema);
