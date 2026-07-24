const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadRouter = require('./routes/upload');
const filesRouter = require('./routes/files');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/upload', uploadRouter);
app.use('/api/files', filesRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File vượt quá giới hạn 50MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = app;
