const Wallet = require('../../models/Wallet');
const { calculatePagination } = require('../../utils/pagination');

const Razorpay = require('razorpay');
const crypto = require('crypto');

const TRANSACTIONS_PER_PAGE = 10;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getWallet = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const page = req.query.page;
        const { pageNum, skip } = calculatePagination(page, TRANSACTIONS_PER_PAGE);

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = sortedTransactions.length;
        const paginatedTransactions = sortedTransactions.slice(skip, skip + TRANSACTIONS_PER_PAGE);

        const totalCredits = wallet.transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebits = wallet.transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        res.render('user/wallet', {
            title: 'My Wallet',
            wallet: { balance: wallet.balance, transactions: paginatedTransactions },
            stats: {
                totalCredits,
                totalDebits,
                totalTransactions: total
            },
            pagination: { currentPage: pageNum, totalItems: total, limit: TRANSACTIONS_PER_PAGE },
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            user: req.session.user
        });
    } catch (err) {
        next(err);
    }
};

const { validationResult } = require('express-validator');

const postAddMoney = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = Object.values(errors.mapped())[0].msg;
        return res.status(400).json({ success: false, message: firstError, errors: errors.mapped() });
    }

    try {
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `wal_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: options.amount,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        next(err);
    }
};

const postVerifyAddMoney = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }

        const creditAmount = parseFloat(amount);

        wallet.balance += creditAmount;
        wallet.transactions.push({
            type: 'credit',
            amount: creditAmount,
            description: 'Added money using Razorpay',
            reason: 'deposit',
            status: 'COMPLETED',
            createdAt: new Date()
        });

        await wallet.save();

        res.json({ success: true, message: 'Money added successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getWallet,
    postAddMoney,
    postVerifyAddMoney
};
