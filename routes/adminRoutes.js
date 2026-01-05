const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/authAdmin');
const { redirectIfAdminLoggedIn } = require('../middleware/redirectIfLoggedIn');
const { upload } = require('../middleware/upload');
const {
    adminLoginValidation,
    categoryValidation,
    productValidation,
    couponValidation,
    couponEditValidation,
    productOfferValidation,
    categoryOfferValidation
} = require('../utils/validation');

const {
    getAdminLogin,
    postAdminLogin,
    getAdminLogout,
    getDashboard,
    getChartData
} = require('../controllers/admin/adminController');

const { getUsers, patchToggleBlock } = require('../controllers/admin/userController');
const {
    getCategories,
    getAddCategory,
    postAddCategory,
    getEditCategory,
    postEditCategory,
    patchToggleList: patchToggleCategoryList,
    deleteCategory
} = require('../controllers/admin/categoryController');

const {
    getProducts,
    getAddProduct,
    postAddProduct,
    getEditProduct,
    postEditProduct,
    patchToggleList: patchToggleProductList,
    deleteProduct
} = require('../controllers/admin/productController');

const { getInventory, patchUpdateStock } = require('../controllers/admin/inventoryController');
const { getOrders, getOrderDetail, patchStatus, postApproveReturn, getPendingReturns } = require('../controllers/admin/orderController');
const {
    getOffers,
    postProductOffer,
    postCategoryOffer,
    toggleProductOffer,
    toggleCategoryOffer,
    deleteProductOffer,
    deleteCategoryOffer,
    patchEditProductOffer,
    patchEditCategoryOffer
} = require('../controllers/admin/offerController');

const {
    getCoupons,
    postAddCoupon,
    deleteCoupon,
    patchToggleCoupon,
    getEditCoupon,
    postEditCoupon
} = require('../controllers/admin/couponController');

const { getSalesReport, downloadPDF, downloadExcel } = require('../controllers/admin/reportController');

router.get('/login', redirectIfAdminLoggedIn, getAdminLogin);
router.post('/login', redirectIfAdminLoggedIn, adminLoginValidation, postAdminLogin);
router.get('/logout', getAdminLogout);

router.get('/', authAdmin, getDashboard);
router.get('/dashboard', authAdmin, getDashboard);
router.get('/chart-data', authAdmin, getChartData);

router.get('/users', authAdmin, getUsers);
router.patch('/users/:id/toggle-block', authAdmin, patchToggleBlock);

router.get('/categories', authAdmin, getCategories);
router.get('/categories/add', authAdmin, getAddCategory);
router.post('/categories/add', authAdmin, categoryValidation, postAddCategory);
router.get('/categories/edit/:id', authAdmin, getEditCategory);
router.post('/categories/edit/:id', authAdmin, categoryValidation, postEditCategory);
router.patch('/categories/:id/toggle-list', authAdmin, patchToggleCategoryList);
router.delete('/categories/:id', authAdmin, deleteCategory);

router.get('/products', authAdmin, getProducts);
router.get('/products/add', authAdmin, getAddProduct);
router.post('/products/add', authAdmin, upload.array('images', 3), productValidation, postAddProduct);
router.get('/products/edit/:id', authAdmin, getEditProduct);
router.post('/products/edit/:id', authAdmin, upload.array('images', 3), productValidation, postEditProduct);
router.patch('/products/:id/toggle-list', authAdmin, patchToggleProductList);
router.delete('/products/:id', authAdmin, deleteProduct);

router.get('/inventory', authAdmin, getInventory);
router.patch('/inventory/:productId/update-stock', authAdmin, patchUpdateStock);

router.get('/orders', authAdmin, getOrders);
router.get('/orders/:id', authAdmin, getOrderDetail);
router.patch('/orders/:id/status', authAdmin, patchStatus);

router.get('/returns', authAdmin, getPendingReturns);
router.post('/returns/:returnRequestId/approve', authAdmin, postApproveReturn);

router.get('/offers', authAdmin, getOffers);
router.post('/offers/product', authAdmin, productOfferValidation, postProductOffer);
router.post('/offers/category', authAdmin, categoryOfferValidation, postCategoryOffer);
router.patch('/offers/product/:productId/toggle', authAdmin, toggleProductOffer);
router.patch('/offers/category/:categoryId/toggle', authAdmin, toggleCategoryOffer);
router.delete('/offers/product/:productId', authAdmin, deleteProductOffer);
router.delete('/offers/category/:categoryId', authAdmin, deleteCategoryOffer);
router.patch('/offers/product/:productId/edit', authAdmin, patchEditProductOffer);
router.patch('/offers/category/:categoryId/edit', authAdmin, patchEditCategoryOffer);

router.get('/coupons', authAdmin, getCoupons);
router.post('/coupons/add', authAdmin, couponValidation, postAddCoupon);
router.delete('/coupons/:id', authAdmin, deleteCoupon);
router.patch('/coupons/:id/toggle', authAdmin, patchToggleCoupon);
router.get('/coupons/edit/:id', authAdmin, getEditCoupon);
router.post('/coupons/edit/:id', authAdmin, couponEditValidation, postEditCoupon);

router.get('/sales-report', authAdmin, getSalesReport);
router.get('/sales-report/pdf', authAdmin, downloadPDF);
router.get('/sales-report/excel', authAdmin, downloadExcel);

module.exports = router;
