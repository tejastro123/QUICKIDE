const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobId: {
        type: String,
        required: true
    },
    backend: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'SUBMITTED' // SUBMITTED, QUEUED, RUNNING, COMPLETED, ERROR
    },
    projectName: {
        type: String,
        default: 'Untitled Submission'
    },
    results: {
        type: Object, // Stores counts once completed
        default: null
    }
}, { timestamps: true });

// Performance optimization indexes
JobSchema.index({ user: 1, createdAt: -1 });
JobSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Job', JobSchema);
