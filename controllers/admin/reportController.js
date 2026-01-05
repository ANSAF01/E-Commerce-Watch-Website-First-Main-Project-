const Order = require('../../models/Order');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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

const formatDateForDisplay = (date) => (date ? date.toISOString().split('T')[0] : '');

const calculateReportTotals = (orders) => {
    let totalOrders = 0;
    let totalAmount = 0;
    let totalDiscount = 0;

    orders.forEach(order => {
        totalOrders++;
        let refundedAmount = 0;
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                if (item.status === 'CANCELLED' || item.status === 'RETURNED') {
                    const itemPercentage = order.subtotal > 0 ? item.lineTotal / order.subtotal : 0;
                    const itemDiscount = (order.discountTotal || 0) * itemPercentage;
                    refundedAmount += (item.lineTotal - itemDiscount);
                }
            });
        }

        const effectiveTotal = Math.max(0, (order.grandTotal || 0) - refundedAmount);
        order.effectiveTotal = effectiveTotal;

        totalAmount += effectiveTotal;
        totalDiscount += (order.discountTotal || 0);
    });

    return { totalOrders, totalAmount, totalDiscount };
};

const getFilteredOrders = async (from, to, filterType = null) => {
    let filter = {};
    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    if (filterType && !fromDate && !toDate) {
        const range = getDateRange(filterType);
        fromDate = range.startDate;
        toDate = range.endDate;
    }

    if (fromDate && toDate) {
        const adjustedTo = new Date(toDate);
        adjustedTo.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: fromDate, $lte: adjustedTo };
    }

    filter.status = { $nin: ['CANCELLED', 'RETURNED', 'PENDING'] };
    filter.paymentStatus = { $ne: 'FAILED' };

    const orders = await Order.find(filter).populate('userId', 'fullname email').lean();
    return { orders, effectiveFrom: fromDate, effectiveTo: toDate };
};

const getSalesReportData = async (from, to, filterType) => {
    const { orders, effectiveFrom, effectiveTo } = await getFilteredOrders(from, to, filterType);
    const totals = calculateReportTotals(orders);
    const enriched = orders.map(o => ({
        orderId: o.orderId,
        customerName: o.userId?.fullname || 'N/A',
        customerEmail: o.userId?.email || 'N/A',
        date: new Date(o.createdAt).toLocaleDateString(),
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal || 0,
        discount: o.discountTotal || 0,
        grandTotal: (o.effectiveTotal !== undefined ? o.effectiveTotal : o.grandTotal) || 0,
        itemCount: o.items?.length || 0,
    }));

    return {
        success: true,
        totals,
        orders: enriched,
        from: formatDateForDisplay(effectiveFrom || (from ? new Date(from) : null)),
        to: formatDateForDisplay(effectiveTo || (to ? new Date(to) : null)),
    };
};

const generatePDFReport = async (from, to, filterType) => {
    const { orders, effectiveFrom, effectiveTo } = await getFilteredOrders(
        from ? new Date(from) : null,
        to ? new Date(to) : null,
        filterType
    );
    const totals = calculateReportTotals(orders);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.fontSize(24).font('Helvetica-Bold').text('FG-UNITED', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Sales Report', { align: 'center' });
    doc.moveDown(0.5);

    const fromStr = effectiveFrom ? effectiveFrom.toLocaleDateString() : 'N/A';
    const toStr = effectiveTo ? effectiveTo.toLocaleDateString() : 'N/A';
    doc.fontSize(10).text(`Report Period: ${fromStr} to ${toStr}`, { align: 'center' });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Orders: ${totals.totalOrders}`);
    doc.text(`Total Sales: Rs. ${totals.totalAmount.toFixed(2)}`);
    doc.text(`Total Discount: Rs. ${totals.totalDiscount.toFixed(2)}`);
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold');
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 130;
    const col3 = 200;
    const col4 = 280;
    const col5 = 360;
    const col6 = 450;

    doc.text('Order ID', col1, tableTop);
    doc.text('Date', col2, tableTop);
    doc.text('Customer', col3, tableTop);
    doc.text('Items', col4, tableTop);
    doc.text('Amount', col5, tableTop);
    doc.text('Discount', col6, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica');
    orders.forEach(o => {
        const y = doc.y;
        doc.text(o.orderId, col1, y);
        doc.text(new Date(o.createdAt).toLocaleDateString(), col2, y);
        doc.text(o.userId?.fullname || 'N/A', col3, y, { width: 70 });
        doc.text(o.items?.length || 0, col4, y);
        doc.text(`Rs. ${(o.effectiveTotal !== undefined ? o.effectiveTotal : o.grandTotal).toFixed(2)}`, col5, y);
        doc.text(`Rs. ${o.discountTotal.toFixed(2)}`, col6, y);
        doc.moveDown(0.8);
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`TOTAL: Rs. ${totals.totalAmount.toFixed(2)}`, col5, doc.y);

    return { success: true, doc, filename: `sales-${Date.now()}.pdf` };
};

const generateExcelReport = async (from, to, filterType) => {
    const { orders } = await getFilteredOrders(
        from ? new Date(from) : null,
        to ? new Date(to) : null,
        filterType
    );
    const totals = calculateReportTotals(orders);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FG-UNITED';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sales', { views: [{ state: 'normal', showGridLines: true }] });
    sheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Payment Method', key: 'paymentMethod', width: 18 },
        { header: 'Items', key: 'itemCount', width: 8 },
        { header: 'Subtotal', key: 'subtotal', width: 14 },
        { header: 'Discount', key: 'discount', width: 12 },
        { header: 'Grand Total (INR)', key: 'grandTotal', width: 16 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    orders.forEach(o => {
        sheet.addRow({
            orderId: o.orderId || '',
            date: new Date(o.createdAt).toLocaleDateString(),
            customer: o.userId?.fullname || '',
            paymentMethod: o.paymentMethod || '',
            itemCount: o.items?.length || 0,
            subtotal: o.subtotal || 0,
            discount: o.discountTotal || 0,
            grandTotal: (o.effectiveTotal !== undefined ? o.effectiveTotal : o.grandTotal) || 0,
        });
    });

    const currencyFormat = '[$₹-IN]#,##0.00;[Red]-[$₹-IN]#,##0.00';
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        row.getCell('orderId').alignment = { horizontal: 'left' };
        row.getCell('date').alignment = { horizontal: 'center' };
        row.getCell('customer').alignment = { horizontal: 'left' };
        row.getCell('paymentMethod').alignment = { horizontal: 'center' };
        row.getCell('itemCount').alignment = { horizontal: 'center' };
        ['subtotal', 'discount', 'grandTotal'].forEach(key => {
            const col = sheet.getColumn(key);
            col.numFmt = currencyFormat;
        });
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const totalsRow = sheet.addRow({
        orderId: 'Totals',
        grandTotal: totals.totalAmount || 0,
        subtotal: totals.totalAmount || 0,
        discount: totals.totalDiscount || 0,
    });
    totalsRow.font = { bold: true };
    totalsRow.getCell('orderId').alignment = { horizontal: 'right' };
    sheet.getColumn('grandTotal').numFmt = currencyFormat;
    sheet.getColumn('subtotal').numFmt = currencyFormat;
    sheet.getColumn('discount').numFmt = currencyFormat;

    return { success: true, workbook, filename: `sales-${Date.now()}.xlsx` };
};

const getSalesReport = async (req, res, next) => {
    try {
        const { from, to, filterType } = req.query;
        const result = await getSalesReportData(from, to, filterType || '');
        res.render('admin/sales-report', {
            title: 'Sales Report',
            totals: result.totals,
            orders: result.orders || [],
            from: result.from,
            to: result.to,
            filterType: filterType || '',
        });
    } catch (err) {
        next(err);
    }
};

const downloadPDF = async (req, res, next) => {
    try {
        const { from, to, filterType } = req.query;
        const result = await generatePDFReport(from, to, filterType || '');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        result.doc.pipe(res);
        result.doc.end();
    } catch (err) {
        next(err);
    }
};

const downloadExcel = async (req, res, next) => {
    try {
        const { from, to, filterType } = req.query;
        const result = await generateExcelReport(from, to, filterType || '');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        await result.workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        next(err);
    }
};

module.exports = { getSalesReport, downloadPDF, downloadExcel };
