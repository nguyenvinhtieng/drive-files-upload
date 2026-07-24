const express = require('express');
const {
  clearSessionCookie,
  isAuthenticated,
  setSessionCookie,
  verifyPassword,
} = require('../middleware/auth');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

router.post('/login', (req, res) => {
  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  setSessionCookie(res);
  return res.json({ success: true });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true });
});

module.exports = router;
