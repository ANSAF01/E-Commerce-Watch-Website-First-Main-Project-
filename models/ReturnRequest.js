const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        processedAt: {
            type: Date
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
