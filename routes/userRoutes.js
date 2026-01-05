const express = require('express');
const router = express.Router();
const multer = require('multer');
const authUser = require('../middleware/authUser');
const { uploadProfileImage } = require('../middleware/upload');
const {
    profileValidation,
    passwordChangeValidation,
    addressValidation,
    orderCancelValidation,
    orderReturnValidation,
    emailOnlyValidation,
    walletValidation,
    referralValidation
} = require('../utils/validation');

const {
    getProfile,
    getEditProfile,
    postEditProfile,
    getChangePassword,
    postChangePassword,
    postSendChangeEmailOTP,
} = require('../controllers/user/profileController');

const {
    getCart,
    postAddToCart,
    patchCartItemIncrement,
    patchCartItemDecrement,
    patchCartItemQty,
    deleteCartItem,
} = require('../controllers/user/cartController');

const {
    getWishlist,
    postAddWishlist,
    deleteWishlistItem,
} = require('../controllers/user/wishlistController');

const {
    getAddresses,
    postAddAddress,
    getEditAddress,
    postEditAddress,
    patchEditAddress,
    deleteAddress,
    patchDefaultAddress,
} = require('../controllers/user/addressController');

const { getCheckout } = require('../controllers/user/checkoutController');

const {
    getOrders,
    getOrderDetail,
    postCancelOrder,
    postCancelItem,
    postReturnItem,
    getInvoice,
} = require('../controllers/user/orderController');

const {
    postCreateOrder,
    postVerifyPayment,
    getOrderSuccess,
    getPaymentFailed,
    postRetryPayment,
} = require('../controllers/user/paymentController');

const {
    postApplyCoupon,
    postRemoveCoupon,
} = require('../controllers/user/couponController');

const {
    getWallet,
    postAddMoney,
    postVerifyAddMoney,
} = require('../controllers/user/walletController');

const {
    getReferralPrompt,
    postSubmitReferral,
} = require('../controllers/user/referralController');

const profileUpload = multer({ storage: multer.memoryStorage() });

router.get('/profile', authUser, getProfile);
router.get('/profile/edit', authUser, getEditProfile);
router.post('/profile/edit', authUser, profileUpload.single('profileImage'), uploadProfileImage, profileValidation, postEditProfile);
router.post('/profile/change-email-otp', authUser, emailOnlyValidation, postSendChangeEmailOTP);

router.get('/change-password', authUser, getChangePassword);
router.post('/change-password', authUser, passwordChangeValidation, postChangePassword);

router.get('/cart', authUser, getCart);
router.post('/cart/add', authUser, postAddToCart);
router.patch('/cart/increment/:productId', authUser, patchCartItemIncrement);
router.patch('/cart/decrement/:productId', authUser, patchCartItemDecrement);
router.patch('/cart/update-qty/:productId', authUser, patchCartItemQty);
router.delete('/cart/delete/:productId', authUser, deleteCartItem);

router.get('/wishlist', authUser, getWishlist);
router.post('/wishlist/add', authUser, postAddWishlist);
router.delete('/wishlist/delete/:productId', authUser, deleteWishlistItem);

router.get('/addresses', authUser, getAddresses);
router.post('/addresses/add', authUser, addressValidation, postAddAddress);
router.get('/addresses/edit/:id', authUser, getEditAddress);
router.post('/addresses/edit/:id', authUser, addressValidation, postEditAddress);
router.patch('/addresses/edit/:id', authUser, addressValidation, patchEditAddress);
router.delete('/addresses/delete/:id', authUser, deleteAddress);
router.patch('/addresses/default/:id', authUser, patchDefaultAddress);

router.get('/checkout', authUser, getCheckout);

router.post('/orders/create', authUser, postCreateOrder);
router.post('/orders/verify-payment', authUser, postVerifyPayment);
router.get('/orders/:id/success', authUser, getOrderSuccess);
router.get('/payment-failed', authUser, getPaymentFailed);
router.post('/payment/retry', authUser, postRetryPayment);

router.get('/orders', authUser, getOrders);
router.get('/orders/:id', authUser, getOrderDetail);
router.post('/orders/:id/cancel', authUser, orderCancelValidation, postCancelOrder);
router.post('/orders/:orderId/items/:itemId/cancel', authUser, orderCancelValidation, postCancelItem);
router.post('/orders/:orderId/items/:itemId/return', authUser, orderReturnValidation, postReturnItem);
router.get('/orders/:id/invoice', authUser, getInvoice);

router.post('/coupon/apply', authUser, postApplyCoupon);
router.post('/coupon/remove', authUser, postRemoveCoupon);


router.get('/wallet', authUser, getWallet);
router.post('/wallet/add', authUser, walletValidation, postAddMoney);
router.post('/wallet/verify-add', authUser, postVerifyAddMoney);

router.get('/referral', authUser, getReferralPrompt);
router.post('/referral/submit', authUser, referralValidation, postSubmitReferral);

module.exports = router;
