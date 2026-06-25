// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase.js').default;

const JWT_SECRET = (process.env.JWT_SECRET || 'super_secret_jwt_key_campusflow').trim().replace(/"/g, '');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1️⃣ Verify custom JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.userId) {
      req.user = { id: decoded.userId, email: decoded.email };
      return next();
    }
  } catch (err) {
    // 2️⃣ Fallback to Supabase Auth getUser
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = { id: user.id, email: user.email };
        return next();
      }
    } catch (subErr) {
      // ignore
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
}

module.exports = {
  requireAuth
};
