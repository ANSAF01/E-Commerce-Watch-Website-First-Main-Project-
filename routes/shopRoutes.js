const express = require('express');
const router = express.Router();
const { getHome, getShop, getProductDetail, getAbout } = require('../controllers/user/shopController');

router.get('/', getHome);
router.get('/shop', getShop);
router.get('/about', getAbout);
router.get('/product/:id', getProductDetail);

module.exports = router;
