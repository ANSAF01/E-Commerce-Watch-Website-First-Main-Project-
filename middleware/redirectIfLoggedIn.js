const redirectIfUserLoggedIn = (req, res, next) => {
    if (req.session?.user) {
        return res.redirect('/');
    }
    next();
};

const redirectIfAdminLoggedIn = (req, res, next) => {
    if (req.session?.admin) {
        return res.redirect('/admin');
    }
    next();
};

module.exports = { redirectIfUserLoggedIn, redirectIfAdminLoggedIn };
