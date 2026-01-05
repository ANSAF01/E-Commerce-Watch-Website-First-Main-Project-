const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');
const sharp = require('sharp');
const path = require('path');

const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|webp/;
const IMAGE_QUALITY = 80;
const CLOUDINARY_FOLDER_PRODUCTS = 'fg-united/products';
const CLOUDINARY_FOLDER_PROFILES = 'fg-united/profiles';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const extname = ALLOWED_IMAGE_TYPES.test(path.extname(file.originalname).toLowerCase());
    const mimetype = ALLOWED_IMAGE_TYPES.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    }

    cb(new Error('Invalid file format. Only JPG, PNG, and WEBP allowed.'));
};

const upload = multer({ storage, fileFilter });

const processAndUploadImage = async (buffer, folder) => {
    const processedBuffer = await sharp(buffer).jpeg({ quality: IMAGE_QUALITY }).toBuffer();
    const result = await uploadToCloudinary(processedBuffer, folder);
    return result.secure_url;
};

const uploadProductImages = async (files) => {
    const uploadPromises = files.map(file => processAndUploadImage(file.buffer, CLOUDINARY_FOLDER_PRODUCTS));
    return await Promise.all(uploadPromises);
};

const uploadProfileImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const url = await processAndUploadImage(req.file.buffer, CLOUDINARY_FOLDER_PROFILES);
        req.file.path = url;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { upload, uploadProductImages, uploadProfileImage };
