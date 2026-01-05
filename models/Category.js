const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema(
    {
        percent: {
            type: Number,
            default: 0
        },
        active: {
            type: Boolean,
            default: false
        },
        startAt: {
            type: Date
        },
        endAt: {
            type: Date
        },
    },
    { _id: false }
);

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date
        },
        offer: categoryOfferSchema,
    },
    { timestamps: true }
);

categorySchema.index({ isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('Category', categorySchema);
