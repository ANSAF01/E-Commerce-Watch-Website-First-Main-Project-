document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('productForm');
    const imageBoxes = document.getElementById('imageBoxes');
    const existingImagesEl = document.getElementById('existingImages');
    const existingImages = existingImagesEl ? JSON.parse(existingImagesEl.textContent || '[]') : [];

    const imageFiles = new Array(3).fill(null);
    const replacedImageIndices = new Set();

    // Setup initial state and listeners for each image box
    if (imageBoxes) {
        imageBoxes.querySelectorAll('.image-box').forEach((box, index) => {
            const preview = box.querySelector('.image-preview');
            const placeholder = box.querySelector('.image-placeholder');
            const input = box.querySelector('.image-input');
            const removeBtn = box.querySelector('.remove-image');

            // 1. Set initial images
            if (existingImages[index]) {
                preview.src = existingImages[index];
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'inline-block';
            }

            // 2. Handle new image selection
            input.addEventListener('change', function (e) {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    imageFiles[index] = file;
                    replacedImageIndices.add(index);

                    const reader = new FileReader();
                    reader.onload = function (event) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                        removeBtn.style.display = 'inline-block';
                    }
                    reader.readAsDataURL(file);
                }
            });

            // 3. Handle image removal
            removeBtn.addEventListener('click', function () {
                imageFiles[index] = null;
                preview.src = '#';
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
                removeBtn.style.display = 'none';
                input.value = ''; // Clear the file input
                replacedImageIndices.add(index); // Mark this index as 'changed' for deletion
            });
        });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            const indicesToSubmit = Array.from(replacedImageIndices);

            formData.delete('images');
            formData.append('replacedIndices', JSON.stringify(indicesToSubmit));

            indicesToSubmit.forEach(index => {
                if (imageFiles[index]) { // Only append if it's a new file
                    formData.append('images', imageFiles[index], imageFiles[index].name);
                }
            });

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(async res => {
                    const data = await res.json();

                    document.querySelectorAll('.text-danger').forEach(el => el.textContent = '');
                    const globalErrEl = document.getElementById('imagesValidationError');
                    if (globalErrEl) globalErrEl.style.display = 'none';

                    if (res.ok) {
                        if (data.redirect) {
                            Alerts.toast('Product updated successfully!', 'success');
                            setTimeout(() => {
                                window.location.href = data.redirect;
                            }, 1000);
                        }
                    } else {
                        if (data.errors) {
                            Object.keys(data.errors).forEach(field => {
                                const errorMsg = data.errors[field].msg;
                                let errorEl = form.querySelector(`[name="${field}"]`)?.parentElement.querySelector('.text-danger');
                                if (field === 'images') {
                                    errorEl = globalErrEl;
                                }
                                if (errorEl) {
                                    errorEl.textContent = errorMsg;
                                    errorEl.style.display = 'block';
                                }
                            });
                        }
                    }
                })
                .catch(err => {
                    console.error('Form submission error:', err);
                });
        });
    }
});
