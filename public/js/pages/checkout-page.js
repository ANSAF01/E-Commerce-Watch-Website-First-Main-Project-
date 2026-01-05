(function () {
  const { api } = window.UserCommon;

  function applyCouponHandler(btn) {
    btn.addEventListener('click', async function () {
      const code = this.dataset.code;
      try {
        const data = await api('POST', '/user/coupon/apply', { couponCode: code });
        if (data.success) {
          Alerts.toast(data.message, 'success');
          setTimeout(() => location.reload(), 500);
        } else {
          Alerts.toast(data.message || 'Failed to apply coupon', 'error');
        }
      } catch (err) {
        Alerts.toast(err.message || 'Error applying coupon', 'error');
      }
    });
  }

  function removeCouponHandler(btn) {
    btn.addEventListener('click', async function () {
      try {
        const data = await api('POST', '/user/coupon/remove');
        if (data.success) {
          Alerts.toast(data.message, 'success');
          setTimeout(() => location.reload(), 500);
        } else {
          Alerts.toast(data.message || 'Failed to remove coupon', 'error');
        }
      } catch (err) {
        Alerts.toast(err.message || 'Error removing coupon', 'error');
      }
    });
  }

  async function placeOrderWithMethod(addressId, paymentMethod, placeOrderBtn, amountForRazorpay) {
    try {
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

      let payload = { addressId, paymentMethod };
      if (paymentMethod === 'cod') payload.paymentMethod = 'COD';
      if (paymentMethod === 'wallet') payload.paymentMethod = 'WALLET';
      if (paymentMethod === 'razorpay') payload.paymentMethod = 'RAZORPAY';

      const data = await api('POST', '/user/orders/create', payload);

      if (!data.success) {
        throw new Error(data.message || 'Failed to place order');
      }

      if (!data.razorpay) {
        return data;
      }

      if (data.razorpay) {
        function handleRazorpayFailure(error) {
          const errorMessage = error?.description || error?.message || 'Payment failed';
          const errorCode = error?.code || 'UNKNOWN';

          if (errorMessage === 'Payment cancelled' || (errorCode === 'BAD_REQUEST_ERROR' && errorMessage.includes('cancelled'))) {
            Alerts.toast('Payment cancelled', 'info');
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = '<i class="fas fa-check me-2"></i>Place Order';
            return;
          }

          Alerts.toast(errorMessage, 'error');

          const params = new URLSearchParams({ error: errorMessage, code: errorCode, orderId: data.orderId });
          setTimeout(() => { window.location.href = `/user/payment-failed?${params.toString()}`; }, 900);
        }

        const options = {
          key: data.key || window.RAZORPAY_KEY,
          amount: data.amount,
          currency: data.currency,
          name: 'FG-UNITED',
          description: 'Order Payment',
          order_id: data.razorpayOrderId,
          handler: async function (response) {
            try {
              const verifyData = await api('POST', '/user/orders/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: data.orderId
              });

              if (verifyData.success) {
                Alerts.toast('Payment successful!', 'success');
                setTimeout(() => { window.location.href = verifyData.redirect; }, 1000);
              } else {
                throw new Error(verifyData.message || 'Payment verification failed');
              }
            } catch (err) {
              Alerts.toast(err.message || 'Payment verification failed', 'error');
              placeOrderBtn.disabled = false;
              placeOrderBtn.innerHTML = '<i class="fas fa-check me-2"></i>Place Order';
            }
          },
          modal: {
            ondismiss: function () {
              Alerts.toast('Payment cancelled', 'info');
              placeOrderBtn.disabled = false;
              placeOrderBtn.innerHTML = '<i class="fas fa-check me-2"></i>Place Order';
            }
          },
          prefill: {
            email: window.CURRENT_USER_EMAIL || ''
          },
          theme: { color: '#82ae46' }
        };

        const rzp = new Razorpay(options);
        rzp.on && rzp.on('payment.failed', function (response) {
          handleRazorpayFailure(response.error || {});
        });
        rzp.open();
        return { success: true, pending: true };
      }
    } catch (err) {
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerHTML = '<i class="fas fa-check me-2"></i>Place Order';
      throw err;
    }
  }

  function addAddressModalHandler() {
    const addAddressForm = document.getElementById('addAddressForm');
    if (!addAddressForm) return;

    addAddressForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      document.querySelectorAll('#addAddressForm .text-danger').forEach(el => el.textContent = '');

      const formData = new FormData(addAddressForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const result = await UserCommon.api('POST', '/user/addresses/add', data);

        if (result.success) {
          const modalElement = document.getElementById('addAddressModal');
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();

          Alerts.toast(result.message || 'Address added successfully!', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (result.errors) {
            Object.keys(result.errors).forEach(field => {
              const errorElement = document.getElementById(`error-${field}`);
              if (errorElement) {
                errorElement.textContent = result.errors[field].msg || result.errors[field];
              }
            });
          } else {
            Alerts.toast(result.message || 'Failed to add address', 'error');
          }
        }
      } catch (error) {
        if (error.payload && error.payload.errors) {
          const errors = error.payload.errors;
          Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(`error-${field}`);
            if (errorElement) {
              errorElement.textContent = errors[field].msg || errors[field];
            }
          });
        } else {
          Alerts.toast(error.message || 'Failed to add address', 'error');
        }
      }
    });
  }

  function init() {
    document.querySelectorAll('.apply-coupon-btn').forEach(applyCouponHandler);
    const removeCouponBtn = document.getElementById('removeCouponBtn');
    if (removeCouponBtn) removeCouponHandler(removeCouponBtn);

    addAddressModalHandler();

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (!placeOrderBtn) return;

    placeOrderBtn.addEventListener('click', async function () {
      const addressId = document.querySelector('input[name="addressId"]:checked')?.value;
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

      if (!addressId) {
        Alerts.toast('Please select a delivery address', 'error');
        return;
      }
      if (!paymentMethod) {
        Alerts.toast('Please select a payment method', 'error');
        return;
      }

      const amountForRazorpay = parseInt(window.CHECKOUT_AMOUNT_CENTS || 0, 10);

      try {
        const res = await placeOrderWithMethod(addressId, paymentMethod, placeOrderBtn, amountForRazorpay);
        if (res && res.success && res.redirect) {
          Alerts.toast(res.message || 'Order placed successfully!', 'success');
          setTimeout(() => { window.location.href = res.redirect; }, 800);
        }
      } catch (err) {
        Alerts.toast(err.message || 'Error processing payment', 'error');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
