const { validationResult } = require('express-validator');
const Category = require('../../models/Category');
const { calculatePagination } = require('../../utils/pagination');

const CATEGORIES_PER_PAGE = 5;

const getCategories = async (req, res, next) => {
    try {
        const page = req.query.page;
        const search = req.query.search;
        const { pageNum, skip } = calculatePagination(page, CATEGORIES_PER_PAGE);
        const searchQuery = search || '';

        const filter = { isDeleted: false };
        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
            ];
        }

        const total = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(CATEGORIES_PER_PAGE)
            .lean();

        res.render('admin/category-management', {
            title: 'Category Management',
            categories,
            pagination: { currentPage: pageNum, totalItems: total, limit: CATEGORIES_PER_PAGE },
            search: searchQuery,
        });
    } catch (err) {
        next(err);
    }
};

const getAddCategory = (req, res) => {
    res.render('admin/add-category', { title: 'Add Category', errors: {}, old: {} });
};

const postAddCategory = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('admin/add-category', { title: 'Add Category', errors: errors.mapped(), old: req.body });
    }

    try {
        const { name, description } = req.body;
        await Category.create({ name, description });
        res.redirect('/admin/categories');
    } catch (err) {
        next(err);
    }
};

const getEditCategory = async (req, res, next) => {
    try {
        const { id: categoryId } = req.params;
        const category = await Category.findById(categoryId).lean();

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        res.render('admin/edit-category', { title: 'Edit Category', category, errors: {} });
    } catch (err) {
        next(err);
    }
};

const postEditCategory = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        try {
            const { id: categoryId } = req.params;
            const category = await Category.findById(categoryId).lean();
            return res.render('admin/edit-category', { title: 'Edit Category', category, errors: errors.mapped() });
        } catch (err) {
            return next(err);
        }
    }

    try {
        const { id: categoryId } = req.params;
        const { name, description } = req.body;
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        await Category.findByIdAndUpdate(categoryId, { name, description });
        res.redirect('/admin/categories');
    } catch (err) {
        next(err);
    }
};

const patchToggleList = async (req, res, next) => {
    try {
        const { id: categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (!category) {
            const error = new Error('Category not found');
            error.statusCode = 404;
            throw error;
        }

        category.isActive = !category.isActive;
        await category.save();

        const message = category.isActive ? 'Category listed' : 'Category unlisted';
        res.json({ success: true, message, isActive: category.isActive });
    } catch (err) {
        next(err);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const { id: categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { isDeleted: true, deletedAt: new Date() });
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCategories,
    getAddCategory,
    postAddCategory,
    getEditCategory,
    postEditCategory,
    patchToggleList,
    deleteCategory,
};
