const mongoose = require('mongoose');

const productOfferSchema = new mongoose.Schema(
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

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        mrp: {
            type: Number
        },
        salePrice: {
            type: Number
        },
        stock: {
            type: Number,
            default: 0
        },
        images: {
            type: [String],
            default: []
        },
        offer: productOfferSchema,

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
        soldCount: {
            type: Number,
            default: 0
        },
    },
    { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ isActive: 1, isDeleted: 1 });
productSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('Product', productSchema);
