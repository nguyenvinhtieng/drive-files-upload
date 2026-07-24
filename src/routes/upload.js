const express = require('express');
const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/', upload.array('file', 50), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const folderPath = req.body?.path || req.query?.path || '';
    const { files, failed } = await cloudinaryService.uploadFiles(req.files, folderPath);

    const payload = {
      success: true,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        secureUrl: file.secureUrl,
        folderPath: file.folderPath,
      })),
      ...(failed.length ? { failed } : {}),
    };

    if (failed.length) {
      return res.status(files.length ? 200 : 500).json(payload);
    }

    res.status(201).json(payload);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Upload failed' });
  }
});

module.exports = router;
