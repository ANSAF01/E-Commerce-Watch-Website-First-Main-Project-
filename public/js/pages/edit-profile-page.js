document.addEventListener('DOMContentLoaded', function () {
    const editImageBtn = document.getElementById('editImageBtn');
    const profileImageInput = document.getElementById('profileImageInput');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const profileImagePlaceholder = document.getElementById('profileImagePlaceholder');
    const saveBtn = document.getElementById('saveBtn');
    const form = document.getElementById('editProfileForm');
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const newEmailInput = document.getElementById('newEmail');
    let changeEmailModal;

    if (editImageBtn) {
        editImageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            profileImageInput.click();
        });
    }

    if (profileImageInput) {
        profileImageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Alerts.toast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
                    profileImageInput.value = '';
                    return;
                }

                // Validate file size (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    Alerts.toast('Image size must be less than 5MB', 'error');
                    profileImageInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (event) {
                    profileImagePreview.src = event.target.result;
                    profileImagePreview.style.display = 'block';
                    profileImagePlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function clearErrors() {
        const fullnameError = document.getElementById('fullnameError');
        const mobileError = document.getElementById('mobileError');
        if (fullnameError) fullnameError.style.display = 'none';
        if (mobileError) mobileError.style.display = 'none';
    }

    function displayErrors(errors) {
        clearErrors();
        if (errors.fullname) {
            const el = document.getElementById('fullnameError');
            if (el) {
                el.textContent = errors.fullname.msg;
                el.style.display = 'block';
            }
        }
        if (errors.mobile) {
            const el = document.getElementById('mobileError');
            if (el) {
                el.textContent = errors.mobile.msg;
                el.style.display = 'block';
            }
        }
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors();
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            try {
                const formData = new FormData(form);
                const res = await fetch(form.action, { method: 'POST', body: formData });
                const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));

                // Handle validation errors
                if (data.errors) {
                    displayErrors(data.errors);
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                    return;
                }

                if (!res.ok) {
                    throw new Error(data.message || 'Failed to save');
                }
                if (data.success === false) {
                    // Show warning for "No changes made"
                    Alerts.toast(data.message || 'Failed to save profile', 'warning');
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                    return;
                }
                Alerts.toast(data.message || 'Profile updated successfully', 'success');
                setTimeout(() => { window.location.href = '/user/profile'; }, 1200);
            } catch (err) {
                Alerts.toast(err.message || 'Failed to save profile', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        });
    }

    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', function () {
            if (newEmailInput) newEmailInput.value = '';
            const modalEl = document.getElementById('changeEmailModal');
            if (modalEl) {
                changeEmailModal = new bootstrap.Modal(modalEl);
                changeEmailModal.show();
            }
        });
    }

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async function () {
            const newEmail = newEmailInput.value.trim();
            const currentEmail = document.getElementById('email') ? document.getElementById('email').value : '';

            if (!newEmail) {
                Alerts.toast('Please enter a new email address', 'error');
                return;
            }

            if (currentEmail && newEmail === currentEmail) {
                Alerts.toast('New email must be different from current email', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                Alerts.toast('Please enter a valid email address', 'error');
                return;
            }

            const originalText = sendOtpBtn.textContent;
            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = 'Sending...';

            try {
                const response = await fetch('/user/profile/change-email-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newEmail })
                });

                const data = await response.json();

                if (response.ok && data.redirectTo) {
                    if (changeEmailModal) changeEmailModal.hide();
                    window.location.href = data.redirectTo;
                    return;
                }

                if (response.ok && data.success) {
                    if (changeEmailModal) changeEmailModal.hide();
                    window.location.href = '/auth/otp';
                } else {
                    Alerts.toast(data.message || 'Failed to send OTP', 'error');
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = originalText;
                }
            } catch (error) {
                console.error('Error:', error);
                Alerts.toast('Error sending OTP', 'error');
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = originalText;
            }
        });
    }
});
