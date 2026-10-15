(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section-image-with-text-style-10'));
  if (!sections.length) return;

  var videos = [];
  var userAgent = window.navigator.userAgent || '';
  var referrer = document.referrer || '';
  var isIOS = /iP(hone|od|ad)/i.test(userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  var isMobile = isIOS || /Android|Mobile|iPhone|iPad|iPod/i.test(userAgent) || (window.navigator.maxTouchPoints || 0) > 1;
  var isKnownProblemWebView = /tiktok|musical_ly|bytedance|aweme|trill|ttwebview|ttnet|byte/i.test(userAgent + ' ' + referrer);
  var debugEvents = [];
  var debugPanel;
  var debugTapCount = 0;
  var debugTapTimer;

  if (isKnownProblemWebView) {
    document.documentElement.classList.add('xo-tiktok-webview');
  }

  function logDebugEvent(message) {
    debugEvents.push(Math.round(window.performance.now()) + 'ms ' + message);
    if (debugEvents.length > 18) debugEvents.shift();
    renderDebugPanel();
  }

  function isElementInViewport(element) {
    var rect = element.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
  }

  function lockBackgroundVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.controls = false;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.disableRemotePlayback = true;
    video.removeAttribute('controls');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', 'true');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'false');
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
  }

  function pauseSectionVideos(section) {
    Array.prototype.slice.call(section.querySelectorAll('.xo-section-bg-image video')).forEach(function (video) {
      lockBackgroundVideo(video);
      video.pause();
      video.removeAttribute('autoplay');
      video.preload = 'none';
      video.setAttribute('preload', 'none');
    });
  }

  function activatePosterFallback(section) {
    if (!section || section.classList.contains('xo-use-video-poster-fallback')) return;
    var poster = section.querySelector('.xo-video-poster-fallback');
    if (!poster) {
      logDebugEvent('fallback skipped: no poster');
      return;
    }
    section.classList.add('xo-use-video-poster-fallback');
    pauseSectionVideos(section);
    logDebugEvent('fallback activated: ' + (section.id || section.className));
  }

  function isUsableVideo(video) {
    var style = window.getComputedStyle(video);
    return style.display !== 'none' && style.visibility !== 'hidden' && video.getClientRects().length > 0;
  }

  function isInViewport(video) {
    return isElementInViewport(video);
  }

  function shouldUseFallbackForSection(section) {
    if (!section.querySelector('.xo-video-poster-fallback')) return false;
    if (isKnownProblemWebView) return true;
    if (!isMobile) return false;

    var visibleVideos = Array.prototype.slice.call(section.querySelectorAll('.xo-section-bg-image video')).filter(function (video) {
      return isUsableVideo(video) && isInViewport(video);
    });
    if (!visibleVideos.length) return false;

    return visibleVideos.some(function (video) {
      return video.getAttribute('data-autoplay-blocked') === 'true' || video.getAttribute('data-autoplay-stalled') === 'true' || video.paused;
    });
  }

  function activateBlockedMobileFallbacks() {
    sections.forEach(function (section) {
      if (shouldUseFallbackForSection(section)) {
        activatePosterFallback(section);
      }
    });
  }

  function playInline(video) {
    var section = video.closest('.section-image-with-text-style-10');
    if (isKnownProblemWebView) {
      logDebugEvent('known webview: direct fallback');
      activatePosterFallback(section);
      return;
    }

    lockBackgroundVideo(video);
    if (!isUsableVideo(video) || !isInViewport(video)) return;

    if (video.readyState === 0) {
      try {
        video.load();
      } catch (error) {
        // Ignore load errors; play() below reports autoplay failures.
      }
    }

    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        video.setAttribute('data-autoplay-blocked', 'true');
        logDebugEvent('play rejected');
        activatePosterFallback(section);
      });
    }
  }

  function markStalledVideos() {
    if (!isMobile) return;

    videos.forEach(function (video) {
      var section = video.closest('.section-image-with-text-style-10');
      if (!section || section.classList.contains('xo-use-video-poster-fallback')) return;
      if (!isUsableVideo(video) || !isInViewport(video)) return;

      var firstTime = Number(video.getAttribute('data-autoplay-check-start') || video.currentTime || 0);
      var currentTime = Number(video.currentTime || 0);
      var hasAdvanced = currentTime - firstTime > 0.15;

      if (!hasAdvanced) {
        video.setAttribute('data-autoplay-stalled', 'true');
        logDebugEvent('stalled ct=' + currentTime.toFixed(3) + ' start=' + firstTime.toFixed(3));
        activatePosterFallback(section);
      }
    });
  }

  function queueVideoProgressCheck(delay) {
    logDebugEvent('queue progress check ' + delay + 'ms');
    videos.forEach(function (video) {
      if (!video.hasAttribute('data-autoplay-check-start')) {
        video.setAttribute('data-autoplay-check-start', String(video.currentTime || 0));
      }
    });
    window.setTimeout(markStalledVideos, delay);
  }

  function getSectionDebug(section, index) {
    var video = section.querySelector('.xo-section-bg-image video');
    var poster = section.querySelector('.xo-video-poster-fallback');
    var videoStyle = video ? window.getComputedStyle(video) : null;
    var posterStyle = poster ? window.getComputedStyle(poster) : null;
    return [
      'S' + (index + 1) + ' id=' + (section.id || '(none)'),
      ' class=' + section.className,
      video
        ? ' video paused=' + video.paused + ' ct=' + Number(video.currentTime || 0).toFixed(3) + ' ready=' + video.readyState + ' network=' + video.networkState + ' blocked=' + video.getAttribute('data-autoplay-blocked') + ' stalled=' + video.getAttribute('data-autoplay-stalled') + ' display=' + videoStyle.display + ' opacity=' + videoStyle.opacity + ' visibility=' + videoStyle.visibility
        : ' video=(none)',
      poster
        ? ' poster complete=' + poster.complete + ' natural=' + poster.naturalWidth + 'x' + poster.naturalHeight + ' display=' + posterStyle.display
        : ' poster=(none)'
    ].join('\n');
  }

  function getDebugText() {
    return [
      'OORA video debug',
      'ua=' + userAgent,
      'ref=' + referrer,
      'mobile=' + isMobile + ' ios=' + isIOS + ' knownWV=' + isKnownProblemWebView,
      'htmlClass=' + document.documentElement.className,
      'viewport=' + window.innerWidth + 'x' + window.innerHeight + ' dpr=' + window.devicePixelRatio,
      'sections=' + sections.length + ' videos=' + videos.length,
      sections.map(getSectionDebug).join('\n'),
      'events:',
      debugEvents.join('\n')
    ].join('\n');
  }

  function renderDebugPanel() {
    if (!debugPanel) return;
    debugPanel.textContent = getDebugText();
  }

  function showDebugPanel() {
    if (!debugPanel) {
      debugPanel = document.createElement('pre');
      debugPanel.setAttribute('aria-label', 'OORA video debug');
      debugPanel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:62vh;overflow:auto;z-index:2147483647;background:rgba(0,0,0,.88);color:#00ff90;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;text-align:left;';
      document.body.appendChild(debugPanel);
    }
    renderDebugPanel();
  }

  function installDebugGesture() {
    document.addEventListener('click', function (event) {
      var inTopLeft = event.clientX < 180 && event.clientY < 180;
      var inHeader = event.target && event.target.closest && event.target.closest('header, .xo-header, a[href="/"], .header__heading-link');
      if (!inTopLeft && !inHeader) return;

      debugTapCount += 1;
      window.clearTimeout(debugTapTimer);
      debugTapTimer = window.setTimeout(function () {
        debugTapCount = 0;
      }, 1800);

      if (debugTapCount >= 5) {
        debugTapCount = 0;
        showDebugPanel();
      }
    }, true);
  }

  function playVisibleBackgroundVideos() {
    if (isKnownProblemWebView) {
      sections.forEach(activatePosterFallback);
      return;
    }

    videos.forEach(function (video) {
      if (isUsableVideo(video) && isInViewport(video)) {
        playInline(video);
      } else if (!video.paused) {
        video.pause();
      }
    });
    activateBlockedMobileFallbacks();
  }

  function lockBackgroundVideos() {
    videos = [];
    sections.forEach(function (section) {
      Array.prototype.slice.call(section.querySelectorAll('.xo-section-bg-image video')).forEach(function (video) {
        lockBackgroundVideo(video);
        if (video.getAttribute('data-oora-debug-events') !== 'true') {
          video.setAttribute('data-oora-debug-events', 'true');
          ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'play', 'playing', 'pause', 'waiting', 'stalled', 'suspend', 'error', 'timeupdate'].forEach(function (eventName) {
            video.addEventListener(eventName, function () {
              if (eventName === 'timeupdate' && Number(video.currentTime || 0) > 0.25) return;
              logDebugEvent(eventName + ' ct=' + Number(video.currentTime || 0).toFixed(3) + ' ready=' + video.readyState);
            });
          });
        }
        videos.push(video);
      });
    });
  }

  function queuePlayVisibleBackgroundVideos() {
    lockBackgroundVideos();
    window.requestAnimationFrame(playVisibleBackgroundVideos);
    window.setTimeout(playVisibleBackgroundVideos, 250);
    window.setTimeout(playVisibleBackgroundVideos, 1000);
  }

  lockBackgroundVideos();
  installDebugGesture();
  logDebugEvent('init');
  if (isKnownProblemWebView) {
    playVisibleBackgroundVideos();
    return;
  }

  queuePlayVisibleBackgroundVideos();
  window.setTimeout(activateBlockedMobileFallbacks, 600);
  window.setTimeout(activateBlockedMobileFallbacks, 1400);
  window.setTimeout(activateBlockedMobileFallbacks, 2500);
  queueVideoProgressCheck(1200);
  queueVideoProgressCheck(2500);
  queueVideoProgressCheck(4000);

  window.addEventListener('load', queuePlayVisibleBackgroundVideos, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) queuePlayVisibleBackgroundVideos();
  });

  window.addEventListener('pageshow', queuePlayVisibleBackgroundVideos);
  window.addEventListener('resize', queuePlayVisibleBackgroundVideos);
  window.addEventListener('orientationchange', queuePlayVisibleBackgroundVideos);

  sections.forEach(function (section) {
    section.addEventListener('loadedmetadata', queuePlayVisibleBackgroundVideos, true);
    section.addEventListener('loadeddata', queuePlayVisibleBackgroundVideos, true);
    section.addEventListener('canplay', queuePlayVisibleBackgroundVideos, true);
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function () {
        queuePlayVisibleBackgroundVideos();
      },
      { rootMargin: '200px 0px', threshold: [0, 0.1, 0.5] }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
