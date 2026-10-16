(function () {
  const config = window.ooraGiftWrap;
  if (!config || !config.variantId || window.ooraGiftWrapLoaded) {
    return;
  }

  window.ooraGiftWrapLoaded = true;

  const PROPERTY = config.property;
  const YES = config.value;
  const NOTE_PREFIX = config.notePrefix;
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const nativeFetch = window.fetch.bind(window);

  const request = async (path, body) => {
    const response = await nativeFetch(`${root}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.description || data.message || `Cart request failed (${response.status})`);
    }
    return data;
  };

  const getCart = () => request('cart.js');
  const isWrapLine = (item) => item.variant_id === config.variantId;
  const isWrapped = (item) => !isWrapLine(item) && item.properties && item.properties[PROPERTY] === YES;

  const sectionIds = () => {
    const ids = [];
    const mini = document.querySelector('xo-cart-mini');
    const cart = document.querySelector('xo-cart');
    if (mini && mini.id) {
      ids.push(mini.id);
    }
    if (cart && cart.id && window.location.pathname.includes('/cart')) {
      ids.push(cart.id);
    }
    return ids;
  };

  // Customer-written note stays as is; one "[GIFT WRAP] …" line per wrapped cart line is kept at the end.
  const buildNote = (cart) => {
    const own = (cart.note || '')
      .split('\n')
      .filter((line) => !line.startsWith(NOTE_PREFIX))
      .join('\n')
      .trim();
    // Discounts can split one product into several cart lines, so totals are grouped per product and variant.
    const totals = new Map();
    cart.items.filter(isWrapped).forEach((item) => {
      const variant = item.variant_title ? ` - ${item.variant_title}` : '';
      const label = `${item.product_title}${variant}`;
      totals.set(label, (totals.get(label) || 0) + item.quantity);
    });
    const lines = [...totals].map(([label, quantity]) => `${NOTE_PREFIX}${label} x${quantity}`);
    if (!lines.length) {
      return own;
    }
    return own ? `${own}\n\n${lines.join('\n')}` : lines.join('\n');
  };

  const refresh = async () => {
    const ids = sectionIds();
    const data = await request('cart/update.js', { sections: ids });
    if (window.xoStore) {
      window.xoStore.set('xo-cart', (prev) => ({
        ...prev,
        size: data.item_count,
        items: data.items,
        sections: { ...(prev && prev.sections), ...(data.sections || {}) },
      }))('gift-wrap/refresh');
    }
    // The free shipping bar only recalculates when the cart total changes. Gift wrap changes
    // can re-render the drawer with the same total, which would leave the bar on its default text.
    window.setTimeout(() => {
      document.querySelectorAll('xo-cart-free-shipping-custom').forEach((bar) => {
        if (typeof bar.handler === 'function') {
          bar.handler();
        }
      });
    }, 100);
  };

  // Keeps the Gift Wrap line quantity equal to the number of wrapped units, and the order note in step.
  const runSync = async () => {
    try {
      let cart = await getCart();
      const units = cart.items.filter(isWrapped).reduce((sum, item) => sum + item.quantity, 0);
      const wrapLines = cart.items.filter(isWrapLine);
      const current = wrapLines.reduce((sum, item) => sum + item.quantity, 0);
      let changed = false;

      if (current !== units || wrapLines.length > 1) {
        if (!wrapLines.length) {
          await request('cart/add.js', { items: [{ id: config.variantId, quantity: units }] });
        } else {
          const updates = {};
          wrapLines.forEach((line, index) => {
            updates[line.key] = index === 0 ? units : 0;
          });
          await request('cart/update.js', { updates });
        }
        changed = true;
        cart = await getCart();
      }

      const note = buildNote(cart);
      if (note !== (cart.note || '')) {
        await request('cart/update.js', { note });
        changed = true;
      }

      if (changed) {
        await refresh();
      }
    } catch (error) {
      console.error('[gift-wrap]', error);
    }
  };

  // Syncs run one after another, so awaiting sync() also waits for any sync already in flight.
  let queue = Promise.resolve();
  const sync = () => {
    queue = queue.then(runSync);
    return queue;
  };

  let timer = null;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(sync, 250);
  };

  // Any cart change made by the theme (add, quantity, remove, note) triggers a sync.
  const CART_WRITE = /\/cart\/(add|change|update|clear)(\.js)?(\?|$)/;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    const result = nativeFetch(input, init);
    if (url && CART_WRITE.test(url)) {
      result.then(schedule, () => {});
    }
    return result;
  };

  const setProductState = (checkbox) => {
    const product = checkbox.closest('xo-product');
    if (product) {
      product.toggleAttribute('data-gift-wrapped', checkbox.checked);
    }
  };

  // Sets how many units of one cart line are gift wrapped. The line is replaced by at most two
  // lines: the wrapped units and the rest. Shopify keeps lines with different properties apart,
  // merges them with matching lines, and re-applies discounts to the new lines.
  const setWrapCount = async (control) => {
    const key = control.dataset.giftWrapLine;
    const wanted = control.type === 'checkbox' ? (control.checked ? 1 : 0) : Number(control.value);
    control.disabled = true;
    try {
      const cart = await getCart();
      const line = cart.items.find((item) => item.key === key);
      if (!line) {
        // The cart changed since the drawer was drawn; redraw it so the controls match again.
        await refresh();
        return;
      }
      const total = line.quantity;
      const wrapped = Math.min(Math.max(wanted, 0), total);
      if (wrapped === (isWrapped(line) ? total : 0)) {
        return;
      }
      const otherProperties = { ...(line.properties || {}) };
      delete otherProperties[PROPERTY];
      Object.keys(otherProperties).forEach((name) => {
        if (otherProperties[name] === '') {
          delete otherProperties[name];
        }
      });
      const hasOther = Object.keys(otherProperties).length > 0;

      await request('cart/update.js', { updates: { [line.key]: 0 } });

      const items = [];
      if (wrapped > 0) {
        items.push({ id: line.variant_id, quantity: wrapped, properties: { ...otherProperties, [PROPERTY]: YES } });
      }
      if (total - wrapped > 0) {
        items.push({ id: line.variant_id, quantity: total - wrapped, ...(hasOther ? { properties: otherProperties } : {}) });
      }
      await request('cart/add.js', { items });
      await sync();
      await refresh();
    } catch (error) {
      console.error('[gift-wrap]', error);
      await refresh().catch(() => {});
    } finally {
      control.disabled = false;
    }
  };

  const buyNow = async (button) => {
    const scope = button.closest('xo-product');
    const variantId = Number(button.dataset.variantId);
    const quantityInput = scope && scope.querySelector('[data-gift-wrap-quantity] input[name="quantity"]');
    const error = scope && scope.querySelector('[data-gift-wrap-error]');
    if (!variantId) {
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (error) {
      error.hidden = true;
    }

    try {
      const quantity = Math.max(1, Number(quantityInput && quantityInput.value) || 1);
      await request('cart/add.js', {
        items: [{ id: variantId, quantity, properties: { [PROPERTY]: YES } }],
      });
      await sync();
      window.location.href = `${root}checkout`;
    } catch (err) {
      if (error) {
        error.textContent = err.message;
        error.hidden = false;
      }
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  };

  document.addEventListener('change', (event) => {
    const productCheckbox = event.target.closest('[data-gift-wrap-product]');
    if (productCheckbox) {
      setProductState(productCheckbox);
      return;
    }

    const wrapControl = event.target.closest('[data-gift-wrap-line]');
    if (wrapControl) {
      setWrapCount(wrapControl);
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gift-wrap-buy-now]');
    if (button) {
      event.preventDefault();
      buyNow(button);
      return;
    }

    const opener = event.target.closest('[data-gift-wrap-dialog-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.giftWrapDialogOpen);
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
      return;
    }

    // Close on the close button or a click on the backdrop (the dialog element itself).
    const dialog = event.target.closest('.gift-wrap-dialog');
    if (dialog && (event.target === dialog || event.target.closest('[data-gift-wrap-dialog-close]'))) {
      dialog.close();
    }
  });

  document.querySelectorAll('[data-gift-wrap-product]').forEach(setProductState);
  sync();
})();
