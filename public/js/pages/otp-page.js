(function () {
    const otpConfig = document.getElementById('otpConfig');
    const INITIAL_COOLDOWN = otpConfig ? parseInt(otpConfig.dataset.remainingCooldown) || 0 : 0;
    const RESEND_COOLDOWN_SECONDS = 45;

    function formatTime(seconds) {
        const mins = Math.floor(Math.max(0, seconds) / 60);
        const secs = Math.max(0, seconds) % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function startResendCooldown(initialSeconds) {
        const resendBtn = document.getElementById('resendBtn');
        const resendCooldownText = document.getElementById('resendCooldownText');
        const resendCooldown = document.getElementById('resendCooldown');
        let secondsLeft = Math.max(0, initialSeconds);

        const updateDisplay = () => {
            if (resendCooldown) resendCooldown.textContent = formatTime(secondsLeft);

            if (secondsLeft <= 0) {
                if (interval) clearInterval(interval);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend OTP';
                }
                if (resendCooldownText) resendCooldownText.style.display = 'none';
            } else {
                if (resendBtn) resendBtn.disabled = true;
                if (resendCooldownText) resendCooldownText.style.display = 'inline';
            }
        };

        updateDisplay();

        const interval = setInterval(() => {
            secondsLeft--;
            updateDisplay();
        }, 1000);

        window.addEventListener('beforeunload', () => clearInterval(interval));
    }

    function init() {
        const otpForm = document.getElementById('otpForm');
        const otpInput = document.getElementById('otpInput');
        const otpError = document.getElementById('otpError');
        const verifyBtn = document.getElementById('verifyBtn');
        const resendForm = document.getElementById('resendForm');
        const resendBtn = document.getElementById('resendBtn');
        const resendCooldownText = document.getElementById('resendCooldownText');

        if (INITIAL_COOLDOWN > 0) {
            startResendCooldown(INITIAL_COOLDOWN);
        } else {
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';
            }
            if (resendCooldownText) {
                resendCooldownText.style.display = 'none';
            }
        }

        if (otpInput) {
            otpInput.focus();

            otpInput.addEventListener('input', function (e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value.length > 0 && otpError) otpError.style.display = 'none';
                if (verifyBtn) verifyBtn.disabled = this.value.length !== 6;
            });

            otpInput.addEventListener('paste', function (e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const numericText = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
                this.value = numericText;
                if (verifyBtn) verifyBtn.disabled = numericText.length !== 6;
            });
        }

        if (otpForm) {
            otpForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const otp = otpInput.value.trim();

                if (!otp || otp.length !== 6) {
                    if (otpError) {
                        otpError.textContent = 'Please enter a valid 6-digit OTP';
                        otpError.style.display = 'block';
                    }
                    otpInput.focus();
                    return;
                }

                const originalText = verifyBtn.innerHTML;
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
                otpInput.disabled = true;

                try {
                    const emailInput = document.querySelector('input[name="email"]');
                    const response = await fetch('/auth/verify-otp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            email: emailInput ? emailInput.value : '',
                            otp: otp
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        Alerts.toast(data.message || 'OTP verified successfully', 'success');
                        setTimeout(() => {
                            window.location.href = data.redirectTo || '/';
                        }, 1000);
                    } else {
                        throw new Error(data.message || 'Failed to verify OTP');
                    }
                } catch (error) {
                    if (otpError) {
                        otpError.textContent = error.message || 'Network error. Please try again.';
                        otpError.style.display = 'block';
                    }
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = originalText;
                    otpInput.disabled = false;
                    otpInput.focus();
                    Alerts.toast(error.message || 'Error verifying OTP', 'error');
                }
            });
        }

        if (resendForm) {
            resendForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const originalText = resendBtn.textContent;
                resendBtn.disabled = true;
                resendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

                try {
                    const response = await fetch(resendForm.action, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        },
                        body: new URLSearchParams(new FormData(resendForm))
                    });

                    const data = await response.json();

                    if (data.success) {
                        Alerts.toast('OTP resent successfully', 'success');
                        if (otpError) otpError.style.display = 'none';
                        if (otpInput) {
                            otpInput.value = '';
                            otpInput.focus();
                        }
                        startResendCooldown(RESEND_COOLDOWN_SECONDS);
                    } else {
                        Alerts.toast(data.message || 'Failed to resend OTP', 'error');
                        resendBtn.disabled = false;
                        resendBtn.textContent = originalText;
                    }
                } catch (error) {
                    Alerts.toast('Network error. Please try again.', 'error');
                    resendBtn.disabled = false;
                    resendBtn.textContent = originalText;
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
