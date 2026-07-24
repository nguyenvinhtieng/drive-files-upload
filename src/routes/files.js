const express = require('express');
const cloudinaryService = require('../services/cloudinaryService');
const config = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const files = await cloudinaryService.listFiles();
    res.json({ folder: config.cloudinaryFolderName, files });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message || 'Không thể lấy danh sách file' });
  }
});

router.get('/download', async (req, res) => {
  try {
    const publicId = req.query.id;
    if (!publicId) {
      return res.status(400).json({ error: 'Thiếu id file' });
    }

    const file = await cloudinaryService.getFile(publicId);
    const downloadUrl = cloudinaryService.getDownloadUrl(publicId, file.name);
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Tải file thất bại' });
  }
});

module.exports = router;
