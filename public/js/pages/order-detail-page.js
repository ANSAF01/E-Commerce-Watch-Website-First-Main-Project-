(function () {
  const { api } = window.UserCommon;

  function init() {
    document.querySelectorAll('.cancel-item-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        const itemId = this.dataset.itemId;
        if (!itemId) {
          Alerts.toast('Item ID not found', 'error');
          return;
        }

        Alerts.confirm({
          title: 'Cancel Item?',
          text: 'Are you sure you want to cancel this item?'
        }).then(async result => {
          if (result.isConfirmed) {
            try {
              const data = await api('POST', `/user/orders/${orderId}/items/${itemId}/cancel`, { reason: '' });
              if (data.success) {
                Alerts.toast('Item cancelled successfully', 'success');
                setTimeout(() => location.reload(), 1000);
              } else {
                Alerts.toast(data.message || 'Failed to cancel item', 'error');
              }
            } catch (err) {
              Alerts.toast(err.message || 'Error cancelling item', 'error');
            }
          }
        });
      });
    });

    document.querySelectorAll('.return-item-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        const itemId = this.dataset.itemId;
        if (!itemId) {
          Alerts.toast('Item ID not found', 'error');
          return;
        }

        Alerts.fire({
          title: 'Return Item',
          html: `
            <div class="text-start">
              <label class="form-label fw-semibold mb-2">Reason for Return (Required)</label>
              <textarea 
                id="returnReason" 
                class="form-control" 
                placeholder="Please explain why you want to return this item..."
                rows="4"
                style="resize: vertical;"
              ></textarea>
              <small class="text-muted d-block mt-2">
                <i class="fas fa-info-circle me-1"></i>
                Admin will review your request and approve/reject within 24 hours
              </small>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Submit Return Request',
          cancelButtonText: 'Cancel',
          didOpen: () => { document.getElementById('returnReason').focus(); },
          preConfirm: () => {
            const reason = document.getElementById('returnReason').value.trim();
            if (!reason) {
              Alerts.showValidationMessage('Please provide a reason for return');
              return false;
            }
            if (reason.length < 10) {
              Alerts.showValidationMessage('Reason must be at least 10 characters');
              return false;
            }
            return reason;
          }
        }).then(async result => {
          if (result.isConfirmed && result.value) {
            try {
              const data = await api('POST', `/user/orders/${orderId}/items/${itemId}/return`, { reason: result.value });
              if (data.success) {
                Alerts.toast('Return request submitted successfully. Awaiting admin approval.', 'success');
                setTimeout(() => location.reload(), 1500);
              } else {
                Alerts.toast(data.message || 'Failed to submit return request', 'error');
              }
            } catch (err) {
              Alerts.toast(err.message || 'Error submitting return request', 'error');
            }
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
