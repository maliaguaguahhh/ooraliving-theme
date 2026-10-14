if (!customElements.get('nfc-tutorials')) {
  customElements.define('nfc-tutorials', class extends HTMLElement {
    connectedCallback() {
      this.abort?.abort();
      this.abort = new AbortController();
      const { signal } = this.abort;
      this.addEventListener('pointerdown', () => {
        this.dataset.focusInput = 'pointer';
      }, { signal });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') this.dataset.focusInput = 'keyboard';
      }, { signal });
      this.dialog = this.querySelector('dialog');
      this.player = this.querySelector('.nfc-tutorials__player');
      this.rail = this.querySelector('.nfc-tutorials__rail');
      const navigation = this.querySelector('.nfc-tutorials__navigation');
      const previous = this.querySelector('[data-nfc-prev]');
      const next = this.querySelector('[data-nfc-next]');
      const updateNavigation = () => {
        const overflow = this.rail.scrollWidth > this.rail.clientWidth + 2;
        navigation.hidden = !overflow;
        previous.disabled = this.rail.scrollLeft <= 2;
        next.disabled = this.rail.scrollLeft + this.rail.clientWidth >= this.rail.scrollWidth - 2;
      };
      this.addEventListener('click', (event) => {
        const link = event.target.closest('[data-nfc-open]');
        if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && typeof this.dialog.showModal === 'function') {
          const template = link.parentElement.querySelector('[data-nfc-media]');
          if (!template?.content.firstElementChild) return;
          event.preventDefault();
          this.dataset.focusInput = event.detail === 0 ? 'keyboard' : 'pointer';
          this.opener = link;
          this.querySelector('.nfc-tutorials__dialog-title').textContent = link.dataset.nfcTitle;
          this.player.replaceChildren(template.content.cloneNode(true));
          this.previousOverflow = document.documentElement.style.overflow;
          document.documentElement.style.overflow = 'hidden';
          this.dialog.showModal();
          const video = this.player.querySelector('video');
          if (video) this.startVideo(video, link);
        }
        if (event.target.closest('[data-nfc-close]')) this.dialog.close();
      }, { signal });
      this.dialog.addEventListener('click', (event) => {
        if (event.target !== this.dialog) return;
        const bounds = this.dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.dialog.close();
      }, { signal });
      this.dialog.addEventListener('close', () => this.cleanup(), { signal });
      const scroll = (direction) => this.rail.scrollBy({ left: direction * (this.rail.firstElementChild?.getBoundingClientRect().width || 300), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      previous.addEventListener('click', () => scroll(-1), { signal });
      next.addEventListener('click', () => scroll(1), { signal });
      this.rail.addEventListener('scroll', updateNavigation, { signal, passive: true });
      this.resize?.disconnect();
      this.resize = new ResizeObserver(updateNavigation);
      this.resize.observe(this.rail);
      updateNavigation();
    }
    startVideo(video, link) {
      this.playbackAbort?.abort();
      this.playbackAbort = new AbortController();
      const { signal } = this.playbackAbort;
      // Start resource selection explicitly after mounting the cloned template.
      // Keep play() in the original click handler for Safari's user activation.
      video.autoplay = false;
      video.playsInline = true;
      video.preload = 'auto';
      const cover = document.createElement('div');
      cover.className = 'nfc-tutorials__loading';
      const thumbnail = link.querySelector('img');
      if (thumbnail) {
        const poster = document.createElement('img');
        poster.src = thumbnail.currentSrc || thumbnail.src;
        poster.alt = '';
        cover.append(poster);
      }
      const status = document.createElement('span');
      status.setAttribute('role', 'status');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Play video';
      cover.append(status, retry);
      this.player.append(cover);
      let attempt = 0;
      const clearTimer = () => clearTimeout(this.playbackTimer);
      const showRetry = () => {
        if (signal.aborted || !this.dialog.open) return;
        attempt += 1;
        clearTimer();
        video.pause();
        cover.hidden = false;
        status.textContent = video.error ? 'Video could not load. Please try again.' : 'Tap to play';
        retry.hidden = false;
      };
      const play = (reload = false) => {
        const currentAttempt = ++attempt;
        clearTimer();
        cover.hidden = false;
        status.textContent = 'Loading video…';
        retry.hidden = true;
        if (reload) video.load();
        // A pending play() is not proof that frames are actually playing.
        this.playbackTimer = setTimeout(showRetry, 15000);
        video.play().catch(() => {
          if (!signal.aborted && currentAttempt === attempt) showRetry();
        });
      };
      video.addEventListener('playing', () => {
        clearTimer();
        cover.hidden = true;
      }, { signal });
      video.addEventListener('error', showRetry, { signal });
      retry.addEventListener('click', () => play(Boolean(video.error) || video.readyState === 0), { signal });
      play(true);
    }
    cleanup() {
      clearTimeout(this.playbackTimer);
      this.playbackAbort?.abort();
      this.player?.querySelector('video')?.pause();
      this.player?.replaceChildren();
      if (this.previousOverflow !== undefined) {
        document.documentElement.style.overflow = this.previousOverflow;
        this.previousOverflow = undefined;
      }
      this.opener?.focus({ preventScroll: true });
    }
    disconnectedCallback() {
      this.cleanup();
      this.abort?.abort();
      this.resize?.disconnect();
    }
  });
}
