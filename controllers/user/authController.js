const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendOTPEmail } = require('../../utils/mailer');
const User = require('../../models/User');

const getSignup = (req, res) => {
    res.render('auth/signup', { errors: {}, old: {} });
};

const postSignup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/signup', { errors: errors.mapped(), old: req.body });
    }

    try {
        const { fullname, email, password } = req.body;
        const user = new User({ fullname, email, password });
        await user.save();

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = {
            code: otpCode,
            purpose: 'signup',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            resendAllowedAt: new Date(Date.now() + 45 * 1000)
        };

        user.otps.push(otpData);
        await user.save();
        await sendOTPEmail(email, otpCode);

        req.session.signupEmail = email;
        req.session.otpPurpose = 'signup';
        res.redirect('/auth/otp');
    } catch (err) {
        next(err);
    }
};

const getLogin = (req, res) => {
    let error = null;
    if (req.query.blocked) error = 'Your account has been blocked. Please contact support.';
    const passwordReset = req.query.passwordReset || null;
    res.render('auth/login', { errors: {}, old: {}, error, passwordReset });
};
    
const postLogin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/login', { errors: errors.mapped(), old: req.body, error: null });
    }

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).render('auth/login', {
                errors: {}, old: req.body, error: 'Invalid credentials'
            });
        }

        if (user.isBlocked) {
            return res.status(403).render('auth/login', {
                errors: {}, old: req.body, error: 'Your account has been blocked.'
            });
        }

        if (user.isAdmin) {
            return res.status(403).render('auth/login', {
                errors: {}, old: req.body, error: 'Admin cannot login from user portal'
            });
        }

        if (!user.password) {
            return res.status(400).render('auth/login', {
                errors: {}, old: req.body, error: 'Use Google login for this account'
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).render('auth/login', {
                errors: {}, old: req.body, error: 'Invalid credentials'
            });
        }

        req.session.user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            mobile: user.mobile,
            profileImage: user.profileImage,
            walletBalance: user.walletBalance
        };

        if (!user.referralHandled) {
            return req.session.save((err) => {
                if (err) return next(err);
                res.redirect('/user/referral');
            });
        }

        req.session.save((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    } catch (err) {
        next(err);
    }
};

const googleCallback = async (req, res, next) => {
    try {
        const passportUser = req.user;
        if (!passportUser) throw new Error('User not found');

        const dbUser = await User.findById(passportUser._id);
        if (!dbUser) throw new Error('User not found in database');

        if (dbUser.isBlocked) {
            return res.status(403).redirect('/auth/login?blocked=true');
        }

        if (dbUser.isAdmin) {
            return res.status(403).redirect('/auth/login');
        }

        req.session.user = {
            _id: dbUser._id,
            fullname: dbUser.fullname,
            email: dbUser.email,
            mobile: dbUser.mobile,
            profileImage: dbUser.profileImage,
            walletBalance: dbUser.walletBalance
        };

        if (!dbUser.referralHandled) {
            return req.session.save((err) => {
                if (err) return next(err);
                res.redirect('/user/referral');
            });
        }

        req.session.save((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    } catch (err) {
        next(err);
    }
};

const getForgotPassword = (req, res) => {
    res.render('auth/forgot-password', { errors: {}, old: {}, error: null });
};

const postForgotPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/forgot-password', { errors: errors.mapped(), old: req.body, error: null });
    }

    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('auth/forgot-password', {
                errors: { email: { msg: 'Email not registered' } }, old: req.body, error: null
            });
        }

        if (user.googleId && !user.password) {
            return res.render('auth/forgot-password', {
                errors: {}, old: req.body, error: 'This account uses Google Login. Please sign in with Google.'
            });
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpData = {
            code: otpCode,
            purpose: 'forgot-password',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            resendAllowedAt: new Date(Date.now() + 45 * 1000)
        };

        user.otps = user.otps.filter(otp => otp.purpose !== 'forgot-password');
        user.otps.push(otpData);
        await user.save();
        await sendOTPEmail(email, otpCode);

        req.session.forgotPasswordEmail = email;
        req.session.otpPurpose = 'forgot-password';
        res.redirect('/auth/otp');
    } catch (err) {
        return res.render('auth/forgot-password', {
            errors: {}, old: req.body, error: 'Failed to send OTP. Please try again later.'
        });
    }
};

const getOtp = async (req, res) => {
    const purpose = req.session.otpPurpose;
    if (!purpose) return res.redirect('/auth/login');

    let email = null;
    let title = 'Verify OTP';
    let showExpiry = true;

    try {
        if (purpose === 'signup') {
            email = req.session.signupEmail;
            title = 'Email Verification';
        } else if (purpose === 'forgot-password') {
            email = req.session.forgotPasswordEmail;
            showExpiry = false;
        } else if (purpose === 'password-change') {
            const user = await User.findById(req.session.user._id);
            email = user.email;
            title = 'Verify Password Change';
        } else if (purpose === 'email-change') {
            const user = await User.findById(req.session.user._id);
            const latestOtp = user.otps.filter(o => o.purpose === 'email-change').pop();
            email = latestOtp?.metadata?.newEmail;
            title = 'Verify New Email';
        }

        if (!email) return res.redirect('/auth/login');

        const user = await User.findOne({ email: purpose === 'email-change' ? req.session.user.email : email });
        if (!user) return res.redirect('/auth/login');

        const latestOtp = user.otps.filter(o => o.purpose === purpose).pop();
        const otpValidityRemaining = latestOtp ? Math.ceil((new Date(latestOtp.expiresAt) - new Date()) / 1000) : 0;
        const remainingCooldown = latestOtp ? Math.ceil((new Date(latestOtp.resendAllowedAt) - new Date()) / 1000) : 0;

        res.render('auth/otp', {
            email, purpose, title,
            remainingCooldown: Math.max(0, remainingCooldown),
            otpValidityRemaining: Math.max(0, otpValidityRemaining),
            showExpiry
        });
    } catch (err) {
        res.redirect('/auth/login');
    }
};

const postVerifyOtp = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = Object.values(errors.mapped())[0].msg;
        return res.status(400).json({ success: false, message: firstError, errors: errors.mapped() });
    }
    try {
        const { email, otp } = req.body;
        const purpose = req.session.otpPurpose;

        if (!purpose) {
            return res.status(400).json({ success: false, message: 'Invalid OTP session' });
        }

        let user;
        if (purpose === 'password-change' || purpose === 'email-change') {
            user = await User.findById(req.session.user._id);
        } else {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const latestOtp = user.otps.filter(o => o.purpose === purpose).pop();

        if (!latestOtp) {
            return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
        }

        if (new Date() > new Date(latestOtp.expiresAt)) {
            user.otps = user.otps.filter(o => o.purpose !== purpose);
            await user.save();
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (latestOtp.code !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        user.otps = user.otps.filter(o => o.purpose !== purpose);

        let redirectTo = '/';
        let message = 'Verified successfully';

        if (purpose === 'signup') {
            user.isVerified = true;
            await user.save();
            delete req.session.signupEmail;
            delete req.session.otpPurpose;
            redirectTo = '/auth/login';
            message = 'Email verified successfully. Please login.';
        } else if (purpose === 'forgot-password') {
            await user.save();
            redirectTo = '/auth/reset-password';
            message = 'OTP verified. Please set your new password.';
        } else if (purpose === 'password-change') {
            const newPassword = req.session.tempNewPassword;
            if (!newPassword) {
                return res.status(400).json({ success: false, message: 'Invalid password change session' });
            }
            user.password = newPassword;
            await user.save();
            delete req.session.tempNewPassword;
            delete req.session.otpPurpose;
            redirectTo = '/user/profile';
            message = 'Password changed successfully';
        } else if (purpose === 'email-change') {
            const newEmail = latestOtp.metadata?.newEmail;
            if (!newEmail) {
                return res.status(400).json({ success: false, message: 'Invalid email change request' });
            }
            user.email = newEmail;
            await user.save();
            req.session.user.email = newEmail;
            delete req.session.otpPurpose;
            redirectTo = '/user/profile';
            message = 'Email changed successfully';
        }

        return res.json({ success: true, message, redirectTo });
    } catch (err) {
        next(err);
    }
};

const postResendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        const purpose = req.session.otpPurpose;

        if (!purpose) {
            return res.status(400).json({ success: false, message: 'Invalid OTP session' });
        }

        let user;
        if (purpose === 'password-change' || purpose === 'email-change') {
            user = await User.findById(req.session.user._id);
        } else {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const latestOtp = user.otps.filter(o => o.purpose === purpose).pop();

        if (latestOtp) {
            if (new Date(latestOtp.resendAllowedAt) > new Date()) {
                return res.status(400).json({ success: false, message: 'Please wait before resending OTP' });
            }
        }

        user.otps = user.otps.filter(o => o.purpose !== purpose);

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpData = {
            code: otpCode,
            purpose: purpose,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            resendAllowedAt: new Date(Date.now() + 45 * 1000),
            metadata: latestOtp?.metadata || {}
        };

        user.otps.push(otpData);
        await user.save();

        const sendToEmail = purpose === 'email-change' && latestOtp?.metadata?.newEmail
            ? latestOtp.metadata.newEmail
            : user.email;

        await sendOTPEmail(sendToEmail, otpCode);

        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (err) {
        next(err);
    }
};

const getResetPassword = (req, res) => {
    const email = req.session.forgotPasswordEmail;
    if (!email) return res.redirect('/auth/forgot-password');
    res.render('auth/reset-password', { email, errors: {}, error: null });
};

const postResetPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/reset-password', { email: req.body.email, errors: errors.mapped(), error: null });
    }

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('auth/reset-password', {
                email: req.body.email, errors: {}, error: 'User not found. Please try again.'
            });
        }

        user.password = password;
        await user.save();

        delete req.session.forgotPasswordEmail;
        delete req.session.otpPurpose;

        res.redirect('/auth/login?passwordReset=success');
    } catch (err) {
        next(err);
    }
};

const getLogout = (req, res) => {
    req.logout((err) => {
        if (req.session) {
            req.session.user = null;
            req.session.destroy(() => {
                res.clearCookie('fg_sid');
                res.redirect('/auth/login');
            });
        } else {
            res.clearCookie('fg_sid');
            res.redirect('/auth/login');
        }
    });
};

module.exports = {
    getSignup,
    postSignup,
    getLogin,
    postLogin,
    googleCallback,
    getForgotPassword,
    postForgotPassword,
    getOtp,
    postVerifyOtp,
    postResendOtp,
    getResetPassword,
    postResetPassword,
    getLogout
};
