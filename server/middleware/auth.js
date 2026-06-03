require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET; // Loaded from .env — must match routes/auth.js

const auth = function (req, res, next) {
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

/**
 * Middleware to restrict access to specific roles (e.g. requireRole('admin'))
 * @param {string|string[]} allowedRoles 
 */
auth.requireRole = function (allowedRoles) {
  if (typeof allowedRoles === 'string') {
    allowedRoles = [allowedRoles];
  }

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'No user token found, authorization denied' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
      }

      // Attach complete user model to the request object
      req.userModel = user;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Server error during role verification' });
    }
  };
};

module.exports = auth;