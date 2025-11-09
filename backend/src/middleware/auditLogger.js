/**
 * Audit Logger Middleware
 * Logs all sensitive operations for security audit
 */

const AuditLog = require('../models/AuditLog');

/**
 * Log audit events
 */
async function logAudit(userId, action, details = {}, ipAddress = null) {
  try {
    await AuditLog.create({
      userId,
      action,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Middleware to log authentication events
 */
function auditAuth(action) {
  return async (req, res, next) => {
    // Store original send to log after response
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log only successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        logAudit(req.userId || req.body.userId, action, {
          endpoint: req.originalUrl,
          method: req.method,
        }, ipAddress);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = { logAudit, auditAuth };
