(function () {
  const { apiRequest, confirmAction, showSuccess, showError, reloadPage } = window.AdminCommon;

  function initReturnApproval() {
    const selector = '.approve-btn, .reject-btn';
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', async function () {
        const returnRequestId = this.dataset.id;
        const isApprove = this.classList.contains('approve-btn');
        const actionText = isApprove ? 'Approve Return?' : 'Reject Return?';
        const confirmText = isApprove ? 'This will process the return request.' : 'This will reject the return request.';

        const result = await confirmAction(actionText, confirmText);
        if (!result.isConfirmed) return;

        const { success, data } = await apiRequest(
          `/admin/returns/${returnRequestId}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({ approve: isApprove })
          }
        );

        if (success) {
          showSuccess(data.message || (isApprove ? 'Return approved' : 'Return rejected'));
          reloadPage();
        } else {
          showError(data?.message || (isApprove ? 'Failed to approve return' : 'Failed to reject return'));
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReturnApproval);
  } else {
    initReturnApproval();
  }
})();
