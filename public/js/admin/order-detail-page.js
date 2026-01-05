document.addEventListener('DOMContentLoaded', function () {
    const updateBtn = document.getElementById('updateStatusBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function () {
            const selectEl = document.getElementById('orderStatus');
            const orderId = selectEl.dataset.orderId;
            const status = selectEl.value;

            try {
                const res = await fetch(`/admin/orders/${orderId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast('Order status updated successfully', 'success');
                    setTimeout(() => location.reload(), 500);
                } else {
                    Alerts.toast(data.message || 'Failed to update status', 'error');
                }
            } catch (err) {
                Alerts.toast('Error updating order status', 'error');
            }
        });
    }
});
