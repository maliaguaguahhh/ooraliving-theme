/*
 * Shows the free-shipping threshold in the visitor's currency.
 *
 * shipping-region.liquid renders the amount in the store currency inside
 * <span data-oora-threshold="49" data-oora-base-currency="USD">. When the visitor
 * shops in another currency, this converts it with Shopify's presentment rate and
 * rounds UP to a whole unit, so the shown amount is never below the real threshold.
 * Sections that re-render (variant changes, cart updates) are picked up by a
 * MutationObserver.
 */
(() => {
  if (window.ooraShippingRegion) return;
  window.ooraShippingRegion = true;

  const currency = window.Shopify && window.Shopify.currency;
  const locale = document.documentElement.lang || (window.Shopify && window.Shopify.locale) || 'en';

  const convert = (root) => {
    if (!currency || !currency.active) return;
    const rate = parseFloat(currency.rate);
    root.querySelectorAll('[data-oora-threshold]:not([data-oora-converted])').forEach((el) => {
      el.setAttribute('data-oora-converted', '');
      const base = parseFloat(el.dataset.ooraThreshold);
      if (!base || !rate || currency.active === el.dataset.ooraBaseCurrency) return;
      const amount = Math.ceil(base * rate);
      try {
        el.textContent = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency.active,
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        }).format(amount);
      } catch (e) {
        el.textContent = `${amount} ${currency.active}`;
      }
    });
  };

  const start = () => {
    convert(document);
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) convert(n.matches && n.matches('[data-oora-threshold]') ? n.parentNode || document : n);
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
