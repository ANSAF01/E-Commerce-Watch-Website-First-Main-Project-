const Product = require('../../models/Product');
const Wishlist = require('../../models/Wishlist');
const { enrichProductWithOffer } = require('../../helpers/offerHelper');

const getWishlist = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const wishlist = await Wishlist.findOne({ userId })
            .populate({ path: 'items.productId', select: 'name price stock images category offer' })
            .lean();

        if (!wishlist || !wishlist.items.length) {
            return res.render('user/wishlist', { title: 'My Wishlist', wishlist: { items: [] } });
        }

        const enrichedItems = await Promise.all(
            wishlist.items.map(async item => {
                if (!item.productId) return null;
                const enriched = await enrichProductWithOffer(item.productId);
                return { ...item, productId: enriched };
            })
        );

        const cleanItems = enrichedItems.filter(i => i !== null);

        res.render('user/wishlist', { title: 'My Wishlist', wishlist: { items: cleanItems } });
    } catch (err) {
        next(err);
    }
};

const postAddWishlist = async (req, res, next) => {
    try {
        const { productId } = req.body;
        const { _id: userId } = req.session.user;

        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.json({ success: false, message: 'Product unavailable' });
        }

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
            await wishlist.save();
        }

        const result = await Wishlist.updateOne(
            { userId, "items.productId": { $ne: productId } },
            { $push: { items: { productId, addedAt: new Date() } } }
        );

        const updatedWishlist = await Wishlist.findOne({ userId });

        if (result.modifiedCount === 0) {
            return res.json({ success: false, message: 'Already in wishlist', wishlistCount: updatedWishlist.items.length });
        }

        res.json({ success: true, message: 'Added to wishlist', wishlistCount: updatedWishlist.items.length });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error adding to wishlist' });
    }
};

const deleteWishlistItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { _id: userId } = req.session.user;

        await Wishlist.updateOne({ userId }, { $pull: { items: { productId } } });

        const updatedWishlist = await Wishlist.findOne({ userId });
        const wishlistCount = updatedWishlist ? updatedWishlist.items.length : 0;

        res.json({ success: true, message: 'Removed from wishlist', wishlistCount });
    } catch (err) {
        next(err);
    }
};

module.exports = { getWishlist, postAddWishlist, deleteWishlistItem };
