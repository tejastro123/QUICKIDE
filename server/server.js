const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Allow requests from React frontend
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// --- Database Connection ---
// Make sure you have MongoDB running locally or use a cloud URI
const MONGO_URI = 'mongodb://localhost:27017/quickide'; 
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:${PORT}`);
});