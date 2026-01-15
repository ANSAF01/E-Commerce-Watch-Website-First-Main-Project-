const { validationResult } = require('express-validator');
const User = require('../../models/User');
const bcrypt = require('bcrypt');
const { sendOTPEmail } = require('../../utils/mailer');

const generateOtpCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString();
};

const pushOtp = async (userId, purpose, email, metadata = {}) => {
    const code = generateOtpCode();
    const otpData = {
        code,
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        resendAllowedAt: new Date(Date.now() + 45 * 1000),
        metadata,
    };
    await User.findByIdAndUpdate(userId, { $push: { otps: otpData } });
    await sendOTPEmail(email, code);
    return { success: true, message: `OTP sent to ${email}` };
};

const getProfile = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const user = await User.findById(userId).lean();

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        res.render('user/profile', { title: 'My Profile', user });
    } catch (err) {
        next(err);
    }
};

const getEditProfile = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const user = await User.findById(userId).lean();

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        res.render('user/edit-profile', { title: 'Edit Profile', user, errors: {} });
    } catch (err) {
        next(err);
    }
};

const postEditProfile = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const { fullname, mobile } = req.body;
        const updateData = { fullname, mobile };

        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        const hasChanges = (fullname !== user.fullname)
            || ((mobile || '') !== (user.mobile || ''))
            || !!req.file;

        if (!hasChanges) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updated = await User.findByIdAndUpdate(userId, updateData, { new: true });
        req.session.user = {
            _id: updated._id,
            email: updated.email,
            fullname: updated.fullname,
            isAdmin: updated.isAdmin,
        };

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        next(err);
    }
};

const getChangePassword = (req, res) => {
    res.render('user/change-password', { title: 'Change Password', errors: {} });
};

const postChangePassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('user/change-password', { title: 'Change Password', errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        if (!user.email) {
            return res.status(400).render('user/change-password', {
                title: 'Change Password',
                errors: {},
                error: 'No email found for OTP',
            });
        }

        const { newPassword, currentPassword } = req.body;

        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.render('user/change-password', {
                    title: 'Change Password',
                    errors: { currentPassword: { msg: 'Incorrect password' } }
                });
            }
        }

        await pushOtp(userId, 'password-change', user.email);
        req.session.tempNewPassword = newPassword;
        req.session.otpPurpose = 'password-change';

        res.redirect('/auth/otp');
    } catch (err) {
        next(err);
    }

};

const postVerifyCurrentPassword = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { currentPassword } = req.body;

        if (!currentPassword) {
            return res.json({ success: false, message: 'Password is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.password) {
            return res.json({ success: false, message: 'Google logged in user. No password set.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (isMatch) {
            return res.json({ success: true, message: 'Password verified' });
        } else {
            return res.json({ success: false, message: 'Incorrect password' });
        }
    } catch (err) {
        next(err);
    }
};

const postSendChangeEmailOTP = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { newEmail } = req.body;

        if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
            return res.status(400).json({ success: false, message: 'Invalid email address' });
        }

        const existing = await User.findOne({ email: newEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        await pushOtp(userId, 'email-change', newEmail, { newEmail });
        req.session.otpPurpose = 'email-change';

        res.json({ success: true, message: 'OTP sent to new email', redirectTo: '/auth/otp' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProfile,
    getEditProfile,
    postEditProfile,
    getChangePassword,
    postChangePassword,
    postSendChangeEmailOTP,
    postVerifyCurrentPassword,
};
