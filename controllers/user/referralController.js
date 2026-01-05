const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const ReferralOffer = require('../../models/ReferralOffer');

const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const getReferralPrompt = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            return res.redirect('/');
        }

        if (user.referralHandled) {
            return res.redirect('/');
        }

        if (!user.referralCode) {
            let code = generateReferralCode();
            let existing = await User.findOne({ referralCode: code });
            while (existing) {
                code = generateReferralCode();
                existing = await User.findOne({ referralCode: code });
            }
            user.referralCode = code;
            await user.save();
        }

        const offer = { refereeBonus: 1000 };

        res.render('user/referral-prompt', {
            title: 'Claim Referral Bonus',
            myCode: user.referralCode,
            offer: offer
        });
    } catch (err) {
        next(err);
    }
};

const { validationResult } = require('express-validator');

const postSubmitReferral = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = Object.values(errors.mapped())[0].msg;
        return res.status(400).json({ success: false, message: firstError, errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const { referralCode } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (user.referralHandled) {
            return res.json({ success: false, message: 'Referral already processed' });
        }

        if (!referralCode || referralCode.trim() === '') {
            user.referralHandled = true;
            await user.save();
            return res.json({ success: true, message: 'Skipped referral', redirect: '/' });
        }

        const trimmedCode = referralCode.trim().toUpperCase();

        if (trimmedCode === user.referralCode) {
            return res.json({ success: false, message: 'You cannot use your own referral code' });
        }

        const referrer = await User.findOne({ referralCode: trimmedCode });
        if (!referrer) {
            return res.json({ success: false, message: 'Invalid referral code' });
        }

        const REFERRER_BONUS = 1000;
        const REFEREE_BONUS = 1000;

        user.referredBy = trimmedCode;
        user.referralHandled = true;
        await user.save();

        let referrerWallet = await Wallet.findOne({ userId: referrer._id });
        if (!referrerWallet) {
            referrerWallet = new Wallet({ userId: referrer._id, balance: 0, transactions: [] });
        }
        referrerWallet.balance += REFERRER_BONUS;
        referrerWallet.transactions.push({
            type: 'credit',
            amount: REFERRER_BONUS,
            description: `Referral bonus for referring ${user.email}`,
            reason: 'referral_reward',
            status: 'COMPLETED',
            createdAt: new Date(),
        });
        await referrerWallet.save();

        let refereeWallet = await Wallet.findOne({ userId: user._id });
        if (!refereeWallet) {
            refereeWallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
        }
        refereeWallet.balance += REFEREE_BONUS;
        refereeWallet.transactions.push({
            type: 'credit',
            amount: REFEREE_BONUS,
            description: `Referral bonus for using code ${trimmedCode}`,
            reason: 'referral_reward',
            status: 'COMPLETED',
            createdAt: new Date(),
        });
        await refereeWallet.save();

        res.json({ success: true, message: 'Referral code applied successfully', redirect: '/' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getReferralPrompt, postSubmitReferral };
