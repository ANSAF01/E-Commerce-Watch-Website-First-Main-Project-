(function () {
  const UserCommon = window.UserCommon || {};
  const api = UserCommon.api;

  if (!api) {
    console.warn('UserCommon.api not found in shop-page.js. Async actions may fail.');
  }

  function handleWishlistAdd() {
    document.querySelectorAll('.add-to-wishlist-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();

        const productId = btn.getAttribute('data-product-id');

        if (!productId) {
          Alerts.toast('Product ID not found', 'error');
          return;
        }

        try {
          const data = await api('POST', '/user/wishlist/add', { productId });

          if (data.requiresLogin) {
            Alerts.confirm({
              title: 'Login Required',
              text: data.message || 'Please login to add items to wishlist',
              confirmButtonText: 'Login',
              cancelButtonText: 'Cancel'
            }).then(result => {
              if (result.isConfirmed) {
                window.location.href = '/auth/login';
              }
            });
            return;
          }

          if (data.success) {
            Alerts.toast(data.message || 'Added to wishlist', 'success');
            btn.classList.add('active');
            if (typeof data.wishlistCount === 'number' && window.HeaderUpdater) {
              window.HeaderUpdater.updateWishlistCount(data.wishlistCount);
            }
          } else {
            Alerts.toast(data.message || 'Failed to add to wishlist', 'error');
          }
        } catch (error) {
          if (error.payload && error.payload.message && error.payload.message.toLowerCase().includes('already')) {
            Alerts.toast('Already in your wishlist', 'info');
          } else {
            Alerts.toast(error.message || 'Error adding to wishlist', 'error');
          }
        }
      });
    });
  }

  function handleCartAdd() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      if (btn.closest('[data-page="product-detail"]')) return;

      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();

        const productId = btn.getAttribute('data-product-id');

        if (!productId) {
          Alerts.toast('Product ID not found', 'error');
          return;
        }

        if (btn.disabled) {
          Alerts.toast('This product is out of stock', 'error');
          return;
        }

        try {
          const data = await api('POST', '/user/cart/add', { productId, quantity: 1 });

          if (data.success) {
            Alerts.toast(data.message || 'Added to cart successfully', 'success');
            if (typeof data.cartCount === 'number' && window.HeaderUpdater) {
              window.HeaderUpdater.updateCartCount(data.cartCount);
            }
          } else {
            Alerts.toast(data.message || 'Failed to add to cart', 'error');
          }
        } catch (error) {
          Alerts.toast(error.message || 'Error adding to cart', 'error');
        }
      });
    });
  }

  function init() {
    handleWishlistAdd();
    handleCartAdd();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
