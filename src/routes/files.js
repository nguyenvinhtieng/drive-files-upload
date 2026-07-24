const express = require('express');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const path = req.query.path || '';
    const result = await cloudinaryService.listFolderContents(path);
    res.json(result);
  } catch (error) {
    console.error('List files error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to list files' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const publicId = req.query.id;
    if (!publicId) {
      return res.status(400).json({ error: 'File id is required' });
    }

    await cloudinaryService.deleteFile(publicId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to delete file' });
  }
});

router.post('/delete-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'File ids to delete are required' });
    }

    const result = await cloudinaryService.deleteFiles(ids);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Bulk delete error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to delete file' });
  }
});

router.get('/download', async (req, res) => {
  try {
    const publicId = req.query.id;
    if (!publicId) {
      return res.status(400).json({ error: 'File id is required' });
    }

    const file = await cloudinaryService.getFile(publicId);
    const downloadUrl = cloudinaryService.getDownloadUrl(publicId, file.name);
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to download file' });
  }
});

module.exports = router;
