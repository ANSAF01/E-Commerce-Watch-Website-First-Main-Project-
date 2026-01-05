(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initCouponToggle() {
    document.querySelectorAll('.toggle-coupon-switch').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const couponId = this.dataset.id;
        const statusText = this.closest('td')?.querySelector('.status-text');

        const { success, data } = await apiRequest(
          `/admin/coupons/${couponId}/toggle`,
          { method: 'PATCH' }
        );

        if (success) {
          if (statusText) {
            statusText.textContent = data.isActive ? 'Active' : 'Inactive';
          }
          showSuccess(data.message || 'Coupon status updated');
        } else {
          this.checked = !this.checked;
          showError(data?.message || 'Failed to update coupon');
        }
      });
    });
  }

  function initCouponDelete() {
    document.querySelectorAll('.delete-coupon').forEach(btn => {
      btn.addEventListener('click', async function () {
        const couponId = this.dataset.id;
        const result = await confirmAction('Delete Coupon?', 'This action cannot be undone.');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/coupons/${couponId}`,
          { method: 'DELETE' }
        );

        if (success) {
          showSuccess(data.message || 'Coupon deleted');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to delete coupon');
        }
      });
    });
  }

  function init() {
    initCouponToggle();
    initCouponDelete();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
