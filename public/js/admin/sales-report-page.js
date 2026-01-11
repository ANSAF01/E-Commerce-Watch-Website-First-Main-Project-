function handleQuickFilter(filterType) {
    if (filterType) {
        document.getElementById('filterTypeInput').value = filterType;
        document.getElementById('fromDate').disabled = true;
        document.getElementById('toDate').disabled = true;
        document.getElementById('filterForm').submit();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');

    if (fromDateInput && toDateInput) {
        const today = new Date().toISOString().split('T')[0];
        fromDateInput.setAttribute('max', today);
        toDateInput.setAttribute('max', today);

        fromDateInput.addEventListener('change', function () {
            if (this.value) {
                toDateInput.setAttribute('min', this.value);
                if (toDateInput.value && toDateInput.value < this.value) {
                    toDateInput.value = this.value;
                }
            }
        });

        toDateInput.addEventListener('change', function () {
            if (this.value) {
                fromDateInput.setAttribute('max', this.value);
                if (fromDateInput.value && fromDateInput.value > this.value) {
                    fromDateInput.value = this.value;
                }
            }
        });
    }
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function () {
            const from = document.getElementById('fromDate').value;
            const to = document.getElementById('toDate').value;
            const filterType = document.getElementById('filterTypeInput').value;
            if (from && to) {
                window.location.href = `/admin/sales-report/pdf?from=${from}&to=${to}`;
                return;
            }
            if (filterType) {
                window.location.href = `/admin/sales-report/pdf?filterType=${encodeURIComponent(filterType)}`;
                return;
            }
            Alerts.toast('Please select a date range or a quick filter', 'warning');
        });
    }

    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', function () {
            const from = document.getElementById('fromDate').value;
            const to = document.getElementById('toDate').value;
            const filterType = document.getElementById('filterTypeInput').value;
            if (from && to) {
                window.location.href = `/admin/sales-report/excel?from=${from}&to=${to}`;
                return;
            }
            if (filterType) {
                window.location.href = `/admin/sales-report/excel?filterType=${encodeURIComponent(filterType)}`;
                return;
            }
            Alerts.toast('Please select a date range or a quick filter', 'warning');
        });
    }

    // Expose handleQuickFilter to global scope if needed by onchange attribute, 
    // BUT better to refactor onchange to event listener.
    // The EJS has `onchange="handleQuickFilter(this.value)"`.
    // So we must expose it to window.
    window.handleQuickFilter = handleQuickFilter;
});
