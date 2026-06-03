const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Project name must be 200 characters or fewer'],
    },
    code: {
      type: String,
      default: '// Your QuCPL code here',
      maxlength: [512000, 'Circuit code must be 500 KB or smaller'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Performance optimisation indexes
ProjectSchema.index({ user: 1 });
ProjectSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);