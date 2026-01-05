const { validationResult } = require('express-validator');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

const validateOfferPercent = (percent) => {
    const offerPercent = parseInt(percent) || 0;
    if (offerPercent < 0 || offerPercent > 100) {
        const error = new Error('Offer percent must be between 0 and 100');
        error.statusCode = 400;
        throw error;
    }
    return offerPercent;
};

const validateOfferDates = (startAt, endAt) => {
    let startDate;
    let endDate;

    if (startAt) {
        startDate = new Date(startAt);
        if (isNaN(startDate.getTime())) {
            const error = new Error('Invalid start date');
            error.statusCode = 400;
            throw error;
        }
    }

    if (endAt) {
        endDate = new Date(endAt);
        if (isNaN(endDate.getTime())) {
            const error = new Error('Invalid end date');
            error.statusCode = 400;
            throw error;
        }
    }

    if (startDate && endDate && startDate >= endDate) {
        const error = new Error('Start date must be before end date');
        error.statusCode = 400;
        throw error;
    }

    return { startDate, endDate };
};

const getOffers = async (req, res, next) => {
    try {
        const products = await Product.find({ isDeleted: false }).populate('category').lean();
        const categories = await Category.find({ isDeleted: false }).lean();
        res.render('admin/offers', { title: 'Manage Offers', products, categories });
    } catch (err) {
        next(err);
    }
};



const postProductOffer = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, errors: errors.mapped() });
    }

    try {
        const { productId, percent, startAt, endAt } = req.body;
        const offerPercent = parseInt(percent);
        const { startDate, endDate } = validateOfferDates(startAt, endAt);
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        product.offer = { percent: offerPercent, active: true, startAt: startDate, endAt: endDate };
        await product.save();

        res.json({ success: true, message: 'Product offer applied successfully' });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const postCategoryOffer = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, errors: errors.mapped() });
    }

    try {
        const { categoryId, percent, startAt, endAt } = req.body;
        const offerPercent = parseInt(percent);
        const { startDate, endDate } = validateOfferDates(startAt, endAt);
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        category.offer = { percent: offerPercent, active: true, startAt: startDate, endAt: endDate };
        await category.save();

        res.json({ success: true, message: 'Category offer applied successfully' });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const toggleProductOffer = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        if (product.offer) {
            product.offer.active = !product.offer.active;
        }

        await product.save();

        const status = product.offer?.active ? 'activated' : 'deactivated';
        res.json({ success: true, message: `Product offer ${status} successfully` });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const toggleCategoryOffer = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        if (category.offer) {
            category.offer.active = !category.offer.active;
        }

        await category.save();

        const status = category.offer?.active ? 'activated' : 'deactivated';
        res.json({ success: true, message: `Category offer ${status} successfully` });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const deleteProductOffer = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        product.offer = { percent: 0, active: false, startAt: undefined, endAt: undefined };
        await product.save();

        res.json({ success: true, message: 'Product offer deleted successfully' });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const deleteCategoryOffer = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        category.offer = { percent: 0, active: false, startAt: undefined, endAt: undefined };
        await category.save();

        res.json({ success: true, message: 'Category offer deleted successfully' });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const patchEditProductOffer = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { percent, startAt, endAt } = req.body;

        if (percent === undefined || percent === '') {
            const error = new Error('Offer percent is required');
            error.statusCode = 400;
            throw error;
        }

        const offerPercent = validateOfferPercent(percent);
        const { startDate, endDate } = validateOfferDates(startAt, endAt);
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        if (product.offer) {
            product.offer.percent = offerPercent;
            product.offer.startAt = startDate;
            product.offer.endAt = endDate;
        }

        await product.save();
        res.json({ success: true, message: 'Product offer updated successfully' });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: false, message: 'Error updating product offer' });
    }
};

const patchEditCategoryOffer = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const { percent, startAt, endAt } = req.body;

        if (percent === undefined || percent === '') {
            const error = new Error('Offer percent is required');
            error.statusCode = 400;
            throw error;
        }

        const offerPercent = validateOfferPercent(percent);
        const { startDate, endDate } = validateOfferDates(startAt, endAt);
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        if (category.offer) {
            category.offer.percent = offerPercent;
            category.offer.startAt = startDate;
            category.offer.endAt = endDate;
        }

        await category.save();
        res.json({ success: true, message: 'Category offer updated successfully' });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: false, message: 'Error updating category offer' });
    }
};

module.exports = {
    getOffers,
    postProductOffer,
    postCategoryOffer,
    toggleProductOffer,
    toggleCategoryOffer,
    deleteProductOffer,
    deleteCategoryOffer,
    patchEditProductOffer,
    patchEditCategoryOffer,
};
