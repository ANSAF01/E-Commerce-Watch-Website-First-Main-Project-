const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
    },
    { _id: false }
);

const wishlistSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            unique: true,
            sparse: true
        },
        items: [wishlistItemSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
