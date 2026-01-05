(function () {
    const { api } = window.UserCommon;

    async function retryPaymentHandler(btn) {
        const orderId = btn.dataset.orderId;
        if (!orderId) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

            const data = await api('POST', '/user/payment/retry', { orderId });

            if (!data.success) {
                throw new Error(data.message || 'Failed to initiate retry');
            }

            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: data.name,
                description: data.description,
                order_id: data.order_id, // Razorpay Order ID
                handler: async function (response) {
                    try {
                        const verifyData = await api('POST', '/user/orders/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: data.orderId // Our DB Order ID
                        });

                        if (verifyData.success) {
                            Alerts.toast('Payment successful!', 'success');
                            setTimeout(() => { window.location.href = verifyData.redirect; }, 1000);
                        } else {
                            throw new Error(verifyData.message || 'Payment verification failed');
                        }
                    } catch (err) {
                        Alerts.toast(err.message || 'Payment verification failed', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-redo me-2"></i>Retry Payment';
                    }
                },
                modal: {
                    ondismiss: function () {
                        Alerts.toast('Payment cancelled', 'info');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-redo me-2"></i>Retry Payment';
                    }
                },
                prefill: data.prefill || {},
                theme: { color: '#82ae46' }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-redo me-2"></i>Retry Payment';
                Alerts.toast(response.error.description || 'Payment failed', 'error');
            });
            rzp.open();

        } catch (err) {
            Alerts.toast(err.message || 'Error processing payment retry', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo me-2"></i>Retry Payment';
        }
    }


    function init() {
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => retryPaymentHandler(retryBtn));
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
