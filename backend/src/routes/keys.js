const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const PreKey = require('../models/PreKey');

router.get('/:userId', async (req, res) => {
  const device = await Device.findOne({userId: req.params.userId, approved: true});
  if (!device) return res.status(404).json({error: 'No approved device'});
  
  const preKey = await PreKey.findOne({userId: req.params.userId, consumed: false});
  if (preKey) {
    preKey.consumed = true;
    preKey.consumedBy = req.user.userId;
    preKey.consumedAt = new Date();
    await preKey.save();
  }
  
  res.json({
    identityKey: device.publicIdentityKey,
    signedPreKey: {
      publicKey: device.publicSignedPreKey,
      keyId: device.signedPreKeyId,
      signature: device.signedPreKeySignature,
    },
    preKey: preKey ? {publicKey: preKey.publicKey, keyId: preKey.keyId} : null,
    registrationId: 0,
  });
});

module.exports = router;
