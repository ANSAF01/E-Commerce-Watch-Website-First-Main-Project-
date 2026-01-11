document.addEventListener('DOMContentLoaded', function () {
    const editCouponForm = document.getElementById('editCouponForm');

    if (editCouponForm) {
        const expiresAt = editCouponForm.querySelector('input[name="expiresAt"]');
        if (expiresAt) {
            const today = new Date().toISOString().split('T')[0];
            expiresAt.setAttribute('min', today);
        }
    }

    if (editCouponForm) {
        editCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            // We need to parse the action URL to get the ID, or use data attribute.
            // But the form action is already set correctly: /admin/coupons/:id/edit

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });

                const data = await response.json();

                if (response.ok) {
                    Alerts.toast(data.message, 'success');
                    setTimeout(() => {
                        window.location.href = '/admin/coupons';
                    }, 500);
                } else {
                    Alerts.toast(data.message || 'Failed to update coupon', 'error');
                }
            } catch (error) {
                Alerts.toast('An error occurred while updating the coupon', 'error');
                console.error('Error:', error);
            }
        });
    }
});
