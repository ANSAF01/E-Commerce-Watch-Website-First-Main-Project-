const { body } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Coupon = require('../models/Coupon');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const INDIAN_PHONE_REGEX = /^[6-9][0-9]{9}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
const COUPON_CODE_REGEX = /^[A-Z0-9]+$/;

const isOnlyWhitespace = (str) => !str || /^\s+$/.test(str);
const isAllZeros = (str) => /^0+$/.test(str);
const isRepeatedDigit = (str) => /^(\d)\1{9}$/.test(str);
const isForbiddenSequence = (str) => ['1234567890', '0123456789', '9876543210'].includes(str);

const validatePhoneNumber = (value) => {
    if (!value) return true;
    if (isAllZeros(value)) throw new Error('Phone number cannot be all zeros');
    if (isRepeatedDigit(value)) throw new Error('Phone number cannot be the same digit repeated');
    if (isForbiddenSequence(value)) throw new Error('Phone number appears invalid');
    return true;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const signupValidation = [
    body('fullname')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .custom(value => !isOnlyWhitespace(value)).withMessage('Full name cannot be only spaces')
        .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters')
        .matches(NAME_REGEX).withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
        .custom(async (value) => {
            const existing = await User.findOne({ email: value.toLowerCase() });
            if (existing) {
                throw new Error('Email already exists');
            }
            return true;
        }),
    body('mobile')
        .optional({ checkFalsy: true })
        .trim()
        .custom(validatePhoneNumber)
        .matches(INDIAN_PHONE_REGEX).withMessage('Mobile must be 10 digits starting with 6-9'),
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .isLength({ max: 50 }).withMessage('Password must not exceed 50 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)'),
    body('confirmPassword')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

const adminLoginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
];

const resetPasswordValidation = [
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
];

const otpValidation = [
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must be numeric')
];

const emailOnlyValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
];

const walletValidation = [
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isInt({ min: 1, max: 100000 }).withMessage('Amount must be between 1 and 100,000')
];

const referralValidation = [
    body('referralCode')
        .trim()
        .optional({ checkFalsy: true })
        .isLength({ min: 5 }).withMessage('Referral code too short')
];

const categoryValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters')
        .custom(async (value, { req }) => {
            const escapedName = escapeRegex(value.trim());
            const query = {
                name: { $regex: `^${escapedName}$`, $options: 'i' },
                isDeleted: false
            };
            if (req.params.id) {
                query._id = { $ne: req.params.id };
            }
            const existing = await Category.findOne(query);
            if (existing) {
                throw new Error('Category name already exists');
            }
            return true;
        }),
    body('description')
        .trim()
        .optional()
        .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
];

const productValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 2, max: 150 }).withMessage('Product name must be between 2 and 150 characters')
        .custom(async (value, { req }) => {
            const escapedName = escapeRegex(value.trim());
            const query = {
                name: { $regex: `^${escapedName}$`, $options: 'i' },
                isDeleted: false
            };
            if (req.params.id) {
                query._id = { $ne: req.params.id };
            }
            const existing = await Product.findOne(query);
            if (existing) {
                throw new Error('Product name already exists');
            }
            return true;
        }),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock')
        .notEmpty().withMessage('Stock is required')
        .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('category')
        .notEmpty().withMessage('Category is required'),
    body('images').custom((value, { req }) => {
        const files = req.files || [];

        if (!req.params.id) {
            if (files.length < 3) {
                throw new Error('Please upload exactly 3 images');
            }
            if (files.length > 3) {
                throw new Error('You can upload a maximum of 3 images');
            }
        }

        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                throw new Error('Only JPEG, JPG, PNG, and WEBP images are allowed');
            }
        }

        return true;
    })
];

const profileValidation = [
    body('fullname')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .custom(value => !isOnlyWhitespace(value)).withMessage('Full name cannot be only spaces')
        .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters')
        .matches(NAME_REGEX).withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
    body('mobile')
        .optional({ checkFalsy: true })
        .trim()
        .custom(validatePhoneNumber)
        .matches(INDIAN_PHONE_REGEX).withMessage('Mobile must be 10 digits starting with 6-9')
];

const passwordChangeValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match')
];

const addressValidation = [
    body('address')
        .trim()
        .notEmpty().withMessage('Address is required')
        .isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
    body('district')
        .trim()
        .notEmpty().withMessage('District is required')
        .isLength({ min: 2 }).withMessage('District must be at least 2 characters'),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required')
        .isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required')
        .isLength({ min: 2 }).withMessage('State must be at least 2 characters'),
    body('pincode')
        .trim()
        .matches(PINCODE_REGEX).withMessage('Pincode must be exactly 6 digits'),
    body('landmark')
        .trim()
        .optional()
];

const orderCancelValidation = [
    body('reason')
        .trim()
        .optional()
        .isLength({ min: 5 }).withMessage('Reason must be at least 5 characters if provided')
];

const orderReturnValidation = [
    body('reason')
        .trim()
        .notEmpty().withMessage('Return reason is required')
        .isLength({ min: 5 }).withMessage('Reason must be at least 5 characters')
        .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

const couponValidation = [
    body('code')
        .trim()
        .notEmpty().withMessage('Coupon code is required')
        .isLength({ min: 3, max: 20 }).withMessage('Code must be between 3 and 20 characters')
        .matches(COUPON_CODE_REGEX).withMessage('Code must contain only uppercase letters and numbers')
        .custom(async (value, { req }) => {
            const upperCode = value.toUpperCase().trim();
            const query = { code: upperCode };
            if (req.params.id) {
                query._id = { $ne: req.params.id };
            }
            const existing = await Coupon.findOne(query);
            if (existing) {
                throw new Error('Coupon code already exists');
            }
            return true;
        }),
    body('type')
        .notEmpty().withMessage('Discount type is required')
        .isIn(['FLAT', 'PERCENT']).withMessage('Type must be either FLAT or PERCENT'),
    body('discountValue')
        .notEmpty().withMessage('Discount value is required')
        .isFloat({ gt: 0 }).withMessage('Discount value must be greater than 0'),
    body('maxDiscount')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Max discount must be a positive number'),
    body('minPurchase')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Minimum purchase must be a positive number')
];

const couponEditValidation = [
    body('discountValue')
        .notEmpty().withMessage('Discount value is required')
        .isFloat({ gt: 0 }).withMessage('Discount value must be greater than 0'),
    body('maxDiscount')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Max discount must be a positive number'),
    body('minPurchase')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Minimum purchase must be a positive number'),
    body('expiresAt')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Expiry date must be a valid date')
];

const productOfferValidation = [
    body('productId')
        .notEmpty().withMessage('Product is required'),
    body('percent')
        .notEmpty().withMessage('Offer percentage is required')
        .isFloat({ min: 1, max: 99 }).withMessage('Percentage must be between 1 and 99'),
    body('startAt')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Start date must be a valid date'),
    body('endAt')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('End date must be a valid date')
        .custom((value, { req }) => {
            if (req.body.startAt && value < req.body.startAt) {
                throw new Error('End date must be after start date');
            }
            return true;
        })
];

const categoryOfferValidation = [
    body('categoryId')
        .notEmpty().withMessage('Category is required'),
    body('percent')
        .notEmpty().withMessage('Offer percentage is required')
        .isFloat({ min: 1, max: 99 }).withMessage('Percentage must be between 1 and 99'),
    body('startAt')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Start date must be a valid date'),
    body('endAt')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('End date must be a valid date')
        .custom((value, { req }) => {
            if (req.body.startAt && value < req.body.startAt) {
                throw new Error('End date must be after start date');
            }
            return true;
        })
];

module.exports = {
    signupValidation,
    loginValidation,
    adminLoginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    otpValidation,
    emailOnlyValidation,
    walletValidation,
    referralValidation,
    categoryValidation,
    productValidation,
    profileValidation,
    passwordChangeValidation,
    addressValidation,
    orderCancelValidation,
    orderReturnValidation,
    couponValidation,
    couponEditValidation,
    productOfferValidation,
    categoryOfferValidation
};
