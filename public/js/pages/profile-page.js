(function () {
  function init() {
    <% if (locals.message) { %>
      Alerts.toast('<%- message.text %>', '<%- message.type || "info" %>');
    <% } %>

        const copyReferralBtn = document.getElementById('copyReferralBtn');
    if (!copyReferralBtn) return;

    copyReferralBtn.addEventListener('click', async () => {
      const input = document.getElementById('referralCodeInput');
      if (!input) return;
      if (input.value === 'N/A') {
        Alerts.toast('Referral code not available', 'warning');
        return;
      }
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        await navigator.clipboard.writeText(input.value);
        Alerts.toast('Referral code copied to clipboard', 'success');
      } catch (e) {
        Alerts.toast('Failed to copy', 'error');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
