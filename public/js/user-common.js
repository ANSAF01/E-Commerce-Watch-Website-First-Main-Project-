window.UserCommon = (function () {
  const toNumber = (v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  };

  async function api(method, url, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      const err = new Error(data.message || 'Request failed');
      err.payload = data;
      throw err;
    }
    return data;
  }

  function updateRowUI(row, data) {
    if (!row || !data) return;
    const qtyInput = row.querySelector('.js-qty');
    const lineTotalEl = row.querySelector('.js-line-total');
    const decBtn = row.querySelector('.js-dec');
    const incBtn = row.querySelector('.js-inc');

    if (typeof data.quantity === 'number' && qtyInput) {
      qtyInput.value = data.quantity;
    }
    if (typeof data.lineTotal === 'number' && lineTotalEl) {
      lineTotalEl.textContent = '₹' + (data.lineTotal ? data.lineTotal.toFixed(2) : '0.00');
    }
    if (typeof data.disableDec === 'boolean' && decBtn) {
      decBtn.disabled = data.disableDec;
    }
    if (typeof data.disableInc === 'boolean' && incBtn) {
      incBtn.disabled = data.disableInc;
    }
  }

  function updateSubtotalUI(subtotal) {
    const subtotalEl = document.querySelector('.js-subtotal');
    if (subtotalEl) subtotalEl.textContent = '₹' + (subtotal ? subtotal.toFixed(2) : '0.00');
  }

  function onEmptyCart() {
    const tbody = document.querySelector('tbody');
    const table = document.querySelector('table');
    if (tbody && table) {
      table.parentElement.innerHTML = '<div class="alert alert-info">Your cart is empty.</div>';
    }
  }

  function initPasswordToggles() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.js-toggle-password');
      if (btn) {
        const input = btn.previousElementSibling;
        if (input && input.tagName === 'INPUT') {
          if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
          } else {
            input.type = 'password';
            btn.innerHTML = '<i class="fas fa-eye"></i>';
          }
        }
      }
    });
  }

  // Auto init password toggles
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggles);
  } else {
    initPasswordToggles();
  }

  return {
    toNumber,
    api,
    updateRowUI,
    updateSubtotalUI,
    onEmptyCart
  };
})();
