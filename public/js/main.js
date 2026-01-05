document.addEventListener('DOMContentLoaded', () => {
  const WISHLIST_ENDPOINT = '/user/wishlist/add';
  const CART_ENDPOINT = '/user/cart/add';
  const WISHLIST_BTN_SELECTOR = '.add-to-wishlist-btn';
  const CART_BTN_SELECTOR = '.add-to-cart-btn';
  const REMOVE_WISHLIST_SELECTOR = '.remove-from-wishlist-btn';

  const handleWishlistAdd = () => {
    document.querySelectorAll(WISHLIST_BTN_SELECTOR).forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();

        const productId = btn.getAttribute('data-product-id');

        if (!productId) {
          Alerts.toast('Product ID not found', 'error');
          return;
        }

        try {
          const data = await UserCommon.api('POST', WISHLIST_ENDPOINT, { productId });

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
            if (data.itemCount !== undefined && window.HeaderUpdater) {
              window.HeaderUpdater.updateWishlistCount(data.itemCount);
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
  };

  const handleCartAdd = () => {
    document.querySelectorAll(CART_BTN_SELECTOR).forEach(btn => {
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

        const quantity = 1;

        try {
          const data = await UserCommon.api('POST', CART_ENDPOINT, { productId, quantity });

          if (data.success) {
            Alerts.toast(data.message || 'Added to cart successfully', 'success');
            if (data.cartCount !== undefined && window.HeaderUpdater) {
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
  };

  const handleWishlistRemove = () => {
    document.querySelectorAll(REMOVE_WISHLIST_SELECTOR).forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();

        const productId = btn.getAttribute('data-product-id');

        if (!productId) {
          Alerts.toast('Product ID not found', 'error');
          return;
        }

        try {
          const data = await UserCommon.api('DELETE', `/user/wishlist/delete/${productId}`);

          if (data.success) {
            Alerts.toast(data.message || 'Removed from wishlist', 'success');
            const card = btn.closest('.col-12, .col-md-6, .col-lg-3, [class*="col-"]');
            if (card) {
              card.remove();
            }
            if (data.itemCount !== undefined && window.HeaderUpdater) {
              window.HeaderUpdater.updateWishlistCount(data.itemCount);
            }
            if (document.querySelectorAll(REMOVE_WISHLIST_SELECTOR).length === 0) {
              location.reload();
            }
          } else {
            Alerts.toast(data.message || 'Failed to remove from wishlist', 'error');
          }
        } catch (error) {
          Alerts.toast(error.message || 'Error removing from wishlist', 'error');
        }
      });
    });
  };

  const initLogout = () => {
    const logoutForm = document.querySelector('form[action="/auth/logout"]');
    if (!logoutForm) return;

    logoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      Alerts.confirm({
        title: 'Logout?',
        text: 'You will be signed out of your account.'
      }).then(result => {
        if (result.isConfirmed) {
          Alerts.toast('You have been logged out', 'info');
          setTimeout(() => this.submit(), 500);
        }
      });
    });

    // Handle sidebar logout specifically if strictly separate, but usually querySelector finds the first one.
    // If there are TWO logout forms (header + sidebar), querySelector only finds one.
    // Use querySelectorAll to be safe.
    document.querySelectorAll('form[action="/auth/logout"]').forEach(form => {
      // Avoid double binding if initLogout called twice (not expected here but good practice)
      // Cleanest way is just binding.
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        Alerts.confirm({
          title: 'Logout?',
          text: 'You will be signed out of your account.'
        }).then(result => {
          if (result.isConfirmed) {
            Alerts.toast('You have been logged out', 'info');
            setTimeout(() => form.submit(), 500);
          }
        });
      });
    });
  };

  handleWishlistAdd();
  handleCartAdd();
  handleWishlistRemove();
  initLogout();
});
