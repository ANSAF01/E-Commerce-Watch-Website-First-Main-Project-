const mongoose = require('mongoose');

const referralOfferSchema = new mongoose.Schema(
    {
        referrerBonus: {
            type: Number,
            required: true,
            default: 0
        },
        refereeBonus: {
            type: Number,
            required: true,
            default: 0
        },
        description: {
            type: String
        },
        isActive: {
            type: Boolean,
            default: true
        },
        startAt: {
            type: Date
        },
        endAt: {
            type: Date
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ReferralOffer', referralOfferSchema);
