const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    ibmToken: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    tier: {
        type: String,
        enum: ['free', 'pro', 'admin'],
        default: 'free'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);