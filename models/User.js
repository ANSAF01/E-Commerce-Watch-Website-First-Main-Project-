const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String
        },
        mobile: {
            type: String
        },
        profileImage: {
            type: String
        },
        googleId: {
            type: String
        },
        otps: [{
            code: {
                type: String,
                required: true
            },
            purpose: {
                type: String,
                required: true,
                enum: ['signup', 'password-change', 'email-change', 'forgot-password']
            },
            expiresAt: {
                type: Date,
                required: true
            },
            resendAllowedAt: {
                type: Date,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            metadata: {
                type: Object,
                default: {}
            }
        }],
        referralCode: {
            type: String,
            unique: true,
            sparse: true
        },
        referredBy: {
            type: String
        },
        referralHandled: {
            type: Boolean,
            default: false
        },
        walletBalance: {
            type: Number,
            default: 0
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        lastLogin: {
            type: Date
        },
    },
    { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ isBlocked: 1 });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('User', userSchema);
