window.HeaderUpdater = (function () {
  const updateCartCount = (count) => {
    // Try to find the specific badge element if it has an ID or by traversing from the link
    const cartLink = document.querySelector('a[href="/user/cart"]');
    if (!cartLink) return;

    let badge = cartLink.querySelector('.badge');

    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
        cartLink.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      if (badge) badge.remove();
    }
  };

  const updateWishlistCount = (count) => {
    const wishlistLink = document.querySelector('a[href="/user/wishlist"]');
    if (!wishlistLink) return;

    let badge = wishlistLink.querySelector('.badge');

    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
        wishlistLink.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      if (badge) badge.remove();
    }
  };

  return { updateCartCount, updateWishlistCount };
})();
