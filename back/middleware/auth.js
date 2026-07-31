const jwt = require('jsonwebtoken');
require('dotenv').config();

function getSecret() {
  return process.env.JWT_SECRET || 'dev_secret_change_me';
}

function verifyToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret());
  } catch (err) {
    return null;
  }
}

function issueToken(user) {
  return jwt.sign(
    {
      username: user.username,
      email: user.email,
      iseditor: user.iseditor,
    },
    getSecret(),
    { expiresIn: '7d' }
  );
}

function isEditor(payload) {
  if (!payload) return false;
  const v = payload.iseditor;
  return v === true || v === 1 || v === 'true' || v === '1';
}

function authenticate(req, res, next) {
  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = payload;
  return next();
}

function requireEditor(req, res, next) {
  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!isEditor(payload)) {
    return res.status(403).json({ error: 'Editor (admin) privileges required' });
  }
  req.user = payload;
  return next();
}

module.exports = { authenticate, requireEditor, issueToken, verifyToken, isEditor };
