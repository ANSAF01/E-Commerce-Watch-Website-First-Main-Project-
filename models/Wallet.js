const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        amount: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            trim: true,
        },
        reason: {
            type: String,
            enum: ['cancel_refund', 'return_refund', 'wallet_payment', 'manual_adjustment', 'referral_reward', 'deposit'],
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'COMPLETED'],
            default: 'COMPLETED',
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
    },
    { _id: false }
);

const walletSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            unique: true,
            required: true,
        },
        balance: {
            type: Number,
            default: 0
        },
        transactions: [walletTransactionSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
