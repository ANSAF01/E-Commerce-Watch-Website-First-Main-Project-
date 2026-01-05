const Order = require('../../models/Order');
const ReturnRequest = require('../../models/ReturnRequest');
const Wallet = require('../../models/Wallet');
const Product = require('../../models/Product');
const { calculatePagination } = require('../../utils/pagination');

const ORDERS_PER_PAGE = 5;
const ALLOWED_STATUSES = ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const STATUS_PROGRESSION = {
    PENDING: 0,
    CONFIRMED: 1,
    SHIPPED: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
    CANCELLED: -1,
    RETURNED: -1,
};

const getOrders = async (req, res, next) => {
    try {
        const page = req.query.page;
        const search = req.query.search;
        const status = req.query.status;
        const { pageNum, skip } = calculatePagination(page, ORDERS_PER_PAGE);
        const searchQuery = search || '';
        const statusFilter = status || '';

        const filter = {};
        if (searchQuery) {
            filter.orderId = { $regex: searchQuery, $options: 'i' };
        }
        if (statusFilter) {
            filter.status = statusFilter;
        }

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('userId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(ORDERS_PER_PAGE)
            .lean();

        const enrichedOrders = orders.map(order => ({
            ...order,
            displayGrandTotal: Math.round(order.grandTotal),
            itemCount: order.items?.length || 0,
        }));

        res.render('admin/order-management', {
            title: 'Orders',
            orders: enrichedOrders,
            pagination: { currentPage: pageNum, totalItems: total, limit: ORDERS_PER_PAGE },
            search: searchQuery,
            status: statusFilter,
        });
    } catch (err) {
        next(err);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const { id: orderId } = req.params;
        const order = await Order.findById(orderId).populate('userId').lean();

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        res.render('admin/order-detail', { title: 'Order Detail', order });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.redirect('/admin/orders');
        }
        next(err);
    }
};

const patchStatus = async (req, res, next) => {
    try {
        const { id: orderId } = req.params;
        const { status } = req.body;

        if (!ALLOWED_STATUSES.includes(status)) {
            const error = new Error('Invalid status. PENDING and CANCELLED are user actions only.');
            error.statusCode = 400;
            throw error;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
            const error = new Error(`Cannot update status of a ${order.status} order.`);
            error.statusCode = 400;
            throw error;
        }

        const currentStatusLevel = STATUS_PROGRESSION[order.status] ?? -1;
        const newStatusLevel = STATUS_PROGRESSION[status] ?? -1;

        if (newStatusLevel <= currentStatusLevel) {
            const error = new Error(`Cannot rollback status from ${order.status} to ${status}. Status can only move forward.`);
            error.statusCode = 400;
            throw error;
        }

        order.status = status;
        order.items.forEach(item => {
            if (item.status !== 'CANCELLED' && item.status !== 'RETURNED') {
                item.status = status;
            }
        });

        if (status === 'DELIVERED') {
            order.deliveredAt = new Date();
        }

        await order.save();
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const postApproveReturn = async (req, res, next) => {
    try {
        const { returnRequestId } = req.params;
        const { approve } = req.body;

        const returnRequest = await ReturnRequest.findById(returnRequestId);

        if (!returnRequest) {
            const error = new Error('Return request not found');
            error.statusCode = 404;
            throw error;
        }

        if (returnRequest.status !== 'PENDING') {
            const error = new Error('Return request already processed');
            error.statusCode = 400;
            throw error;
        }

        const order = await Order.findById(returnRequest.orderId);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        const item = order.items.id(returnRequest.itemId);

        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        if (approve) {
            item.status = 'RETURNED';
            returnRequest.status = 'APPROVED';
            returnRequest.processedAt = new Date();

            if (item.productId) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
            }

            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
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
                    description: `Return approved refund for Order ${order.orderId}`,
                    reason: 'return_refund',
                    orderId: order._id,
                    status: 'COMPLETED',
                    createdAt: new Date(),
                });
            }

            await wallet.save();

            const allReturned = order.items.every(i => i.status === 'RETURNED' || i.status === 'CANCELLED');
            if (allReturned && order.paymentStatus === 'PAID') {
                order.paymentStatus = 'REFUNDED';
            }
        } else {
            item.status = 'DELIVERED';
            returnRequest.status = 'REJECTED';
            returnRequest.processedAt = new Date();
        }

        await order.save();
        await returnRequest.save();

        const message = approve ? 'Return approved and refund processed' : 'Return request rejected';
        res.json({ success: true, message });
    } catch (err) {
        if (err.statusCode === 400 || err.statusCode === 404) {
            return res.json({ success: false, message: err.message });
        }
        next(err);
    }
};

const getPendingReturns = async (req, res, next) => {
    try {
        const page = req.query.page;
        const { pageNum, skip } = calculatePagination(page, ORDERS_PER_PAGE);

        const total = await ReturnRequest.countDocuments({ status: 'PENDING' });
        const returns = await ReturnRequest.find({ status: 'PENDING' })
            .populate('userId', 'fullname email')
            .populate('orderId', 'orderId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(ORDERS_PER_PAGE)
            .lean();

        res.render('admin/return-requests', {
            title: 'Return Requests',
            returns,
            pagination: { currentPage: pageNum, totalItems: total, limit: ORDERS_PER_PAGE },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getOrders,
    getOrderDetail,
    patchStatus,
    postApproveReturn,
    getPendingReturns,
};
