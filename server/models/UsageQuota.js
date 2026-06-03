const mongoose = require('mongoose');

const UsageQuotaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  simCount: {
    type: Number,
    default: 0
  },
  compileCount: {
    type: Number,
    default: 0
  }
});

// Enforce unique entry per user per day and optimize lookup
UsageQuotaSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UsageQuota', UsageQuotaSchema);
