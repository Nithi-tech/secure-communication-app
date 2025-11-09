const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const PreKey = require('../models/PreKey');

router.post('/', async (req, res) => {
  const {deviceInfo, publicIdentityKey, signedPreKey, preKeys} = req.body;
  const device = new Device({
    userId: req.user.userId,
    deviceId: deviceInfo.deviceId,
    model: deviceInfo.model,
    os: deviceInfo.os,
    publicIdentityKey,
    publicSignedPreKey: signedPreKey.publicKey,
    signedPreKeyId: signedPreKey.keyId,
    approved: false,
  });
  await device.save();
  
  const preKeyDocs = preKeys.map(pk => ({
    userId: req.user.userId,
    deviceId: deviceInfo.deviceId,
    keyId: pk.keyId,
    publicKey: pk.publicKey,
  }));
  await PreKey.insertMany(preKeyDocs);
  
  res.json({deviceId: device.deviceId, approved: false});
});

router.get('/me', async (req, res) => {
  const device = await Device.findOne({userId: req.user.userId}).sort({createdAt: -1});
  res.json(device || {approved: false});
});

module.exports = router;
