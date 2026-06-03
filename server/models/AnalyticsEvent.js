const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // Automatically delete document after 90 days (90 * 24 * 60 * 60 = 7,776,000 seconds)
  }
});

// Compound index for event querying by time
AnalyticsEventSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
