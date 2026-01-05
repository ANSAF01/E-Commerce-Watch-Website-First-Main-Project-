const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: {
            type: String
        },
        image: {
            type: String
        },
        unitPrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        lineTotal: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'PENDING_RETURN'],
            default: 'PENDING'
        },
        cancelReason: {
            type: String
        },
        returnReason: {
            type: String
        },
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            unique: true,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        address: {
            type: Object,
            required: true
        },
        items: [orderItemSchema],
        subtotal: {
            type: Number,
            required: true
        },
        discountTotal: {
            type: Number,
            default: 0
        },
        shippingFee: {
            type: Number,
            default: 0
        },
        grandTotal: {
            type: Number,
            required: true
        },
        couponCode: {
            type: String
        },
        paymentMethod: {
            type: String,
            enum: ['COD', 'RAZORPAY', 'WALLET'],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
            default: 'PENDING'
        },
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
            default: 'PENDING'
        },
        razorpayOrderId: {
            type: String
        },
        razorpayPaymentId: {
            type: String
        },
        razorpaySignature: {
            type: String
        },
        deliveredAt: {
            type: Date
        },
    },
    { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
