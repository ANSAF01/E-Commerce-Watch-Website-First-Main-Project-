const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedAt: {
            type: Date
        },
    },
    { _id: false }
);

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true
        },
        description: {
            type: String
        },
        type: {
            type: String,
            enum: ['PERCENT', 'FLAT'],
            required: true
        },
        discountValue: {
            type: Number,
            required: true
        },
        maxDiscount: {
            type: Number,
            default: 0
        },
        minPurchase: {
            type: Number,
            default: 0
        },
        usageLimit: {
            type: Number,
            default: 1
        },
        usedBy: [couponUsageSchema],
        isActive: {
            type: Boolean,
            default: true
        },
        expiresAt: {
            type: Date
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
