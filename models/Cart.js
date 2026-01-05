const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unitPrice: {
            type: Number,
            required: true
        },
        lineTotal: {
            type: Number,
            required: true
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            unique: true,
            sparse: true
        },
        items: [cartItemSchema],
        couponCode: {
            type: String
        },
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        discountTotal: {
            type: Number,
            default: 0
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
