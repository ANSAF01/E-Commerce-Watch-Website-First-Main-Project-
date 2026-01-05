const HttpStatus = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

const globalErrorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);

    let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    let message = err.message || 'Something went wrong';

    if (err.name === 'CastError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid ID format';
    }

    if (err.name === 'ValidationError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    if (err.code === 11000) {
        statusCode = HttpStatus.CONFLICT;
        message = 'Value already exists (Duplicate)';
    }

    if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }

    res.status(statusCode).render('error', {
        title: 'Error',
        message: message
    });
};

module.exports = globalErrorHandler;
