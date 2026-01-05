(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initProductToggle() {
    document.querySelectorAll('.toggle-product-switch').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const productId = this.dataset.id;
        const statusText = this.closest('td')?.querySelector('.status-text');

        const { success, data } = await apiRequest(
          `/admin/products/${productId}/toggle-list`,
          { method: 'PATCH' }
        );

        if (success) {
          if (statusText) {
            statusText.textContent = data.isActive ? 'Listed' : 'Unlisted';
          }
          showSuccess(data.message || 'Product status updated');
        } else {
          this.checked = !this.checked;
          showError(data?.message || 'Failed to update product');
        }
      });
    });
  }

  function initProductDelete() {
    document.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', async function () {
        const productId = this.dataset.id;
        const result = await confirmAction('Delete Product?', 'This action cannot be undone.');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/products/${productId}`,
          { method: 'DELETE' }
        );

        if (success) {
          showSuccess(data.message || 'Product deleted');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to delete product');
        }
      });
    });
  }

  function init() {
    initProductToggle();
    initProductDelete();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
