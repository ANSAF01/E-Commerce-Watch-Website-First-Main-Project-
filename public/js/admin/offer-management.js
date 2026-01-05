(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initOfferToggle() {
    document.querySelectorAll('.toggle-product-offer-switch').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const productId = this.dataset.productId;
        const statusText = this.closest('td')?.querySelector('.status-text');

        const { success, data } = await apiRequest(
          `/admin/offers/product/${productId}/toggle`,
          { method: 'PATCH' }
        );

        if (success) {
          if (statusText) {
            statusText.textContent = data.isActive ? 'Active' : 'Inactive';
          }
          showSuccess(data.message || 'Offer status updated');
        } else {
          this.checked = !this.checked;
          showError(data?.message || 'Failed to update offer');
        }
      });
    });

    document.querySelectorAll('.toggle-category-offer-switch').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const categoryId = this.dataset.categoryId;
        const statusText = this.closest('td')?.querySelector('.status-text');

        const { success, data } = await apiRequest(
          `/admin/offers/category/${categoryId}/toggle`,
          { method: 'PATCH' }
        );

        if (success) {
          if (statusText) {
            statusText.textContent = data.isActive ? 'Active' : 'Inactive';
          }
          showSuccess(data.message || 'Offer status updated');
        } else {
          this.checked = !this.checked;
          showError(data?.message || 'Failed to update offer');
        }
      });
    });
  }

  function initOfferDelete() {
    document.querySelectorAll('.delete-offer-product').forEach(btn => {
      btn.addEventListener('click', async function () {
        const productId = this.dataset.id;
        const result = await confirmAction('Delete Offer?', 'This action cannot be undone.');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/offers/product/${productId}`,
          { method: 'DELETE' }
        );

        if (success) {
          showSuccess(data.message || 'Offer deleted');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to delete offer');
        }
      });
    });

    document.querySelectorAll('.delete-offer-category').forEach(btn => {
      btn.addEventListener('click', async function () {
        const categoryId = this.dataset.id;
        const result = await confirmAction('Delete Offer?', 'This action cannot be undone.');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/offers/category/${categoryId}`,
          { method: 'DELETE' }
        );

        if (success) {
          showSuccess(data.message || 'Offer deleted');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to delete offer');
        }
      });
    });
  }

  function init() {
    initOfferToggle();
    initOfferDelete();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
