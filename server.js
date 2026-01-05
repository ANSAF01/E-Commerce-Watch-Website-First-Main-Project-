require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const flash = require('connect-flash');
const connectDB = require('./config/database');
const { sessionConfig, adminSessionConfig } = require('./config/session');
const noCache = require('./middleware/noCache');

require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(noCache);

app.use('/admin', session(adminSessionConfig));
app.use('/', session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.user = req.session?.user || null;
    res.locals.admin = req.session?.admin || null;
    res.locals.isUserLoggedIn = !!req.session?.user;
    res.locals.isAdminLoggedIn = !!req.session?.admin;
    next();
});

app.use(require('./middleware/userInfo'));

app.use('/admin', require('./routes/adminRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/', require('./routes/shopRoutes'));

app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you requested does not exist.',
    });
});

app.use(require('./middleware/errorHandler'));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
