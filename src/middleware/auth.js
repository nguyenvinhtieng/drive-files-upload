const crypto = require('crypto');
const config = require('../config');

const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const COOKIE_NAME = 'auth_session';

function signPayload(payload) {
  return crypto.createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

function createSessionToken() {
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function parseSessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expectedSignature = signPayload(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isAuthenticated(req) {
  return parseSessionToken(getSessionToken(req)) !== null;
}

function setSessionCookie(res) {
  const token = createSessionToken();
  const maxAgeSec = Math.floor(SESSION_MAX_AGE_MS / 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure}`,
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  );
}

function verifyPassword(password) {
  const expected = config.appPassword;
  if (!password || !expected) return false;

  const inputBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.redirect('/login');
}

module.exports = {
  COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  clearSessionCookie,
  createSessionToken,
  isAuthenticated,
  requireAuth,
  setSessionCookie,
  verifyPassword,
};
