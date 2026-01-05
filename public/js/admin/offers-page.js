document.addEventListener('DOMContentLoaded', function () {
    const productForm = document.getElementById('productOfferForm');
    const categoryForm = document.getElementById('categoryOfferForm');

    function clearErrors(form) {
        form.querySelectorAll('.text-danger').forEach(el => el.classList.add('d-none'));
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    function showErrors(form, errors, prefix = '') {
        for (const [key, error] of Object.entries(errors)) {
            const errorElementId = prefix ? `error-${prefix}-${key}` : `error-${key}`;
            const errorElement = document.getElementById(errorElementId);

            // Try to find input by name to add invalid class
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.classList.add('is-invalid');

            if (errorElement) {
                errorElement.innerText = error.msg;
                errorElement.classList.remove('d-none');
            }
        }
    }

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(productForm);

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/admin/offers/product', { // Corrected URL
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success) {
                    Alerts.toast(result.message, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else if (result.errors) {
                    showErrors(productForm, result.errors);
                } else {
                    Alerts.toast(result.message || 'Error applying offer', 'error');
                }
            } catch (err) {
                Alerts.toast('Something went wrong', 'error');
            }
        });
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(categoryForm);

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/admin/offers/category', { // Corrected URL
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success) {
                    Alerts.toast(result.message, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else if (result.errors) {
                    showErrors(categoryForm, result.errors, 'cat'); // key 'cat' for prefix
                } else {
                    Alerts.toast(result.message || 'Error applying offer', 'error');
                }
            } catch (err) {
                Alerts.toast('Something went wrong', 'error');
            }
        });
    }

    // Toggle functionalities (unchanged logic, just ensuring it's preserved if it was in the file, 
    // but based on previous read, this file only had submits. Toggles are likely handled by inline onclicks 
    // OR listener assignment if they exist. 
    // Wait, the previous file read SHOWED NO TOGGLE LOGIC. But 'adminRoutes' has toggle routes.
    // Ah, 'offers.ejs' has inline 'toggle-product-offer-switch' classes. 
    // I need to add toggle handlers here too if they were missing or if I want to be thorough.
    // The previous 'offers-page.js' was very simple.

    // Add Toggle Logic
    document.querySelectorAll('.toggle-product-offer-switch').forEach(toggle => {
        toggle.addEventListener('change', async function () {
            const productId = this.dataset.productId;
            const statusText = this.closest('td').querySelector('.status-text');
            try {
                const res = await fetch(`/admin/offers/product/${productId}/toggle`, { method: 'PATCH' });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast(data.message, 'success');
                    if (statusText) statusText.innerText = this.checked ? 'Active' : 'Inactive';
                } else {
                    this.checked = !this.checked;
                    Alerts.toast(data.message, 'error');
                }
            } catch (e) {
                this.checked = !this.checked;
                Alerts.toast('Error updating status', 'error');
            }
        });
    });

    document.querySelectorAll('.toggle-category-offer-switch').forEach(toggle => {
        toggle.addEventListener('change', async function () {
            const categoryId = this.dataset.categoryId;
            const statusText = this.closest('td').querySelector('.status-text');
            try {
                const res = await fetch(`/admin/offers/category/${categoryId}/toggle`, { method: 'PATCH' });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast(data.message, 'success');
                    if (statusText) statusText.innerText = this.checked ? 'Active' : 'Inactive';
                } else {
                    this.checked = !this.checked;
                    Alerts.toast(data.message, 'error');
                }
            } catch (e) {
                this.checked = !this.checked;
                Alerts.toast('Error updating status', 'error');
            }
        });
    });

    // Delete Logic
    document.querySelectorAll('.delete-offer-product').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!confirm('Delete this offer?')) return;
            const id = this.dataset.id;
            try {
                const res = await fetch(`/admin/offers/product/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast(data.message, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    Alerts.toast(data.message, 'error');
                }
            } catch (e) {
                Alerts.toast('Error deleting offer', 'error');
            }
        });
    });

    document.querySelectorAll('.delete-offer-category').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!confirm('Delete this offer?')) return;
            const id = this.dataset.id;
            try {
                const res = await fetch(`/admin/offers/category/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast(data.message, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    Alerts.toast(data.message, 'error');
                }
            } catch (e) {
                Alerts.toast('Error deleting offer', 'error');
            }
        });
    });
});
