const MongoStore = require('connect-mongo');

const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;  //24 HoUrs

const sessionConfig = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'fg_sid',
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions',
    }),
    cookie: {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
},
};

const adminSessionConfig = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'fg_admin_sid',
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'admin_sessions',
    }),
    cookie: {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
},
};

module.exports = { sessionConfig, adminSessionConfig };
