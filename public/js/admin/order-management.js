(function () {
  const { apiRequest, confirmAction, showSuccess, showError } = window.AdminCommon;

  function initOrderStatusUpdate() {
    document.querySelectorAll('.update-order-status').forEach(select => {
      select.addEventListener('change', async function () {
        const orderId = this.dataset.id;
        const newStatus = this.value;
        const result = await confirmAction('Update Order Status?', `Change status to ${newStatus}?`);

        if (!result.isConfirmed) {
          this.value = this.dataset.currentStatus;
          return;
        }

        const { success, data } = await apiRequest(
          `/admin/orders/${orderId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
          }
        );

        if (success) {
          showSuccess(data.message || 'Order status updated');
          this.dataset.currentStatus = newStatus;
        } else {
          this.value = this.dataset.currentStatus;
          showError(data?.message || 'Failed to update order status');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrderStatusUpdate);
  } else {
    initOrderStatusUpdate();
  }
})();
