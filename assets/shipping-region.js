/*
 * Shows the free-shipping threshold in the visitor's currency.
 *
 * shipping-region.liquid renders the amount in the store currency inside
 * <span data-oora-threshold="49" data-oora-base-currency="USD">. When the visitor
 * shops in another currency, this converts it with Shopify's presentment rate and
 * rounds UP to a whole unit, so the shown amount is never below the real threshold.
 * Sections that re-render (variant changes, cart updates) are picked up by a
 * MutationObserver.
 *
 * It also shows the "not shipping to your country" notice inside the shipping card
 * when the visitor's detected location (Shopify browsing context suggestions) is
 * outside the store's countries. Add ?oora_country=DE to a URL to preview it.
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

  let detected = null;

  const applyNotice = (root) => {
    if (!detected) return;
    root.querySelectorAll('[data-oora-unavailable]').forEach((el) => {
      const allowed = (el.dataset.countries || '').split(',').filter(Boolean);
      if (!allowed.length || allowed.includes(detected.code)) return;
      el.querySelectorAll('[data-oora-detected-country]').forEach((s) => { s.textContent = detected.name; });
      el.hidden = false;
      document.documentElement.classList.add('oora-ships-unavailable');
    });
  };

  const detectCountry = async () => {
    if (!document.querySelector('[data-oora-unavailable]')) return null;
    const override = new URLSearchParams(location.search).get('oora_country');
    const nameOf = (code) => {
      try { return new Intl.DisplayNames([locale], { type: 'region' }).of(code); } catch (e) { return code; }
    };
    if (override) return { code: override.toUpperCase(), name: nameOf(override.toUpperCase()) };
    try {
      const cached = sessionStorage.getItem('oora-detected-country');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    try {
      const res = await fetch('/browsing_context_suggestions.json', { credentials: 'same-origin' });
      const data = await res.json();
      const c = data && data.detected_values && data.detected_values.country;
      if (!c || !c.handle) return null;
      const result = { code: c.handle, name: c.name || nameOf(c.handle) };
      try { sessionStorage.setItem('oora-detected-country', JSON.stringify(result)); } catch (e) {}
      return result;
    } catch (e) {
      return null;
    }
  };

  const start = () => {
    convert(document);
    detectCountry().then((c) => { detected = c; applyNotice(document); });
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const root = n.parentNode || document;
          convert(root);
          applyNotice(root);
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
