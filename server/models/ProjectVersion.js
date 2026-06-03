const mongoose = require('mongoose');

const ProjectVersionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: 'Automatic snapshot'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Fast retrieval of project versions, sorted by creation date descending
ProjectVersionSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectVersion', ProjectVersionSchema);
