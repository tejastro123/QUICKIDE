require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validate, rules } = require('../middleware/validate');

const router = express.Router();

// Secret key loaded from .env — never hardcode this
const JWT_SECRET = process.env.JWT_SECRET;

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
    res.status(500).json({ error: 'Server error' });
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

    // Create JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;