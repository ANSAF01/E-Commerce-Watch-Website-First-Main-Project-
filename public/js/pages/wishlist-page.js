(function () {
  const { api } = window.UserCommon;

  function init() {
    const container = document.querySelector('.row.g-3');
    if (!container) return;

    container.addEventListener('click', async function (e) {
      const addBtn = e.target.closest('.add-to-cart-btn');
      const removeBtn = e.target.closest('.remove-from-wishlist-btn');

      if (addBtn) {
        const productId = addBtn.getAttribute('data-product-id');
        try {
          const data = await api('POST', '/user/cart/add', { productId, quantity: 1 });
          Alerts.toast(data.message || 'Added to cart', 'success');

          if (typeof data.cartCount === 'number' && window.HeaderUpdater) {
            window.HeaderUpdater.updateCartCount(data.cartCount);
          }

          const card = addBtn.closest('.col-12');
          if (card) {
            card.remove();
          }

          const remaining = container.querySelectorAll('.col-12').length;
          if (remaining === 0) {
            const parent = container.parentElement;
            parent.innerHTML = '<div class="alert alert-info">Your wishlist is empty.</div>';
          }
        } catch (err) {
          Alerts.toast(err.message || 'Failed to add to cart', 'error');
        }
      }

      if (removeBtn) {
        const productId = removeBtn.getAttribute('data-product-id');
        try {
          const data = await api('DELETE', '/user/wishlist/delete/' + productId);
          Alerts.toast(data.message || 'Removed from wishlist', 'success');

          if (typeof data.wishlistCount === 'number' && window.HeaderUpdater) {
            window.HeaderUpdater.updateWishlistCount(data.wishlistCount);
          }

          const card = removeBtn.closest('.col-12');
          if (card) card.remove();
          const remaining = container.querySelectorAll('.col-12').length;
          if (remaining === 0) {
            const parent = container.parentElement;
            parent.innerHTML = '<div class="alert alert-info">Your wishlist is empty.</div>';
          }
        } catch (err) {
          Alerts.toast(err.message || 'Failed to remove', 'error');
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
