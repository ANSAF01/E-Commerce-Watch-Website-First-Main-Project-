const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { enrichProductWithOffer } = require('../../helpers/offerHelper');
const { calculatePagination } = require('../../utils/pagination');

const PRODUCTS_PER_PAGE = 2;

const getHome = async (req, res, next) => {
    try {
        const activeCategories = await Category.find({ isActive: true, isDeleted: false }).select('_id').lean();
        const activeCategoryIds = activeCategories.map(cat => cat._id);
        const newArrivals = await Product.find({
            isActive: true,
            isDeleted: false,
            category: { $in: activeCategoryIds },
        })
            .sort({ createdAt: -1 })
            .limit(4)
            .lean();

        const trendingProducts = await Product.aggregate([
            { $match: { isActive: true, isDeleted: false, category: { $in: activeCategoryIds } } },
            { $sample: { size: 4 } }
        ]);

        const enrichedNewArrivals = await Promise.all(newArrivals.map(p => enrichProductWithOffer(p)));
        const enrichedTrending = await Promise.all(trendingProducts.map(p => enrichProductWithOffer(p)));

        res.render('index', {
            title: 'Home',
            newArrivals: enrichedNewArrivals,
            trendingProducts: enrichedTrending
        });
    } catch (err) {
        next(err);
    }
};

const getShop = async (req, res, next) => {
    try {
        const page = req.query.page;
        const search = req.query.search;
        const category = req.query.category;
        const sort = req.query.sort;
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;

        const activeCategories = await Category.find({ isActive: true, isDeleted: false }).select('_id').lean();
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        let query = {
            isActive: true,
            isDeleted: false,
            category: { $in: activeCategoryIds }
        };

        if (category && category !== 'all') {
            const isValidCategory = activeCategoryIds.some(id => id.toString() === category);
            query.category = isValidCategory ? category : null;
        }

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const allProducts = await Product.find(query).lean();

        const enrichedProducts = await Promise.all(allProducts.map(async (product) => {
            const enriched = await enrichProductWithOffer(product);
            enriched.finalPrice = enriched.offerPrice || enriched.price;
            return enriched;
        }));

        let filteredProducts = enrichedProducts;
        if (minPrice || maxPrice) {
            filteredProducts = enrichedProducts.filter(p => {
                const min = minPrice ? Number(minPrice) : 0;
                const max = maxPrice ? Number(maxPrice) : Infinity;
                return p.finalPrice >= min && p.finalPrice <= max;
            });
        }

        if (sort === 'price_low') {
            filteredProducts.sort((a, b) => a.finalPrice - b.finalPrice);
        } else if (sort === 'price_high') {
            filteredProducts.sort((a, b) => b.finalPrice - a.finalPrice);
        } else if (sort === 'popular') {
            filteredProducts.sort((a, b) => b.soldCount - a.soldCount);
        } else {
            filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const itemsPerPage = PRODUCTS_PER_PAGE;
        const currentPage = Number(page) || 1;
        const totalItems = filteredProducts.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const productsForPage = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

        const categories = await Category.find({ isActive: true, isDeleted: false }).lean();

        res.render('shop/shop', {
            title: 'Shop',
            products: productsForPage,
            categories,
            filters: { search, category, sort, minPrice, maxPrice },
            pagination: {
                currentPage,
                totalItems,
                limit: itemsPerPage
            }
        });

    } catch (err) {
        next(err);
    }
};

const getProductDetail = async (req, res, next) => {
    try {
        const { id: productId } = req.params;

        if (!productId) {
            return res.status(400).render('error', { message: 'Product ID is required' });
        }

        const product = await Product.findById(productId).populate('category').lean();

        if (!product || !product.isActive || product.isDeleted) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        if (!product.category || !product.category.isActive || product.category.isDeleted) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        const enrichedProduct = await enrichProductWithOffer(product);

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            isActive: true,
            isDeleted: false,
        }).limit(4).lean();

        const enrichedRelated = await Promise.all(
            relatedProducts.map(p => enrichProductWithOffer(p))
        );

        res.render('user/product-detail', {
            title: enrichedProduct.name,
            product: enrichedProduct,
            related: enrichedRelated,
        });
    } catch (err) {
        next(err);
    }
};

const getAbout = (req, res) => {
    res.render('about', { title: 'About Us' });
};

module.exports = { getHome, getShop, getProductDetail, getAbout };
