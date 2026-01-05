const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Wallet = require('../../models/Wallet');
const Coupon = require('../../models/Coupon');
const { getBestOffer, calculateDiscountedPrice } = require('../../helpers/offerHelper');

const FREE_SHIPPING_THRESHOLD = 0;
const SHIPPING_FEE = 0;

const calculateCartTotals = async (cart) => {
    let subtotal = 0;

    for (const item of cart.items) {
        if (!item.productId) continue;
        const bestOffer = await getBestOffer(item.productId);
        const currentPrice = bestOffer.percent > 0
            ? calculateDiscountedPrice(item.productId.price, bestOffer.percent)
            : item.productId.price;
        item.unitPrice = currentPrice;
        item.lineTotal = item.quantity * currentPrice;
        subtotal += item.lineTotal;
    }

    let discountTotal = 0;
    if (cart.couponId) {
        const Coupon = require('../../models/Coupon');
        const coupon = await Coupon.findById(cart.couponId);

        let isValid = true;

        if (!coupon || !coupon.isActive) isValid = false;
        if (coupon && coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) isValid = false;
        if (coupon && subtotal < coupon.minPurchase) isValid = false;

        if (isValid) {
            if (coupon.type === 'PERCENT') {
                discountTotal = (subtotal * coupon.discountValue) / 100;
                if (coupon.maxDiscount > 0) {
                    discountTotal = Math.min(discountTotal, coupon.maxDiscount);
                }
            } else if (coupon.type === 'FLAT') {
                discountTotal = coupon.discountValue;
            }
            discountTotal = Math.min(discountTotal, subtotal);
            discountTotal = Math.round(discountTotal * 100) / 100;
        } else {
            cart.couponCode = null;
            cart.couponId = null;
            cart.discountTotal = 0;
        }
    }

    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const grandTotal = Math.max(0, subtotal - discountTotal + shippingFee);

    return { subtotal, shippingFee, discountTotal, grandTotal };
};

const getCheckout = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.redirect('/user/cart');
        }

        cart.items = cart.items.filter(item => item.productId && item.productId.isActive && !item.productId.isDeleted);

        if (cart.items.length === 0) {
            return res.redirect('/user/cart');
        }

        const totals = await calculateCartTotals(cart);
        await cart.save();
        const addresses = await Address.find({ userId, isDeleted: false }).lean();
        const defaultAddress = addresses.find(a => a.isDefault) || addresses[0] || null;

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        const allCoupons = await Coupon.find({
            isActive: true,
            $or: [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }],
        }).lean();

        const coupons = allCoupons.map(coupon => {
            const isEligible = totals.subtotal >= coupon.minPurchase;
            const userUsage = coupon.usedBy ? coupon.usedBy.filter(u => u.userId.toString() === userId.toString()).length : 0;
            const alreadyUsed = userUsage >= (coupon.usageLimit || 1);

            return {
                ...coupon,
                isEligible,
                alreadyUsed
            };
        });

        const COD_MAX_AMOUNT = 1000;

        const isCODDisabled = totals.grandTotal > COD_MAX_AMOUNT;
        const hasInsufficientBalance = wallet.balance < totals.grandTotal;

        res.render('user/checkout', {
            title: 'Checkout',
            cart: cart.toObject(),
            addresses,
            defaultAddress,
            walletBalance: wallet.balance,
            coupons: coupons,
            summary: totals,
            isCODDisabled,
            hasInsufficientBalance,
            codMaxAmount: COD_MAX_AMOUNT,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getCheckout };
