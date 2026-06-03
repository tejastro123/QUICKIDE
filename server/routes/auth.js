require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { validate, rules } = require('../middleware/validate');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Helper to generate a new short-lived access token and long-lived refresh token
 * @param {string} userId 
 * @returns {Object} { token, refreshToken }
 */
const generateTokens = async (userId) => {
  const payload = {
    user: {
      id: userId,
    },
  };

  // Access token: short-lived (15 minutes)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

  // Refresh token: high-entropy random string
  const refreshToken = crypto.randomBytes(32).toString('hex');

  // Expiration in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Save new refresh token record
  const tokenRecord = new RefreshToken({
    user: userId,
    token: refreshToken,
    expiresAt,
  });
  await tokenRecord.save();

  return { token, refreshToken };
};

// --- POST /api/auth/register ---
router.post('/register', validate(rules.authCredentials), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    user = new User({ email, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// --- POST /api/auth/login ---
router.post('/login', validate(rules.authCredentials), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate rotated token set
    const tokens = await generateTokens(user.id);
    res.json(tokens);

  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- POST /api/auth/refresh ---
// Exchange a valid refresh token for a new access & refresh token pair (Rotation)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Find token record in DB
    const tokenRecord = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Double check expiration dates manually
    if (tokenRecord.expiresAt < new Date()) {
      await tokenRecord.deleteOne();
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    const userId = tokenRecord.user;

    // Rotate: revoke/delete the used token
    await tokenRecord.deleteOne();

    // Generate new access and refresh token pair
    const tokens = await generateTokens(userId);
    res.json(tokens);

  } catch (err) {
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

// --- POST /api/auth/logout ---
// Revoke a refresh token on logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during logout' });
  }
});

module.exports = router;