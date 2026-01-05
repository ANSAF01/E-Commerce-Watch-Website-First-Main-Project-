const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const Wishlist = require('../../models/Wishlist');
const { getBestOffer, calculateDiscountedPrice } = require('../../helpers/offerHelper');

const MAX_QUANTITY_PER_ITEM = 5;
const MIN_QUANTITY = 1;

const calculateSubtotal = (items) => {
    return items.reduce((total, item) => total + (item.lineTotal || 0), 0);
};

const enrichCartItems = async (items) => {
    for (const item of items) {
        const bestOffer = await getBestOffer(item.productId);
        const currentPrice = bestOffer.percent > 0
            ? calculateDiscountedPrice(item.productId.price, bestOffer.percent)
            : item.productId.price;
        item.currentPrice = currentPrice;
        item.currentLineTotal = item.quantity * currentPrice;
    }
};

const getCart = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (cart && cart.items) {
            cart.items = cart.items.filter(item => item.productId);
            await enrichCartItems(cart.items);
        }

        const subtotal = cart ? calculateSubtotal(cart.items) : 0;
        res.render('user/cart', {
            title: 'My Cart',
            cart: cart ? cart.toObject() : null,
            subtotal: Math.round(subtotal * 100) / 100,
        });
    } catch (err) {
        next(err);
    }
};

const postAddToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const { _id: userId } = req.session.user;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID required' });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(400).json({ success: false, message: 'Product unavailable' });
        }

        if (product.stock <= 0) {
            return res.status(400).json({ success: false, message: 'Product out of stock' });
        }

        const bestOffer = await getBestOffer(product);
        const unitPrice = bestOffer.percent > 0
            ? calculateDiscountedPrice(product.price, bestOffer.percent)
            : product.price;

        const qty = Math.max(MIN_QUANTITY, Math.min(parseInt(quantity || 1), MAX_QUANTITY_PER_ITEM));

        if (qty > product.stock) {
            return res.status(400).json({ success: false, message: `Only ${product.stock} items available` });
        }

        const cartExists = await Cart.findOne({ userId });

        if (!cartExists) {
            await new Cart({ userId, items: [{ productId, quantity: qty, unitPrice, lineTotal: qty * unitPrice }] }).save();
        } else {
            const updated = await Cart.findOneAndUpdate(
                { userId, "items.productId": productId },
                {
                    $inc: { "items.$.quantity": qty, "items.$.lineTotal": qty * unitPrice },
                    $set: { "items.$.unitPrice": unitPrice }
                },
                { new: true }
            );

            if (!updated) {
                await Cart.findOneAndUpdate(
                    { userId },
                    { $push: { items: { productId, quantity: qty, unitPrice, lineTotal: qty * unitPrice } } }
                );
            } else {
                const item = updated.items.find(i => i.productId.toString() === productId);
                if (item && item.quantity > MAX_QUANTITY_PER_ITEM) {
                    const cappedTotal = MAX_QUANTITY_PER_ITEM * unitPrice;
                    await Cart.updateOne(
                        { userId, "items.productId": productId },
                        { $set: { "items.$.quantity": MAX_QUANTITY_PER_ITEM, "items.$.lineTotal": cappedTotal } }
                    );
                    return res.status(400).json({ success: false, message: `Limit is ${MAX_QUANTITY_PER_ITEM} per item` });
                }
                if (item && item.quantity > product.stock) {
                    const cappedTotal = product.stock * unitPrice;
                    await Cart.updateOne(
                        { userId, "items.productId": productId },
                        { $set: { "items.$.quantity": product.stock, "items.$.lineTotal": cappedTotal } }
                    );
                    return res.status(400).json({ success: false, message: `Only ${product.stock} items available` });
                }
            }
        }

        const finalCart = await Cart.findOne({ userId });
        await Wishlist.updateOne({ userId }, { $pull: { items: { productId } } });

        res.json({ success: true, message: 'Added to cart', cartCount: finalCart.items.length });
    } catch (err) {
        next(err);
    }
};

const patchCartItemIncrement = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { _id: userId } = req.session.user;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(i => i.productId.toString() === productId);
        if (!item) {
            return res.status(400).json({ success: false, message: 'Item not found' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product not found' });
        }

        const maxQty = Math.min(product.stock, MAX_QUANTITY_PER_ITEM);
        if (item.quantity >= maxQty) {
            return res.status(400).json({ success: false, message: 'Max quantity reached' });
        }

        item.quantity += 1;
        item.lineTotal = item.quantity * item.unitPrice;
        await cart.save();

        res.json({
            success: true,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            subtotal: calculateSubtotal(cart.items),
            disableDec: item.quantity <= MIN_QUANTITY,
            disableInc: item.quantity >= maxQty,
        });
    } catch (err) {
        next(err);
    }
};

const patchCartItemDecrement = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { _id: userId } = req.session.user;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(i => i.productId.toString() === productId);
        if (!item) {
            return res.status(400).json({ success: false, message: 'Item not found' });
        }

        if (item.quantity <= MIN_QUANTITY) {
            return res.status(400).json({ success: false, message: 'Minimum quantity is 1' });
        }

        item.quantity -= 1;
        item.lineTotal = item.quantity * item.unitPrice;
        await cart.save();

        res.json({
            success: true,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            subtotal: calculateSubtotal(cart.items),
            disableDec: item.quantity <= MIN_QUANTITY,
            disableInc: false,
        });
    } catch (err) {
        next(err);
    }
};

const patchCartItemQty = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const { _id: userId } = req.session.user;

        const qty = parseInt(quantity);
        if (!qty || qty < MIN_QUANTITY || qty > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(i => i.productId.toString() === productId);
        if (!item) {
            return res.status(400).json({ success: false, message: 'Item not in cart' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product unavailable' });
        }

        if (qty > product.stock) {
            return res.status(400).json({ success: false, message: `Insufficient stock. Only ${product.stock} available` });
        }

        item.quantity = qty;
        item.lineTotal = item.quantity * item.unitPrice;
        await cart.save();

        res.json({
            success: true,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            subtotal: calculateSubtotal(cart.items),
        });
    } catch (err) {
        next(err);
    }
};

const deleteCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { _id: userId } = req.session.user;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
        await cart.save();

        res.json({ success: true, removed: true, subtotal: calculateSubtotal(cart.items), cartCount: cart.items.length });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCart,
    postAddToCart,
    patchCartItemIncrement,
    patchCartItemDecrement,
    patchCartItemQty,
    deleteCartItem,
};
