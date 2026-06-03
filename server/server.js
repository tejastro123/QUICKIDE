require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

// --- Security Headers ---
const securityHeaders = require('./middleware/security');
app.use(securityHeaders());

// --- Request ID (must be first — propagated to all downstream logs) ---
const requestId = require('./middleware/requestId');
app.use(requestId());

// --- Request Logger ---
const logger = require('./middleware/logger');
app.use(logger());

// --- CORS ---
app.use(cors({ origin: 'http://localhost:3000' }));

// --- Body Parsing (1MB global limit) ---
app.use(express.json({ limit: '1mb' }));

// --- Rate Limiting ---
const rateLimiter = require('./middleware/rateLimiter');
const globalLimiter = rateLimiter.global();
const authLimiter   = rateLimiter.auth();

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('[FATAL] MONGO_URI is not set in the environment.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log(JSON.stringify({ level: 'INFO', message: 'MongoDB connected successfully.' })))
  .catch(err => {
    console.error(JSON.stringify({ level: 'ERROR', message: 'MongoDB connection error', error: err.message }));
    process.exit(1);
  });

// --- API Routes ---
const { router: sseRouter } = require('./routes/sse');
const sessionRouter = require('./routes/session');
app.use('/api', globalLimiter, sseRouter);
app.use('/api', globalLimiter, sessionRouter);
app.use('/api', globalLimiter, apiRoutes);
app.use('/api/auth', authLimiter, authRoutes);

// --- Python Backend Health Check ---
const checkPythonHealth = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`${PYTHON_API_URL}/health`);
      if (res.data && res.data.status === 'ok') {
        console.log(JSON.stringify({ level: 'INFO', message: 'Python compiler API is healthy.' }));
        return;
      }
    } catch (err) {
      console.log(JSON.stringify({ level: 'WARN', message: `Python compiler API not ready yet (attempt ${i + 1}/${retries})...` }));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  console.log(JSON.stringify({ level: 'ERROR', message: 'Could not connect to Python compiler API. Please ensure it is running.' }));
};

// --- Start Server ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(JSON.stringify({ level: 'INFO', message: `Node.js server running on http://localhost:${PORT}` }));
    checkPythonHealth();
  });
}

module.exports = app;