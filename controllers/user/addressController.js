const { validationResult } = require('express-validator');
const Address = require('../../models/Address');

const getAddresses = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const addresses = await Address.find({ userId, isDeleted: false }).lean();
        res.render('user/addresses', { title: 'My Addresses', addresses, errors: {} });
    } catch (err) {
        next(err);
    }
};

const postAddAddress = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const existingCount = await Address.countDocuments({ userId, isDeleted: false });
        const isFirstAddress = existingCount === 0;

        const address = new Address({ ...req.body, userId, isDefault: isFirstAddress });
        await address.save();

        res.json({ success: true, message: 'Address saved successfully', address });
    } catch (err) {
        next(err);
    }
};

const getAddressOrThrow = async (addressId, userId) => {
    const address = await Address.findOne({ _id: addressId, userId, isDeleted: false }).lean();
    if (!address) {
        const error = new Error('Address not found');
        error.statusCode = 404;
        throw error;
    }
    return address;
};

const getEditAddress = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;
        const address = await getAddressOrThrow(addressId, userId);
        res.render('user/edit-address', { title: 'Edit Address', address, errors: {} });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.redirect('/user/addresses');
        }
        next(err);
    }
};

const postEditAddress = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;
        const address = await Address.findOne({ _id: addressId, userId, isDeleted: false }).lean();
        return res.render('user/edit-address', { title: 'Edit Address', address, errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;
        const updated = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            { ...req.body },
            { new: true }
        );

        if (!updated) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        res.redirect('/user/addresses');
    } catch (err) {
        next(err);
    }
};

const patchEditAddress = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ success: false, errors: errors.mapped() });
    }

    try {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;
        const updated = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            { ...req.body },
            { new: true }
        );

        if (!updated) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, message: 'Address updated successfully', address: updated });
    } catch (err) {
        next(err);
    }
};

const deleteAddress = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;
        const deleted = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            { isDeleted: true, deletedAt: new Date() }
        );

        if (!deleted) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (err) {
        next(err);
    }
};

const patchDefaultAddress = async (req, res, next) => {
    try {
        const { _id: userId } = req.session.user;
        const { id: addressId } = req.params;

        await Address.updateMany({ userId }, { isDefault: false });
        await Address.findByIdAndUpdate(addressId, { isDefault: true });

        res.json({ success: true, message: 'Default address updated' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAddresses,
    postAddAddress,
    getEditAddress,
    postEditAddress,
    patchEditAddress,
    deleteAddress,
    patchDefaultAddress,
};
