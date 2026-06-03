const mongoose = require('mongoose');

const LiveSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    default: ''
  },
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Auto-delete session after 24 hours of inactivity (using updatedAt timestamp)
LiveSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('LiveSession', LiveSessionSchema);
