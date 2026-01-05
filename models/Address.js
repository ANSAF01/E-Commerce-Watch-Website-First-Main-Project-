const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        recipientName: {
            type: String
        },
        phone: {
            type: String
        },
        address: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        landmark: {
            type: String
        },
        type: {
            type: String,
            default: 'home'
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
