const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-key-123'; // Must be the same as in auth.js

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('Authorization');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Token format is "Bearer <token>". We just want the <token> part.
  const tokenOnly = token.split(' ')[1];
  if (!tokenOnly) {
    return res.status(401).json({ error: 'Token format is invalid' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(tokenOnly, JWT_SECRET);
    req.user = decoded.user; // Add user payload to request
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};