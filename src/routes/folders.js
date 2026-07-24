const express = require('express');
const cloudinaryService = require('../services/cloudinaryService');

const router = express.Router();

router.delete('/', async (req, res) => {
  try {
    const folderPath = req.query.path;
    if (!folderPath || !String(folderPath).trim()) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const result = await cloudinaryService.deleteFolder(folderPath);
    res.json(result);
  } catch (error) {
    console.error('Delete folder error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to delete folder' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { path = '', name } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Please enter a folder name' });
    }

    const folder = await cloudinaryService.createFolder(path, name);
    res.status(201).json({ success: true, folder });
  } catch (error) {
    console.error('Create folder error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to create folder' });
  }
});

module.exports = router;
