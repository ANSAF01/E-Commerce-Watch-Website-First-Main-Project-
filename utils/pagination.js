const calculatePagination = (page, limit) => {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * limit;
    return { pageNum, skip };
};

module.exports = { calculatePagination };
