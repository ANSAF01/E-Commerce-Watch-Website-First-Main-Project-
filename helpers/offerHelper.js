const Category = require('../models/Category');

const isOfferActive = (offer) => {
    if (!offer?.active || !offer.percent) return false;

    const percent = Math.min(100, Math.max(0, parseInt(offer.percent) || 0));
    if (percent <= 0) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startAt = offer.startAt ? new Date(offer.startAt) : null;
    const endAt = offer.endAt ? new Date(offer.endAt) : null;

    if (startAt && isNaN(startAt)) return false;
    if (endAt && isNaN(endAt)) return false;

    const start = startAt ? new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate()) : null;
    const end = endAt ? new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate(), 23, 59, 59, 999) : null;

    const afterStart = !start || start <= todayStart;
    const beforeEnd = !end || end >= now;

    return afterStart && beforeEnd ? percent : 0;
};

const getBestOffer = async (product) => {
    if (!product || typeof product !== 'object') {
        return { percent: 0, type: 'none' };
    }

    let best = { percent: 0, type: 'none' };

    const productPercent = isOfferActive(product.offer);
    if (productPercent > best.percent) {
        best = { percent: productPercent, type: 'product' };
    }

    if (product.category && best.percent < 100) {
        try {
            let category;

            if (typeof product.category === 'object' && product.category._id) {
                category = product.category;
            } else {
                category = await Category.findById(product.category).lean();
            }

            if (category) {
                const categoryPercent = isOfferActive(category.offer);
                if (categoryPercent > best.percent) {
                    best = { percent: categoryPercent, type: 'category' };
                }
            }
        } catch (err) {
            console.error('Error fetching category offer:', err);
        }
    }

    return best;
};

const calculateDiscountedPrice = (price, offerPercent = 0) => {
    const validPrice = Math.max(0, Number(price) || 0);
    const percent = Math.min(100, Math.max(0, Number(offerPercent) || 0));

    if (percent === 0 || validPrice === 0) return Number(validPrice.toFixed(2));

    const discounted = validPrice * (1 - percent / 100);
    return Number(Math.max(0, discounted).toFixed(2));
};

const enrichProductWithOffer = async (product) => {
    const bestOffer = await getBestOffer(product);
    const discountedPrice = bestOffer.percent > 0 ? calculateDiscountedPrice(product.price, bestOffer.percent) : null;
    const productObj = product.toObject ? product.toObject() : product;
    return { ...productObj, bestOfferPercent: bestOffer.percent, offerPrice: discountedPrice };
};

module.exports = {
    getBestOffer,
    calculateDiscountedPrice,
    enrichProductWithOffer,
};
