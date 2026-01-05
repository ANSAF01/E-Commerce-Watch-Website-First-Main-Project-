document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('productForm');

    // Check if we are on add product page
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(this);

            // Remove raw file inputs automatically captured by FormData to avoid duplicates/limit errors
            formData.delete('images');

            // Append exactly 3 images in index order (0,1,2). Backend requires exactly 3.
            const indices = [0, 1, 2];
            for (const idx of indices) {
                const file = window.imageFiles && window.imageFiles[idx];
                if (file) {
                    formData.append('images', file);
                }
            }

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(async res => {
                    const data = await res.json();

                    // Clear previous errors
                    document.querySelectorAll('.text-danger').forEach(el => el.textContent = '');
                    const globalErr = document.getElementById('imagesValidationError');
                    if (globalErr) globalErr.style.display = 'none';

                    if (res.ok) {
                        if (data.redirect) {
                            window.location.href = data.redirect;
                        }
                    } else {
                        // Handle Validation Errors
                        if (data.errors) {
                            Object.keys(data.errors).forEach(field => {
                                const errorMsg = data.errors[field].msg;
                                if (field === 'images') {
                                    if (globalErr) {
                                        globalErr.textContent = errorMsg;
                                        globalErr.style.display = 'block';
                                    }
                                } else {
                                    const input = form.querySelector(`[name="${field}"]`);
                                    if (input) {
                                        const errorSmall = input.parentElement.querySelector('small.text-danger');
                                        if (errorSmall) {
                                            errorSmall.textContent = errorMsg;
                                        }
                                    }
                                }
                            });
                        }
                    }
                })
                .catch(err => {
                    console.error(err);
                    if (window.Alerts && typeof Alerts.toast === 'function') {
                        Alerts.toast('Something went wrong. Please try again.', 'error');
                    }
                });
        });
    }
});
