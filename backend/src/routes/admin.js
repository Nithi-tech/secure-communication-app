const express = require('express');
const router = express.Router();
const {requireAdmin} = require('../middleware/auth');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');

router.use(requireAdmin);

router.get('/devices', async (req, res) => {
  const devices = await Device.find({approved: false}).populate('userId', 'name rank badgeNo');
  res.json({devices});
});

router.post('/devices/:id/approve', async (req, res) => {
  const device = await Device.findById(req.params.id);
  device.approved = true;
  device.approvedBy = req.user.userId;
  device.approvedAt = new Date();
  await device.save();
  
  await new AuditLog({
    actorUserId: req.user.userId,
    action: 'device_approved',
    targetDeviceId: device.deviceId,
    details: {deviceModel: device.model},
  }).save();
  
  res.json({success: true});
});

router.get('/audit', async (req, res) => {
  const logs = await AuditLog.find().sort({timestamp: -1}).limit(100).populate('actorUserId', 'name rank');
  res.json({logs});
});

module.exports = router;
