(function () {
    const { api, updateRowUI, updateSubtotalUI, onEmptyCart, toNumber } = window.UserCommon;

    function bindRow(row) {
        const container = row.querySelector('[data-product-id]');
        if (!container) return;
        const productId = container.getAttribute('data-product-id');
        const decBtn = container.querySelector('.js-dec');
        const incBtn = container.querySelector('.js-inc');
        const qtyInput = container.querySelector('.js-qty');
        const removeBtn = row.querySelector('.js-remove');

        if (decBtn) {
            decBtn.addEventListener('click', async () => {
                try {
                    const data = await api('PATCH', `/user/cart/decrement/${productId}`);
                    updateRowUI(row, data);
                    updateSubtotalUI(data.subtotal);
                    if (data.cartCount !== undefined && window.HeaderUpdater) {
                        window.HeaderUpdater.updateCartCount(data.cartCount);
                    }
                } catch (e) {
                    Alerts.toast(e.message || 'Error updating quantity', 'error');
                }
            });
        }

        if (incBtn) {
            incBtn.addEventListener('click', async () => {
                try {
                    const data = await api('PATCH', `/user/cart/increment/${productId}`);
                    updateRowUI(row, data);
                    updateSubtotalUI(data.subtotal);
                    if (data.cartCount !== undefined && window.HeaderUpdater) {
                        window.HeaderUpdater.updateCartCount(data.cartCount);
                    }
                } catch (e) {
                    Alerts.toast(e.message || 'Error updating quantity', 'error');
                }
            });
        }

        if (qtyInput) {
            const commitQty = async () => {
                const val = toNumber(qtyInput.value);
                try {
                    const data = await api('PATCH', `/user/cart/update-qty/${productId}`, { quantity: val });
                    updateRowUI(row, data);
                    updateSubtotalUI(data.subtotal);
                    if (data.cartCount !== undefined && window.HeaderUpdater) {
                        window.HeaderUpdater.updateCartCount(data.cartCount);
                    }
                } catch (e) {
                    Alerts.toast(e.message || 'Error updating quantity', 'error');
                }
            };
            qtyInput.addEventListener('change', commitQty);
            qtyInput.addEventListener('blur', commitQty);
            qtyInput.addEventListener('keyup', (ev) => { if (ev.key === 'Enter') commitQty(); });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                try {
                    const data = await api('DELETE', `/user/cart/delete/${productId}`);
                    if (data.removed) {
                        row.remove();
                        updateSubtotalUI(data.subtotal);
                        if (typeof data.cartCount === 'number' && window.HeaderUpdater) {
                            window.HeaderUpdater.updateCartCount(data.cartCount);
                        }
                        const anyRow = document.querySelector('tbody tr');
                        if (!anyRow) onEmptyCart();
                        Alerts.toast('Item removed from cart', 'success');
                    }
                } catch (e) {
                    Alerts.toast(e.message || 'Error removing item', 'error');
                }
            });
        }
    }

    function init() {
        document.querySelectorAll('tbody tr').forEach(bindRow);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
