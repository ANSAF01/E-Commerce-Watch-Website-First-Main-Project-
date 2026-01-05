const { validationResult } = require('express-validator');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { uploadProductImages } = require('../../middleware/upload');
const { calculatePagination } = require('../../utils/pagination');

const PRODUCTS_PER_PAGE = 5;

const getProducts = async (req, res, next) => {
    try {
        const page = req.query.page;
        const search = req.query.search;
        const { pageNum, skip } = calculatePagination(page, PRODUCTS_PER_PAGE);
        const searchQuery = search || '';

        const filter = { isDeleted: false };
        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
            ];
        }

        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(PRODUCTS_PER_PAGE)
            .lean();

        const enrichedProducts = products.map(product => ({
            ...product,
            displayPrice: Math.round(product.price),
        }));

        res.render('admin/product-management', {
            title: 'Product Management',
            products: enrichedProducts,
            pagination: { currentPage: pageNum, totalItems: total, limit: PRODUCTS_PER_PAGE },
            search: searchQuery,
        });
    } catch (err) {
        next(err);
    }
};

const getAddProduct = async (req, res, next) => {
    try {
        const categories = await Category.find({ isDeleted: false, isActive: true }).lean();
        res.render('admin/add-product', { title: 'Add Product', categories, errors: {}, old: {} });
    } catch (err) {
        next(err);
    }
};

const postAddProduct = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.mapped() });
    }

    try {
        const { name, description, category, price, stock } = req.body;
        const imageUrls = await uploadProductImages(req.files);
        await Product.create({ name, description, category, price, stock, images: imageUrls });
        res.status(200).json({ success: true, redirect: '/admin/products' });
    } catch (err) {
        next(err);
    }
};

const getEditProduct = async (req, res, next) => {
    try {
        const { id: productId } = req.params;
        const product = await Product.findById(productId).lean();

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const categories = await Category.find({ isDeleted: false, isActive: true }).lean();
        res.render('admin/edit-product', { title: 'Edit Product', product, categories, errors: {} });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.redirect('/admin/products');
        }
        next(err);
    }
};

const postEditProduct = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.mapped() });
    }

    try {
        const { id: productId } = req.params;
        const { name, description, category, price, stock, replacedIndices } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const update = { name, description, category, price, stock };
        let finalImages = [...product.images];
        const replacedIndicesArr = replacedIndices ? JSON.parse(replacedIndices) : [];
        const newFiles = req.files || [];
        const newFilesMap = new Map();

        let fileCounter = 0;
        replacedIndicesArr.forEach(index => {
            if (fileCounter < newFiles.length) {
                newFilesMap.set(index, newFiles[fileCounter]);
                fileCounter += 1;
            }
        });

        replacedIndicesArr.forEach(index => {
            if (!newFilesMap.has(index)) {
                finalImages[index] = null;
            }
        });

        if (newFiles.length > 0) {
            const uploadedUrls = await uploadProductImages(newFiles);
            let urlCounter = 0;
            replacedIndicesArr.forEach(index => {
                if (newFilesMap.has(index)) {
                    finalImages[index] = uploadedUrls[urlCounter];
                    urlCounter += 1;
                }
            });
        }

        const finalImageCount = finalImages.filter(img => img !== null).length;
        if (finalImageCount < 3) {
            const error = new Error('A product must have exactly 3 images.');
            error.statusCode = 400;
            throw error;
        }

        update.images = finalImages;
        await Product.findByIdAndUpdate(productId, update);
        res.status(200).json({ success: true, redirect: '/admin/products' });
    } catch (err) {
        if (err.statusCode === 400) {
            const field = err.message.toLowerCase().includes('image') ? 'images' : 'name';
            return res.status(400).json({ success: false, errors: { [field]: { msg: err.message } } });
        }
        next(err);
    }
};

const patchToggleList = async (req, res, next) => {
    try {
        const { id: productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        product.isActive = !product.isActive;
        await product.save();

        const message = product.isActive ? 'Product listed' : 'Product unlisted';
        res.json({ success: true, message, isActive: product.isActive });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        const { id: productId } = req.params;
        const product = await Product.findByIdAndUpdate(productId, { isDeleted: true, deletedAt: new Date() });

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

module.exports = {
    getProducts,
    getAddProduct,
    postAddProduct,
    getEditProduct,
    postEditProduct,
    patchToggleList,
    deleteProduct,
};
