document.addEventListener('DOMContentLoaded', function () {
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', async () => {
            const input = document.getElementById('myCode');
            input.select();
            input.setSelectionRange(0, 99999);
            try {
                await navigator.clipboard.writeText(input.value);
                Alerts.toast('Referral code copied', 'success');
            } catch (e) {
                Alerts.toast('Copy failed', 'error');
            }
        });
    }

    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/user/referral/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referralCode: '' })
                });
                const data = await res.json();
                if (data.success) {
                    window.location.href = data.redirect || '/';
                } else {
                    Alerts.toast(data.message || 'Unable to skip', 'error');
                }
            } catch (err) {
                Alerts.toast('Network error', 'error');
            }
        });
    }

    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            const code = (document.getElementById('referralCode').value || '').trim();
            if (!code) {
                Alerts.toast('Please enter a referral code', 'warning');
                return;
            }

            try {
                const res = await fetch('/user/referral/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referralCode: code })
                });
                const data = await res.json();
                if (data.success) {
                    Alerts.toast('Referral validated! Bonus credited to your wallet', 'success');
                    setTimeout(() => {
                        window.location.href = data.redirect || '/';
                    }, 1500);
                } else {
                    Alerts.toast(data.message || 'Invalid code', 'error');
                }
            } catch (err) {
                Alerts.toast('Network error', 'error');
            }
        });
    }
});
