window.AdminCommon = (function () {
  async function apiRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function confirmAction(title = 'Are you sure?', text = '') {
    return await Alerts.confirm({ title, text });
  }

  function showSuccess(message) {
    Alerts.toast(message, 'success');
  }

  function showError(message) {
    Alerts.toast(message, 'error');
  }

  function reloadPage(delay = 500) {
    setTimeout(() => location.reload(), delay);
  }

  // Sidebar Logout
  function initSidebarLogout() {
    const logoutForm = document.querySelector('form[action="/admin/logout"]');
    if (!logoutForm) return;

    logoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      confirmAction('Logout?', 'You will be signed out of your admin account.').then(result => {
        if (result.isConfirmed) this.submit();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarLogout);
  } else {
    initSidebarLogout();
  }

  return {
    apiRequest,
    confirmAction,
    showSuccess,
    showError,
    reloadPage
  };
})();
