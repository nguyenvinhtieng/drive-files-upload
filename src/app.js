const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadRouter = require('./routes/upload');
const filesRouter = require('./routes/files');
const foldersRouter = require('./routes/folders');
const authRouter = require('./routes/auth');
const { isAuthenticated, requireAuth } = require('./middleware/auth');

const app = express();
const publicDir = path.join(__dirname, '../public');

app.use(express.json());

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(publicDir, 'login.html'));
});

app.use('/api/auth', authRouter);
app.use(requireAuth);

app.use(express.static(publicDir));
app.use('/api/upload', uploadRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File exceeds 50MB limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = app;
