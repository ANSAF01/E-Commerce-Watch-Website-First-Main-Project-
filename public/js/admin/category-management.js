(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initCategoryToggle() {
    document.querySelectorAll('.toggle-category-switch').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const categoryId = this.dataset.id;
        const statusText = this.closest('td')?.querySelector('.status-text');

        const { success, data } = await apiRequest(
          `/admin/categories/${categoryId}/toggle-list`,
          { method: 'PATCH' }
        );

        if (success) {
          if (statusText) {
            statusText.textContent = data.isActive ? 'Listed' : 'Unlisted';
          }
          showSuccess(data.message || 'Category status updated');
        } else {
          this.checked = !this.checked;
          showError(data?.message || 'Failed to update category');
        }
      });
    });
  }

  function initCategoryDelete() {
    document.querySelectorAll('.delete-category').forEach(btn => {
      btn.addEventListener('click', async function () {
        const categoryId = this.dataset.id;
        const result = await confirmAction('Delete Category?', 'This action cannot be undone.');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/categories/${categoryId}`,
          { method: 'DELETE' }
        );

        if (success) {
          showSuccess(data.message || 'Category deleted');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to delete category');
        }
      });
    });
  }

  function init() {
    initCategoryToggle();
    initCategoryDelete();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
