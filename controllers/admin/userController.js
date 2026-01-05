const User = require('../../models/User');
const { calculatePagination } = require('../../utils/pagination');

const USERS_PER_PAGE = 5;

const getUsers = async (req, res, next) => {
    try {
        const page = req.query.page;
        const search = req.query.search;
        const { pageNum, skip } = calculatePagination(page, USERS_PER_PAGE);
        const searchQuery = search || '';

        const filter = { isAdmin: false };
        if (searchQuery) {
            filter.fullname = { $regex: searchQuery, $options: 'i' };
        }

        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(USERS_PER_PAGE)
            .lean();

        res.render('admin/user-management', {
            title: 'User Management',
            users,
            pagination: { currentPage: pageNum, totalItems: total, limit: USERS_PER_PAGE },
            search: searchQuery,
        });
    } catch (err) {
        next(err);
    }
};

const patchToggleBlock = async (req, res, next) => {
    try {
        const { id: userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        const message = user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully';
        res.json({ success: true, isBlocked: user.isBlocked, message });
    } catch (err) {
        next(err);
    }
};

module.exports = { getUsers, patchToggleBlock };
