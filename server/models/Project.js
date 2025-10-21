const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    default: '// Your QuCPL code here',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // You would add a user reference here
  // user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Project', ProjectSchema);