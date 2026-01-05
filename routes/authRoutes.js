const express = require('express');
const router = express.Router();
const passport = require('passport');
const { redirectIfUserLoggedIn } = require('../middleware/redirectIfLoggedIn');
const {
    signupValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    otpValidation,
    emailOnlyValidation
} = require('../utils/validation');
const {
    getSignup,
    postSignup,
    getLogin,
    postLogin,
    googleCallback,
    getLogout,
    getForgotPassword,
    postForgotPassword,
    getOtp,
    postVerifyOtp,
    postResendOtp,
    getResetPassword,
    postResetPassword,
} = require('../controllers/user/authController');

router.get('/signup', redirectIfUserLoggedIn, getSignup);
router.post('/signup', redirectIfUserLoggedIn, signupValidation, postSignup);

router.get('/login', redirectIfUserLoggedIn, getLogin);
router.post('/login', redirectIfUserLoggedIn, loginValidation, postLogin);

router.get('/google', redirectIfUserLoggedIn, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', redirectIfUserLoggedIn, passport.authenticate('google', { failureRedirect: '/auth/login' }), googleCallback);

router.get('/forgot-password', redirectIfUserLoggedIn, getForgotPassword);
router.post('/forgot-password', redirectIfUserLoggedIn, forgotPasswordValidation, postForgotPassword);

router.get('/otp', getOtp);
router.post('/verify-otp', otpValidation, postVerifyOtp);
router.post('/resend-otp', emailOnlyValidation, postResendOtp);

router.get('/reset-password', getResetPassword);
router.post('/reset-password', resetPasswordValidation, postResetPassword);

router.get('/logout', getLogout);

module.exports = router;
