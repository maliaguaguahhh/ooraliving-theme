(function () {
  if (window.xoBundleOfferCardLoaded) {
    return;
  }

  window.xoBundleOfferCardLoaded = true;

  const getQuantity = (card) => {
    const scope = card.closest('.xo-product-info-content, .xo-featured-product-content');
    const input = scope ? scope.querySelector('input[name="quantity"]') : null;
    const value = input ? Number(input.value) : 1;
    return value > 0 ? value : 1;
  };

  const getSelectedVariant = (card) => {
    const field = card.querySelector('[data-bundle-offer-variant]');
    if (!field) {
      return null;
    }

    return {
      id: field.value,
      available: field.dataset.available === 'true',
      ctaText: field.dataset.ctaText,
    };
  };

  const closeSelector = (selector) => {
    if (!selector) {
      return;
    }

    const trigger = selector.querySelector('[data-bundle-offer-trigger]');
    const menu = selector.querySelector('[data-bundle-offer-menu]');

    selector.classList.remove('is-open');

    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }

    if (menu) {
      menu.hidden = true;
    }
  };

  const openSelector = (selector) => {
    const trigger = selector.querySelector('[data-bundle-offer-trigger]');
    const menu = selector.querySelector('[data-bundle-offer-menu]');

    document.querySelectorAll('[data-bundle-offer-selector]').forEach((item) => {
      if (item !== selector) {
        closeSelector(item);
      }
    });

    selector.classList.add('is-open');

    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }

    if (menu) {
      menu.hidden = false;
    }
  };

  const toggleSelector = (selector) => {
    if (selector.classList.contains('is-open')) {
      closeSelector(selector);
      return;
    }

    openSelector(selector);
  };

  const selectOption = (option) => {
    const card = option.closest('[data-bundle-offer-card]');
    const selector = option.closest('[data-bundle-offer-selector]');
    const field = card ? card.querySelector('[data-bundle-offer-variant]') : null;
    const currentLabel = card ? card.querySelector('[data-bundle-offer-current-label]') : null;
    const currentSwatch = card ? card.querySelector('[data-bundle-offer-current-swatch]') : null;

    if (!card || !field) {
      return;
    }

    field.value = option.dataset.variantId || '';
    field.dataset.available = option.dataset.available || 'false';
    field.dataset.ctaText = option.dataset.ctaText || '';

    card.querySelectorAll('[data-bundle-offer-option]').forEach((item) => {
      item.setAttribute('aria-selected', item === option ? 'true' : 'false');
    });

    if (currentLabel) {
      currentLabel.textContent = option.dataset.label || '';
    }

    if (currentSwatch) {
      currentSwatch.dataset.swatchHandle = option.dataset.swatchHandle || '';
      currentSwatch.setAttribute('style', option.dataset.swatchStyle || '');
    }

    closeSelector(selector);
    syncCard(card);
  };

  const syncCard = (card) => {
    const button = card.querySelector('xo-cart-add');
    const buttonText = button ? button.querySelector('.xo-btn__text, button span, button') : null;
    const primaryVariantId = card.dataset.primaryVariantId;
    const primaryAvailable = card.dataset.primaryAvailable === 'true';
    const selectedVariant = getSelectedVariant(card);

    if (!button || !primaryVariantId || !selectedVariant || !selectedVariant.id) {
      return;
    }

    const quantities = [getQuantity(card), 1];
    button.setAttribute('xo-product-id', `[${primaryVariantId},${selectedVariant.id}]`);
    button.setAttribute('xo-product-quantities', `[${quantities.join(',')}]`);

    if (primaryAvailable && selectedVariant.available) {
      button.removeAttribute('xo-disabled');
    } else {
      button.setAttribute('xo-disabled', '');
    }

    if (buttonText && selectedVariant.ctaText) {
      buttonText.textContent = selectedVariant.ctaText;
    }
  };

  document.addEventListener('change', (event) => {
    const card = event.target.closest('[data-bundle-offer-card]');
    if (card) {
      syncCard(card);
      return;
    }

    if (event.target.matches('input[name="quantity"]')) {
      document.querySelectorAll('[data-bundle-offer-card]').forEach(syncCard);
    }
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-bundle-offer-trigger]');
    if (trigger) {
      const selector = trigger.closest('[data-bundle-offer-selector]');
      if (selector) {
        toggleSelector(selector);
      }
      return;
    }

    const option = event.target.closest('[data-bundle-offer-option]');
    if (option) {
      selectOption(option);
      return;
    }

    if (!event.target.closest('[data-bundle-offer-selector]')) {
      document.querySelectorAll('[data-bundle-offer-selector]').forEach(closeSelector);
    }

    if (event.target.closest('xo-cart-quantity-plus, xo-cart-quantity-minus')) {
      window.setTimeout(() => {
        document.querySelectorAll('[data-bundle-offer-card]').forEach(syncCard);
      }, 0);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    document.querySelectorAll('[data-bundle-offer-selector]').forEach(closeSelector);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-bundle-offer-card]').forEach(syncCard);
  });
})();
