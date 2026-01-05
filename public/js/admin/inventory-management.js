(function () {
  const { apiRequest, showSuccess, showError } = window.AdminCommon;

  function initInventoryStock() {
    document.querySelectorAll('.update-stock').forEach(btn => {
      btn.addEventListener('click', async function () {
        const productId = this.dataset.id;
        const stockInput = document.querySelector(`.stock-input[data-id="${productId}"]`);
        const stock = parseInt(stockInput.value);

        if (isNaN(stock) || stock < 0) {
          showError('Please enter a valid stock quantity');
          return;
        }

        const { success, data } = await apiRequest(
          `/admin/inventory/${productId}/update-stock`,
          {
            method: 'PATCH',
            body: JSON.stringify({ stock })
          }
        );

        if (success) {
          showSuccess(data.message || 'Stock updated successfully');
        } else {
          showError(data?.message || 'Failed to update stock');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInventoryStock);
  } else {
    initInventoryStock();
  }
})();
