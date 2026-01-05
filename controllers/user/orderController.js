const Order = require('../../models/Order');
const ReturnRequest = require('../../models/ReturnRequest');
const Product = require('../../models/Product');
const Wallet = require('../../models/Wallet');
const { calculatePagination } = require('../../utils/pagination');
const PDFDocument = require('pdfkit');

const ORDERS_PER_PAGE = 5;

const getOrders = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const page = req.query.page;
        const { pageNum, skip } = calculatePagination(page, ORDERS_PER_PAGE);

        const total = await Order.countDocuments({ userId });
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(ORDERS_PER_PAGE)
            .lean();

        res.render('user/orders', {
            title: 'My Orders',
            orders,
            pagination: { currentPage: pageNum, totalItems: total, limit: ORDERS_PER_PAGE },
        });
    } catch (err) {
        next(err);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId }).lean();
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        let refundedAmount = 0;
        if (order.items) {
            order.items.forEach(item => {
                if (item.status === 'CANCELLED' || item.status === 'RETURNED') {
                    const itemPercentage = order.subtotal > 0 ? item.lineTotal / order.subtotal : 0;
                    const itemDiscount = order.discountTotal * itemPercentage;
                    refundedAmount += (item.lineTotal - itemDiscount);
                }
            });
        }

        res.render('user/order-detail', {
            title: 'Order Details',
            order,
            refundedAmount: Math.round(refundedAmount),
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        next(err);
    }
};

const postCancelOrder = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
            return res.json({ success: false, message: 'Cannot cancel this order' });
        }

        let refundForOrder = 0;

        for (const item of order.items) {
            if (item.status !== 'CANCELLED' && item.status !== 'RETURNED') {
                item.status = 'CANCELLED';
                item.cancelReason = reason || 'Customer cancelled';

                if (item.productId) {
                    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
                }

                if (order.paymentStatus === 'PAID' && order.paymentMethod !== 'COD') {
                    const itemPercentage = order.subtotal > 0 ? item.lineTotal / order.subtotal : 0;
                    const itemDiscount = Math.round(order.discountTotal * itemPercentage * 100) / 100;
                    const itemActualCost = Math.max(0, item.lineTotal - itemDiscount);
                    refundForOrder += Math.max(0, Math.round(itemActualCost * 100) / 100);
                }
            }
        }

        order.status = 'CANCELLED';

        if (refundForOrder > 0) {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0, transactions: [] });
            }

            wallet.balance += refundForOrder;
            wallet.transactions.push({
                type: 'credit',
                amount: refundForOrder,
                description: `Refund for cancelled order ${order.orderId}`,
                reason: 'cancel_refund',
                orderId: order._id,
                status: 'COMPLETED',
                createdAt: new Date(),
            });

            await wallet.save();
        }

        if (order.paymentStatus === 'PAID' && order.paymentMethod !== 'COD') {
            order.paymentStatus = 'REFUNDED';
        }

        await order.save();


        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (err) {
        next(err);
    }
};

const postCancelItem = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.json({ success: false, message: 'Item not found' });
        }

        if (item.status === 'CANCELLED' || item.status === 'RETURNED') {
            return res.json({ success: false, message: 'Item already cancelled or returned' });
        }

        item.status = 'CANCELLED';
        item.cancelReason = reason || 'Customer cancelled';

        if (item.productId) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        const allCancelled = order.items.every(i => i.status === 'CANCELLED' || i.status === 'RETURNED');
        if (allCancelled) {
            order.status = 'CANCELLED';
        }

        await order.save();

        if (order.paymentStatus === 'PAID' && order.paymentMethod !== 'COD') {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0, transactions: [] });
            }

            let refundAmount = 0;
            if (order.grandTotal > 0) {
                const itemPercentage = order.subtotal > 0 ? item.lineTotal / order.subtotal : 0;
                const itemDiscount = Math.round(order.discountTotal * itemPercentage * 100) / 100;
                const itemActualCost = Math.max(0, item.lineTotal - itemDiscount);
                refundAmount = Math.max(0, Math.round(itemActualCost * 100) / 100);
            }

            if (refundAmount > 0) {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for cancelled item in order ${order.orderId}`,
                    reason: 'cancel_refund',
                    orderId: order._id,
                    status: 'COMPLETED',
                    createdAt: new Date(),
                });
                await wallet.save();
            }

            if (allCancelled) {
                order.paymentStatus = 'REFUNDED';
                await order.save();
            }
        }

        res.json({ success: true, message: 'Item cancelled successfully' });
    } catch (err) {
        next(err);
    }
};

const postReturnItem = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 5) {
            return res.json({ success: false, message: 'Return reason is required (minimum 5 characters)' });
        }

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.json({ success: false, message: 'Item not found' });
        }

        if (item.status !== 'DELIVERED') {
            return res.json({ success: false, message: 'Only delivered items can be returned' });
        }

        const existing = await ReturnRequest.findOne({ orderId: order._id, itemId: item._id, status: 'PENDING' });
        if (existing) {
            return res.json({ success: false, message: 'Return request already submitted' });
        }

        const returnRequest = new ReturnRequest({
            orderId: order._id,
            itemId: item._id,
            userId,
            reason: reason.trim(),
            status: 'PENDING',
        });

        await returnRequest.save();

        item.status = 'PENDING_RETURN';
        item.returnReason = reason.trim();
        await order.save();

        res.json({ success: true, message: 'Return request submitted successfully' });
    } catch (err) {
        next(err);
    }
};

const getInvoice = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId }).populate('userId').lean();
        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderId}.pdf"`);

        doc.pipe(res);

        doc.fontSize(20).font('Helvetica-Bold').text('FG-UNITED', { align: 'center' });
        doc.fontSize(14).font('Helvetica').text('Tax Invoice', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica-Bold').text('Order Details:');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica-Bold').text('Billing Address:');
        doc.fontSize(9).font('Helvetica');
        doc.text(`${order.address.recipientName || order.userId?.fullname || 'N/A'}`);
        doc.text(`${order.address.address}, ${order.address.city}`);
        doc.text(`${order.address.state}, ${order.address.pincode}`);
        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica-Bold').text('Items:');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 250;
        const col3 = 350;
        const col4 = 450;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Product', col1, tableTop);
        doc.text('Qty', col2, tableTop);
        doc.text('Price', col3, tableTop);
        doc.text('Total', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.moveDown(1);

        doc.fontSize(9).font('Helvetica');
        order.items.forEach(item => {
            const y = doc.y;
            let displayName = item.name || 'Product';
            if (item.status === 'CANCELLED') displayName += ' [CANCELLED]';
            if (item.status === 'RETURNED') displayName += ' [RETURNED]';

            doc.text(displayName, col1, y, { width: 190 });
            doc.text(item.quantity.toString(), col2, y);
            doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, col3, y);
            doc.text(`Rs. ${item.lineTotal.toFixed(2)}`, col4, y);
            doc.moveDown(0.8);
        });

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        let refundedAmount = 0;
        order.items.forEach(item => {
            if (item.status === 'CANCELLED' || item.status === 'RETURNED') {
                const itemPercentage = order.subtotal > 0 ? item.lineTotal / order.subtotal : 0;
                const itemDiscount = order.discountTotal * itemPercentage;
                refundedAmount += (item.lineTotal - itemDiscount);
            }
        });

        doc.fontSize(9).font('Helvetica');
        doc.text(`Subtotal: Rs. ${order.subtotal.toFixed(2)}`, col3, doc.y);
        doc.text(`Discount: -Rs. ${order.discountTotal.toFixed(2)}`, col3, doc.y);
        doc.text(`Shipping: Rs. ${order.shippingFee.toFixed(2)}`, col3, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(`Grand Total: Rs. ${order.grandTotal.toFixed(2)}`, col3, doc.y);

        if (refundedAmount > 0) {
            doc.fillColor('red').text(`Refunded: -Rs. ${Math.round(refundedAmount).toFixed(2)}`, col3, doc.y);
            doc.fillColor('black').text(`Net Paid: Rs. ${Math.round(order.grandTotal - refundedAmount).toFixed(2)}`, col3, doc.y);
        }

        doc.end();
    } catch (err) {
        next(err);
    }
};


module.exports = {
    getOrders,
    getOrderDetail,
    postCancelOrder,
    postCancelItem,
    postReturnItem,
    getInvoice,
};
