(function () {
  const UserCommon = window.UserCommon || {};
  const api = UserCommon.api;

  if (!api) {
    console.error('UserCommon.api not found. Cart/Wishlist actions will fail.');
  }

  function changeMainImage(thumbnail) {
    const mainImage = document.getElementById('mainImage');
    if (!mainImage || !thumbnail) return;
    mainImage.src = thumbnail.src;

    document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
  }

  function setupImageZoom() {
    const container = document.getElementById('imageZoomContainer');
    const image = document.getElementById('mainImage');
    if (!container || !image) return;

    container.addEventListener('mouseenter', function () {
      container.classList.add('zoomed');
    });

    container.addEventListener('mousemove', function (e) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      image.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    });

    container.addEventListener('mouseleave', function () {
      container.classList.remove('zoomed');
    });
  }

  function initQuantityControls() {
    const quantityInput = document.getElementById('quantity');
    const incrementBtn = document.getElementById('incrementBtn');
    const decrementBtn = document.getElementById('decrementBtn');
    const maxStock = window.PRODUCT_META?.stock || 0;
    const MAX_CART_LIMIT = 5;

    if (!quantityInput || !incrementBtn || !decrementBtn) return;

    function updateButtonStates() {
      const currentQty = parseInt(quantityInput.value, 10);
      incrementBtn.disabled = currentQty >= Math.min(maxStock, MAX_CART_LIMIT);
      decrementBtn.disabled = currentQty <= 1;
    }

    incrementBtn.addEventListener('click', function () {
      let currentQty = parseInt(quantityInput.value, 10);
      const maxAllowed = Math.min(maxStock, MAX_CART_LIMIT);
      if (currentQty < maxAllowed) {
        quantityInput.value = currentQty + 1;
        updateButtonStates();
      }
    });

    decrementBtn.addEventListener('click', function () {
      let currentQty = parseInt(quantityInput.value, 10);
      if (currentQty > 1) {
        quantityInput.value = currentQty - 1;
        updateButtonStates();
      }
    });

    updateButtonStates();
  }

  function initAddToCart() {
    const actionsContainer = document.querySelector('.actions-container[data-page="product-detail"]');
    if (!actionsContainer) return;

    const addToCartBtn = actionsContainer.querySelector('.add-to-cart-btn');
    if (!addToCartBtn) return;

    let isSubmitting = false;
    addToCartBtn.addEventListener('click', async function () {
      if (isSubmitting) return;
      isSubmitting = true;

      const quantity = parseInt(document.getElementById('quantity')?.value || '1', 10);
      const productId = this.getAttribute('data-product-id');

      try {
        const data = await api('POST', '/user/cart/add', { productId, quantity });

        if (data.success) {
          Alerts.toast('Added to cart successfully', 'success');
          document.getElementById('quantity').value = 1;
          if (typeof data.cartCount === 'number' && window.HeaderUpdater) {
            window.HeaderUpdater.updateCartCount(data.cartCount);
          }
        } else {
          Alerts.toast(data.message || 'Failed to add to cart', 'error');
        }
      } catch (err) {
        Alerts.toast(err.message || 'Error adding to cart', 'error');
      } finally {
        isSubmitting = false;
      }
    });
  }

  function initWishlist() {
    const wishlistBtn = document.querySelector('.add-to-wishlist-btn');
    if (!wishlistBtn) return;

    wishlistBtn.addEventListener('click', async function () {
      const productId = this.getAttribute('data-product-id');
      try {
        const data = await api('POST', '/user/wishlist/add', { productId });

        if (data.requiresLogin) {
          window.location.href = '/auth/login';
          return;
        }

        if (data.success) {
          Alerts.toast(data.message || 'Added to wishlist', 'success');
          if (typeof data.wishlistCount === 'number' && window.HeaderUpdater) {
            window.HeaderUpdater.updateWishlistCount(data.wishlistCount);
          }
        } else {
          Alerts.toast(data.message || 'Failed to add to wishlist', 'error');
        }
      } catch (err) {
        if (err.payload && err.payload.message && err.payload.message.toLowerCase().includes('already')) {
          Alerts.toast('Already in your wishlist', 'info');
        } else {
          Alerts.toast(err.message || 'Error adding to wishlist', 'error');
        }
      }
    });
  }

  function initThumbnailClicks() {
    document.querySelectorAll('.thumbnail-item').forEach(t => {
      t.addEventListener('click', function () { changeMainImage(this); });
    });
  }

  function init() {
    setupImageZoom();
    initQuantityControls();
    initAddToCart();
    initWishlist();
    initThumbnailClicks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
