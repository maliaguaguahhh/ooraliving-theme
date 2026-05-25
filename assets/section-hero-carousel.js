(() => {
  if (window.__xoHeroCarouselScrollLock) {
    window.__xoHeroCarouselScrollLock.init();
    return;
  }

  const MOBILE_QUERY = '(max-width: 767px)';
  const SWIPE_THRESHOLD = 36;
  const LOCK_TOP_TOLERANCE = 40;
  const LOCK_VISIBLE_RATIO = 0.75;
  const NAV_COOLDOWN = 650;
  const initialized = new WeakSet();

  const getSlides = (carousel) =>
    Array.from(carousel.querySelectorAll('xo-carousel-list > xo-carousel-slide:not([xo-cloned])'));

  const getActiveIndex = (slides) => {
    const index = slides.findIndex((slide) => {
      const active = slide.getAttribute('xo-active');
      return slide.hasAttribute('xo-active') && active !== 'false';
    });

    return index >= 0 ? index : 0;
  };

  const isLockedInViewport = (section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= LOCK_TOP_TOLERANCE && rect.bottom >= window.innerHeight * LOCK_VISIBLE_RATIO;
  };

  const goToSlide = (slide, direction) => {
    const selector = direction > 0 ? 'xo-carousel-next' : 'xo-carousel-prev';
    const control = slide.querySelector(selector);
    if (control) {
      control.click();
    }
  };

  const setup = (section) => {
    if (initialized.has(section)) {
      return;
    }

    const carousel = section.querySelector('xo-carousel');
    if (!carousel) {
      return;
    }

    initialized.add(section);

    let startX = 0;
    let startY = 0;
    let navLocked = false;

    section.addEventListener(
      'touchstart',
      (event) => {
        if (!window.matchMedia(MOBILE_QUERY).matches || !event.touches.length) {
          return;
        }

        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      },
      { passive: true }
    );

    section.addEventListener(
      'touchmove',
      (event) => {
        if (!window.matchMedia(MOBILE_QUERY).matches || !event.touches.length || !isLockedInViewport(section)) {
          return;
        }

        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = startY - currentY;

        if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaY) < SWIPE_THRESHOLD) {
          return;
        }

        const slides = getSlides(carousel);
        if (slides.length <= 1) {
          return;
        }

        const activeIndex = getActiveIndex(slides);
        const isScrollingDown = deltaY > 0;
        const isFirstSlide = activeIndex === 0;
        const isLastSlide = activeIndex === slides.length - 1;

        if ((isScrollingDown && isLastSlide) || (!isScrollingDown && isFirstSlide)) {
          return;
        }

        event.preventDefault();

        if (navLocked) {
          return;
        }

        navLocked = true;
        goToSlide(slides[activeIndex], isScrollingDown ? 1 : -1);

        window.setTimeout(() => {
          navLocked = false;
          startX = currentX;
          startY = currentY;
        }, NAV_COOLDOWN);
      },
      { passive: false }
    );
  };

  const init = () => {
    document.querySelectorAll('.section-hero .hero-carousel').forEach(setup);
  };

  window.__xoHeroCarouselScrollLock = { init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('.section-hero .hero-carousel').forEach(setup);
  });
})();
