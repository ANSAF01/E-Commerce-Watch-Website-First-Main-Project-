const Cart = require('../../models/Cart');
const Coupon = require('../../models/Coupon');
const { getBestOffer, calculateDiscountedPrice } = require('../../helpers/offerHelper');

const calculateCartSubtotal = async (cart) => {
    let subtotal = 0;
    for (const item of cart.items) {
        if (!item.productId) continue;
        const bestOffer = await getBestOffer(item.productId);
        const currentPrice = bestOffer.percent > 0
            ? calculateDiscountedPrice(item.productId.price, bestOffer.percent)
            : item.productId.price;
        subtotal += item.quantity * currentPrice;
    }
    return subtotal;
};

const postApplyCoupon = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { couponCode } = req.body;

        if (!couponCode || !couponCode.trim()) {
            return res.json({ success: false, message: 'Coupon code is required' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.json({ success: false, message: 'Cart is empty' });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code' });
        }

        if (!coupon.isActive) {
            return res.json({ success: false, message: 'Coupon is inactive' });
        }

        if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
            return res.json({ success: false, message: 'Coupon has expired' });
        }

        const usageCount = coupon.usedBy.filter(u => u.userId.toString() === userId.toString()).length;
        if (usageCount >= coupon.usageLimit) {
            return res.json({ success: false, message: 'Coupon usage limit reached' });
        }

        const subtotal = await calculateCartSubtotal(cart);

        if (subtotal < coupon.minPurchase) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
        }

        let discount = 0;
        if (coupon.type === 'PERCENT') {
            discount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount > 0) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else if (coupon.type === 'FLAT') {
            discount = coupon.discountValue;
        }

        discount = Math.min(discount, subtotal);
        discount = Math.round(discount * 100) / 100;

        cart.couponCode = coupon.code;
        cart.couponId = coupon._id;
        cart.discountTotal = discount;
        await cart.save();

        res.json({ success: true, message: 'Coupon applied successfully', discount, subtotal, grandTotal: subtotal - discount });
    } catch (err) {
        next(err);
    }
};

const postRemoveCoupon = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        cart.couponCode = null;
        cart.couponId = null;
        cart.discountTotal = 0;
        await cart.save();

        const subtotal = await calculateCartSubtotal(cart);

        res.json({ success: true, message: 'Coupon removed', subtotal, grandTotal: subtotal });
    } catch (err) {
        next(err);
    }
};

module.exports = { postApplyCoupon, postRemoveCoupon };
