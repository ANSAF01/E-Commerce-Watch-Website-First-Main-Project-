(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initUserToggle() {
    document.querySelectorAll('.toggle-user').forEach(btn => {
      btn.addEventListener('click', async function () {
        const userId = this.dataset.id;
        const result = await confirmAction('Confirm Action', 'Are you sure?');

        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/users/${userId}/toggle-block`,
          { method: 'PATCH' }
        );

        if (success) {
          showSuccess(data.message || 'User status updated');
          reloadPage();
        } else {
          showError(data?.message || 'Failed to update user');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserToggle);
  } else {
    initUserToggle();
  }
})();
