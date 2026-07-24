const express = require('express');
const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }

    const file = await cloudinaryService.uploadFile(req.file.buffer, req.file.originalname);

    res.status(201).json({
      success: true,
      file: { id: file.id, name: file.name, secureUrl: file.secureUrl },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload thất bại' });
  }
});

module.exports = router;
