const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Order = require('../../models/Order');

const getAdminLogin = (req, res) => {
    res.render('admin/login', { title: 'Admin Login', errors: {}, error: null });
};

const postAdminLogin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('admin/login', { title: 'Admin Login', errors: errors.mapped(), error: null });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('admin/login', {
                title: 'Admin Login',
                errors: {},
                error: 'Email and password are required',
            });
        }

        const user = await User.findOne({ email });

        if (!user || !user.isAdmin) {
            return res.render('admin/login', { title: 'Admin Login', errors: {}, error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render('admin/login', { title: 'Admin Login', errors: {}, error: 'Invalid credentials' });
        }

        req.session.admin = {
            _id: user._id,
            email: user.email,
            fullname: user.fullname,
            isAdmin: user.isAdmin,
        };

        res.redirect('/admin');
    } catch (err) {
        next(err);
    }
};

const getAdminLogout = (req, res) => {
    if (req.session) {
        req.session.admin = null;
        if (!req.session.user) {
            return req.session.destroy(() => {
                res.clearCookie('fg_admin_sid');
                res.redirect('/admin/login');
            });
        }
        return res.redirect('/admin/login');
    }
    res.clearCookie('fg_admin_sid');
    res.redirect('/admin/login');
};

const getDateRange = (filterType) => {
    const now = new Date();
    let startDate;

    switch (filterType) {
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'quarterly': {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        }
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'weekly': {
            const day = now.getDate() - now.getDay();
            startDate = new Date(now.setDate(day));
            break;
        }
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate: new Date() };
};

const getSalesChartData = async (filterType = 'monthly') => {
    const { startDate, endDate } = getDateRange(filterType);
    const orders = await Order.find({
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const chartData = [];
    let current = new Date(startDate);

    while (current <= endDate) {
        let label, nextDate;

        if (filterType === 'daily') {
            label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            nextDate = new Date(current);
            nextDate.setDate(nextDate.getDate() + 1);
        } else if (filterType === 'weekly') {
            label = `Week ${Math.ceil(current.getDate() / 7)}`;
            nextDate = new Date(current);
            nextDate.setDate(nextDate.getDate() + 7);
        } else {
            label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            nextDate = new Date(current);
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(1);
        }

        let intervalEnd = new Date(nextDate);
        intervalEnd.setMilliseconds(-1);

        const periodOrders = orders.filter(o => o.createdAt >= current && o.createdAt <= intervalEnd);
        chartData.push({
            label,
            sales: Math.round(periodOrders.reduce((s, o) => s + (o.grandTotal || 0), 0)),
            orders: periodOrders.length,
        });

        current = nextDate;
    }

    return chartData;
};

const getTopSellingProducts = async (limit = 10) => {
    const orders = await Order.find({ status: 'DELIVERED', paymentStatus: 'PAID' }).lean();
    const productSales = {};

    orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                const pid = item.productId.toString();
                if (!productSales[pid]) {
                    productSales[pid] = {
                        productId: item.productId,
                        name: item.name,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        image: item.image,
                    };
                }
                productSales[pid].totalQuantity += item.quantity;
                productSales[pid].totalRevenue += item.lineTotal;
            });
        }
    });

    return Object.values(productSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit)
        .map(p => ({ ...p, totalRevenue: Math.round(p.totalRevenue) }));
};

const getTopSellingCategories = async (limit = 10) => {
    const orders = await Order.find({ status: 'DELIVERED', paymentStatus: 'PAID' })
        .populate('items.productId', 'category')
        .lean();

    const catSales = {};

    orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                if (item.productId?.category) {
                    const cid = item.productId.category.toString();
                    if (!catSales[cid]) {
                        catSales[cid] = { categoryId: item.productId.category, totalQuantity: 0, totalRevenue: 0 };
                    }
                    catSales[cid].totalQuantity += item.quantity;
                    catSales[cid].totalRevenue += item.lineTotal;
                }
            });
        }
    });

    return await Promise.all(
        Object.values(catSales)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, limit)
            .map(async c => {
                const cat = await Category.findById(c.categoryId).lean();
                return { ...c, categoryName: cat?.name || 'Unknown', totalRevenue: Math.round(c.totalRevenue) };
            })
    );
};

const getDashboardMetrics = async () => {
    const [userCount, productCount, categoryCount, orderCount] = await Promise.all([
        User.countDocuments({ isAdmin: false }),
        Product.countDocuments({ isDeleted: false }),
        Category.countDocuments({ isDeleted: false }),
        Order.countDocuments(),
    ]);

    const latestOrders = await Order.find()
        .populate('userId', 'fullname email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return {
        metrics: { userCount, productCount, categoryCount, orderCount },
        latestOrders: latestOrders.map(o => ({
            ...o,
            displayGrandTotal: Math.round(o.grandTotal),
            displayDate: new Date(o.createdAt).toLocaleDateString(),
        })),
    };
};

const getDashboard = async (req, res, next) => {
    try {
        const dashboardData = await getDashboardMetrics();
        const chartData = await getSalesChartData('monthly');
        const topProducts = await getTopSellingProducts(10);
        const topCategories = await getTopSellingCategories(10);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            metrics: dashboardData.metrics,
            latestOrders: dashboardData.latestOrders,
            chartData: JSON.stringify(chartData),
            topProducts,
            topCategories,
            currentFilter: 'monthly',
        });
    } catch (err) {
        next(err);
    }
};

const getChartData = async (req, res, next) => {
    try {
        const { filter } = req.query;
        const filterType = filter || 'monthly';
        const chartData = await getSalesChartData(filterType);
        res.json({ success: true, data: chartData });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAdminLogin,
    postAdminLogin,
    getAdminLogout,
    getDashboard,
    getChartData,
};
