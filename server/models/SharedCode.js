const mongoose = require('mongoose');

const SharedCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-expire shared pastes after 30 days (prevent database storage growth)
SharedCodeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('SharedCode', SharedCodeSchema);
