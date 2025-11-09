const express = require('express');
const router = express.Router();

router.post('/init', async (req, res) => {
  const {messageId, fileName, mimeType, size, checksum} = req.body;
  const attachmentId = `att_${Date.now()}`;
  const uploadUrl = `https://s3.amazonaws.com/upload/${attachmentId}`;
  res.json({attachmentId, uploadUrl});
});

router.get('/:id', async (req, res) => {
  const downloadUrl = `https://s3.amazonaws.com/download/${req.params.id}`;
  res.json({downloadUrl, fileName: 'file.dat'});
});

module.exports = router;
