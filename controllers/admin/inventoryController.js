const Product = require('../../models/Product');
const { calculatePagination } = require('../../utils/pagination');

const INVENTORY_PER_PAGE = 5;

const getSortOption = (sort) => {
    const sortOptions = {
        name: { name: 1 },
        stock: { stock: 1 },
        price: { price: 1 },
    };
    return sortOptions[sort] || sortOptions.name;
};

const getInventory = async (req, res, next) => {
    try {
        const { page, search, sort } = req.query;
        const { pageNum, skip } = calculatePagination(page, INVENTORY_PER_PAGE);
        const searchQuery = search || '';
        const sortType = sort || 'name';

        const filter = { isDeleted: false };
        if (searchQuery) {
            filter.name = { $regex: searchQuery, $options: 'i' };
        }

        const sortOption = getSortOption(sortType);
        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(INVENTORY_PER_PAGE)
            .lean();

        res.render('admin/inventory-management', {
            title: 'Inventory Management',
            products,
            pagination: { currentPage: pageNum, totalItems: total, limit: INVENTORY_PER_PAGE },
            search: searchQuery,
            sort: sortType,
        });
    } catch (err) {
        next(err);
    }
};

const patchUpdateStock = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { stock } = req.body;
        const product = await Product.findByIdAndUpdate(productId, { stock }, { new: true });

        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, message: 'Stock updated successfully', product });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

module.exports = { getInventory, patchUpdateStock };
