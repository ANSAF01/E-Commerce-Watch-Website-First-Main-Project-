const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Address = require('../../models/Address');
const Wallet = require('../../models/Wallet');
const { getBestOffer, calculateDiscountedPrice } = require('../../helpers/offerHelper');

const COD_MAX_AMOUNT = 1000;
const MIN_RAZORPAY_AMOUNT = 1;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateOrderId = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
};

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
    const shippingFee = 0;
    const discountTotal = cart.discountTotal || 0;
    const grandTotal = subtotal - discountTotal + shippingFee;
    return { subtotal, shippingFee, discountTotal, grandTotal };
};

const postCreateOrder = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { addressId, paymentMethod } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'Address and payment method required' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        cart.items = cart.items.filter(item => item.productId && item.productId.isActive && !item.productId.isDeleted);
        if (cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid items in cart' });
        }

        for (const item of cart.items) {
            if (item.quantity > item.productId.stock) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${item.productId.name}` });
            }
        }

        const address = await Address.findOne({ _id: addressId, userId, isDeleted: false }).lean();
        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid address' });
        }

        const totals = await calculateCartTotals(cart);

        if (paymentMethod === 'COD' && totals.grandTotal > COD_MAX_AMOUNT) {
            return res.status(400).json({ success: false, message: `COD not available for orders above ₹${COD_MAX_AMOUNT}` });
        }

        if (paymentMethod === 'WALLET') {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < totals.grandTotal) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }
        }

        const orderId = generateOrderId();
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            name: item.productId.name,
            image: item.productId.images[0] || '',
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            status: 'PENDING',
        }));

        const orderData = {
            orderId,
            userId,
            address,
            items: orderItems,
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            shippingFee: totals.shippingFee,
            grandTotal: totals.grandTotal,
            couponCode: cart.couponCode || null,
            paymentMethod,
            paymentStatus: 'PENDING',
            status: 'PENDING',
        };

        if (paymentMethod === 'RAZORPAY') {
            if (totals.grandTotal < MIN_RAZORPAY_AMOUNT) {
                return res.status(400).json({ success: false, message: `Minimum order amount for online payment is ₹${MIN_RAZORPAY_AMOUNT}` });
            }
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(totals.grandTotal * 100),
                currency: 'INR',
                receipt: orderId,
            });
            orderData.razorpayOrderId = razorpayOrder.id;
        }

        const order = new Order(orderData);
        await order.save();

        if (paymentMethod === 'COD') {
            for (const item of cart.items) {
                await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
            }
            await Cart.findByIdAndUpdate(cart._id, { items: [], couponCode: null, couponId: null, discountTotal: 0 });
            return res.json({ success: true, message: 'Order placed successfully', orderId: order._id, redirect: `/user/orders/${order._id}/success` });
        }

        if (paymentMethod === 'WALLET') {
            const wallet = await Wallet.findOne({ userId });
            wallet.balance -= totals.grandTotal;
            wallet.transactions.push({
                type: 'debit',
                amount: totals.grandTotal,
                description: `Payment for order ${orderId}`,
                reason: 'wallet_payment',
                orderId: order._id,
                status: 'COMPLETED',
                createdAt: new Date(),
            });
            await wallet.save();

            order.paymentStatus = 'PAID';
            await order.save();

            for (const item of cart.items) {
                await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
            }
            await Cart.findByIdAndUpdate(cart._id, { items: [], couponCode: null, couponId: null, discountTotal: 0 });
            return res.json({ success: true, message: 'Order placed successfully', orderId: order._id, redirect: `/user/orders/${order._id}/success` });
        }

        if (paymentMethod === 'RAZORPAY') {
            return res.json({
                success: true,
                razorpay: true,
                orderId: order._id,
                razorpayOrderId: orderData.razorpayOrderId,
                amount: Math.round(totals.grandTotal * 100),
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID,
            });
        }

        res.status(400).json({ success: false, message: 'Invalid payment method' });
    } catch (err) {
        next(err);
    }
};

const postVerifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.paymentStatus = 'PAID';
        await order.save();

        for (const item of order.items) {
            if (item.productId) {
                await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
            }
        }

        const cart = await Cart.findOne({ userId: order.userId });
        if (cart) {
            await Cart.findByIdAndUpdate(cart._id, { items: [], couponCode: null, couponId: null, discountTotal: 0 });
        }

        res.json({ success: true, message: 'Payment verified successfully', redirect: `/user/orders/${order._id}/success` });
    } catch (err) {
        next(err);
    }
};

const getOrderSuccess = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId }).lean();
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        res.render('user/order-success', { title: 'Order Placed', order });
    } catch (err) {
        next(err);
    }
};

const getPaymentFailed = (req, res) => {
    const { error, code, orderId } = req.query;
    res.render('user/payment-failed', {
        title: 'Payment Failed',
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        user: req.session.user || null,
        error: error || 'Payment failed',
        code: code || '',
        orderId: orderId || ''
    });
};

const postRetryPayment = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { orderId } = req.body;

        const order = await Order.findOne({ _id: orderId, userId }).populate('userId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentStatus === 'PAID') {
            return res.status(400).json({ success: false, message: 'Order already paid' });
        }

        // Create new Razorpay order for the retry
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.grandTotal * 100),
            currency: 'INR',
            receipt: order.orderId, // Reuse same receipt ID (our order ID)
        });

        // Update order with new Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            order_id: razorpayOrder.id,
            orderId: order._id,
            name: 'FG-UNITED',
            description: 'Retry Payment',
            prefill: {
                name: order.address.recipientName || order.userId.fullname,
                email: order.userId.email,
                contact: order.address.phone || order.userId.mobile
            }
        });
    } catch (err) {
        next(err);
    }
};


module.exports = {
    postCreateOrder,
    postVerifyPayment,
    getOrderSuccess,
    getPaymentFailed,
    postRetryPayment,
};
