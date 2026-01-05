(function () {
    const { api } = window.UserCommon;

    function initAddMoney() {
        const form = document.getElementById('addMoneyForm');
        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const amountInput = document.getElementById('addAmount');
            const amount = amountInput.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            if (!amount || amount < 1) {
                Alerts.toast('Please enter a valid amount', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                // 1. Create Order
                const orderData = await api('POST', '/user/wallet/add', { amount });

                if (!orderData.success) {
                    throw new Error(orderData.message || 'Failed to initiate payment');
                }

                // 2. Open Razorpay
                const options = {
                    key: window.RAZORPAY_KEY_ID, // Injected in view
                    amount: orderData.amount,
                    currency: "INR",
                    name: "FG-UNITED",
                    description: "Wallet Recharge",
                    image: "/images/logo.png",
                    order_id: orderData.orderId,
                    handler: async function (response) {
                        try {
                            // 3. Verify Payment
                            const verifyData = await api('POST', '/user/wallet/verify-add', {
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                amount: amount
                            });

                            if (verifyData.success) {
                                Alerts.toast('Money added successfully!', 'success');
                                setTimeout(() => location.reload(), 1500);
                            } else {
                                Alerts.toast(verifyData.message || 'Payment verification failed', 'error');
                            }
                        } catch (err) {
                            Alerts.toast(err.message || 'Error verifying payment', 'error');
                        }
                    },
                    prefill: {
                        name: "", // Can fill from session if available
                        email: "",
                        contact: ""
                    },
                    theme: {
                        color: "#0d6efd"
                    },
                    modal: {
                        ondismiss: function () {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Proceed to Pay';
                        }
                    }
                };

                const rzp1 = new Razorpay(options);
                rzp1.open();

                rzp1.on('payment.failed', function (response) {
                    Alerts.toast(response.error.description || 'Payment failed', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Proceed to Pay';
                });

            } catch (err) {
                Alerts.toast(err.message || 'Error initiating payment', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Proceed to Pay';
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAddMoney);
    else initAddMoney();

})();
