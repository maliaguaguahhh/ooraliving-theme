(() => {
  if (window.ooraShortcutDisclosure) return;
  window.ooraShortcutDisclosure = true;
  function setup(root = document) {
    root.querySelectorAll('[data-shortcut-disclosure]').forEach(library => {
      if (library.dataset.initialized || window.Shopify?.designMode) return;
      library.dataset.initialized = 'true';
      const cards = [...library.querySelectorAll('.shortcut-preset-library__card')];
      const toggle = library.querySelector('[data-shortcut-toggle]');
      const wrapper = library.querySelector('.shortcut-preset-library__disclosure');
      if (!toggle || !wrapper) return;
      const mobile = window.matchMedia('(max-width: 749px)');
      let expanded = false;
      function update() {
        const count = mobile.matches ? 4 : 6;
        cards.forEach((card, index) => { card.hidden = !expanded && index >= count; });
        wrapper.hidden = cards.length <= count;
        toggle.setAttribute('aria-expanded', String(expanded));
        // Keep the existing theme button markup and animation labels in sync.
        const label = expanded ? toggle.dataset.showFewer : toggle.dataset.showAll;
        toggle.setAttribute('aria-label', label);
        toggle.querySelectorAll('.xo-btn__text').forEach(node => {
          node.textContent = label;
          if (node.hasAttribute('data-text')) node.setAttribute('data-text', label);
        });
      }
      toggle.addEventListener('click', () => {
        expanded = !expanded;
        update();
        if (!expanded) {
          const top = library.getBoundingClientRect().top;
          if (top < 0) library.scrollIntoView({ block: 'start', behavior: 'instant' });
          toggle.focus({ preventScroll: true });
        }
      });
      mobile.addEventListener('change', update);
      document.addEventListener('shopify:section:unload', event => {
        if (event.target.contains(library)) mobile.removeEventListener('change', update);
      }, { once: true });
      update();
    });
  }
  setup();
  document.addEventListener('shopify:section:load', event => setup(event.target));
})();
