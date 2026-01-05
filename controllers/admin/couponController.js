const { validationResult } = require('express-validator');
const Coupon = require('../../models/Coupon');

const COUPON_EXPIRY_DAYS = 30;
const USAGE_LIMIT = 5;

const getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        res.render('admin/coupons', { title: 'Coupon Management', coupons, errors: {}, old: {} });
    } catch (err) {
        next(err);
    }
};

const postAddCoupon = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        return res.render('admin/coupons', { title: 'Coupon Management', coupons, errors: errors.mapped(), old: req.body });
    }

    try {
        const { code, type, discountValue, maxDiscount, minPurchase } = req.body;
        const discount = parseFloat(discountValue) || 0;
        const minPurchaseAmount = Math.max(0, parseFloat(minPurchase) || 0);
        const maxDiscountAmount = type === 'PERCENT' ? Math.max(0, parseFloat(maxDiscount) || 0) : 0;

        await Coupon.create({
            code: code.toUpperCase().trim(),
            type,
            discountValue: discount,
            maxDiscount: maxDiscountAmount,
            minPurchase: minPurchaseAmount,
            usageLimit: USAGE_LIMIT,
            expiresAt: new Date(Date.now() + COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            isActive: true,
        });

        res.redirect('/admin/coupons');
    } catch (err) {
        next(err);
    }
};

const deleteCoupon = async (req, res, next) => {
    try {
        const { id: couponId } = req.params;
        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const patchToggleCoupon = async (req, res, next) => {
    try {
        const { id: couponId } = req.params;
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        const message = `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`;
        res.json({ success: true, message, isActive: coupon.isActive });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getEditCoupon = async (req, res, next) => {
    try {
        const { id: couponId } = req.params;
        const coupon = await Coupon.findById(couponId).lean();

        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        res.render('admin/edit-coupon', { title: 'Edit Coupon', coupon, errors: {}, old: {} });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.redirect('/admin/coupons');
        }
        next(err);
    }
};

const postEditCoupon = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, message: Object.values(errors.mapped())[0]?.msg || 'Validation error' });
    }

    try {
        const { id: couponId } = req.params;
        const { discountValue, maxDiscount, minPurchase, expiresAt } = req.body;
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error;
        }

        const discount = parseFloat(discountValue) || 0;
        const minPurchaseAmount = Math.max(0, parseFloat(minPurchase) || 0);
        const maxDiscountAmount = coupon.type === 'PERCENT' ? Math.max(0, parseFloat(maxDiscount) || 0) : 0;

        let expiryDate = null;
        if (expiresAt) {
            expiryDate = new Date(expiresAt);
            if (isNaN(expiryDate.getTime())) {
                const error = new Error('Invalid expiry date');
                error.statusCode = 400;
                throw error;
            }
        }

        coupon.discountValue = discount;
        coupon.maxDiscount = maxDiscountAmount;
        coupon.minPurchase = minPurchaseAmount;
        coupon.expiresAt = expiryDate;
        await coupon.save();

        res.json({ success: true, message: 'Coupon updated successfully', coupon });
    } catch (err) {
        if (err.statusCode === 400) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: false, message: 'Error updating coupon' });
    }
};

module.exports = {
    getCoupons,
    postAddCoupon,
    deleteCoupon,
    patchToggleCoupon,
    getEditCoupon,
    postEditCoupon,
};
