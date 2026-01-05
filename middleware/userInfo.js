const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');

const fetchUserData = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const [cart, wishlist] = await Promise.all([
                Cart.findOne({ userId: req.session.user._id }).select('items'),
                Wishlist.findOne({ userId: req.session.user._id }).select('items')
            ]);

            res.locals.cartCount = cart ? cart.items.length : 0;
            res.locals.wishlistCount = wishlist ? wishlist.items.length : 0;
        } catch (err) {
            console.error('Error fetching user data/counts:', err);
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
        }
    } else {
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
    }
    next();
};

module.exports = fetchUserData;
