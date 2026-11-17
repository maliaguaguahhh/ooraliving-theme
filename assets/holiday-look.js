/*
  Holiday look decorations (see snippets/holiday-look.liquid).

  Reads the config printed in #HolidayLookConfig and decorates hooks the theme already has:
  the logo link [data-holiday-logo], the gift wrap card, the price row and the homepage hero.
  Nothing here changes store content: ornaments are aria-hidden overlays, and the price roll
  always ends on the exact text Liquid rendered. With reduced motion nothing moves.

  The bow and heart shapes are adapted from Microsoft Fluent Emoji
  (MIT License, Copyright (c) Microsoft Corporation, https://github.com/microsoft/fluentui-emoji).
  The wreath, price tag, lantern and envelope are drawn for oora.
*/
(function () {
  'use strict';

  /* ---------- Pure helpers (tested in ops/holiday-look.test.mjs) ---------- */

  function choiceKey(value) {
    const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    return key || 'none';
  }

  function formatNumber(cents, decimals, thousands, decimal) {
    const [whole, fraction] = (cents / 100).toFixed(decimals).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return fraction ? grouped + decimal + fraction : grouped;
  }

  // Replaces the number inside an already formatted price ("$44.99 USD", "10,13 €") with
  // another amount in the same style, so the currency symbol and code never change.
  function priceText(original, cents) {
    return String(original).replace(/\d(?:[\d.,'\s]*\d)?/, (number) => {
      const decimalMatch = number.match(/([.,])(\d{2})$/);
      const decimal = decimalMatch ? decimalMatch[1] : '';
      const body = decimalMatch ? number.slice(0, -3) : number;
      const thousandsMatch = body.match(/[.,'\s]/);
      const thousands = thousandsMatch ? thousandsMatch[0] : '';
      return formatNumber(cents, decimal ? 2 : 0, thousands, decimal || '.');
    });
  }

  function rollCents(from, to, t) {
    const eased = 1 - Math.pow(1 - t, 3);
    return Math.round(from + (to - from) * eased);
  }

  function ringLeaves({ cx, cy, r, count, tilt, offset = 0 }) {
    return Array.from({ length: count }, (_, k) => {
      const a = offset + (k / count) * Math.PI * 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, angle: (a * 180) / Math.PI + 90 + tilt };
    });
  }

  window.HolidayLook = { choiceKey, priceText, rollCents, ringLeaves };

  if (typeof document === 'undefined') return;

  /* ---------- Ornament library (SVG markup, colored by classes in holiday-look.css) ---------- */

  const BOW_OUT = 'M15.995 9.772 7.46 5.413C4.96 4.143 2 5.953 2 8.753v7.98c0 2.8 2.96 4.62 5.46 3.34l.689-.352-2.839 7.363c-.23.586.38 1.153.95.894l2.26-1.013c.36-.159.78 0 .94.357l.99 2.256c.25.577 1.08.557 1.31-.029l4.23-10.978 4.23 10.978c.23.586 1.06.606 1.31.029l.99-2.256c.16-.357.58-.516.94-.357l2.26 1.013c.57.259 1.18-.308.95-.894l-2.842-7.369.702.358c2.5 1.28 5.46-.54 5.46-3.34v-7.98c0-2.8-2.96-4.61-5.46-3.34z';
  const BOW_IN = 'M14.254 6h3.492C18.993 6 20 6.998 20 8.21v8.371l4.54-2.318c2.36-1.2 5.14.36 5.43 2.91-.28 2.55-3.06 4.12-5.43 2.91l-4.725-2.412A2.25 2.25 0 0 1 17.746 19h-3.492a2.25 2.25 0 0 1-2.071-1.333L7.45 20.083c-2.36 1.21-5.15-.36-5.43-2.91.28-2.55 3.06-4.12 5.43-2.91L12 16.586V8.21C12 6.987 13.007 6 14.254 6z';
  const HEART_OUT = 'M6 6c4.665-2.332 8.5.5 10 2.5C17.5 6.5 21.335 3.668 26 6c6 3 4.5 10.5 0 15-2.196 2.196-6.063 6.063-8.891 8.214a1.75 1.75 0 0 1-2.187-.041C12.33 27.08 8.165 23.165 6 21 1.5 16.5 0 9 6 6z';
  const HEART_IN = 'M11.946 5.537C10.26 4.95 8.225 4.887 6 6 0 9 1.5 16.5 6 21c2.165 2.165 6.33 6.08 8.923 8.173a1.75 1.75 0 0 0 2.186.04c.254-.193.517-.4.786-.619-2.855-2.142-6.861-5.518-9.036-7.462C3.902 16.702 2.25 9.318 8.86 6.364a9.5 9.5 0 0 1 3.086-.827zM16 8.5v3.05c1.27-2.685 4.425-6.27 9.658-5.712C21.148 3.806 17.463 6.55 16 8.5z';

  const bow = (x, y, scale) =>
    `<g transform="translate(${x} ${y}) scale(${scale}) translate(-16 -12.5)"><path class="hl-main-l" d="${BOW_OUT}"/><path class="hl-main-d" d="${BOW_IN}"/></g>`;

  const heart = (x, y, scale) =>
    `<g transform="translate(${x} ${y}) scale(${scale}) translate(-16 -17)"><path class="hl-main-l" d="${HEART_OUT}"/><path class="hl-main-d" d="${HEART_IN}"/><ellipse cx="23.5" cy="12.6" rx="2.8" ry="4.7" transform="rotate(30 23.5 12.6)" fill="#fff" fill-opacity=".35"/></g>`;

  const leaves = (ring, rx, ry, cls) =>
    ringLeaves(ring)
      .map(({ x, y, angle }) => {
        const [cx, cy, deg] = [x.toFixed(2), y.toFixed(2), angle.toFixed(1)];
        return `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${cx} ${cy})"/>`;
      })
      .join('');

  const berries = (points, r) => points.map(([x, y]) => `<circle class="hl-berry" cx="${x}" cy="${y}" r="${r}"/>`).join('');

  const hanging = (x, y, body) =>
    `<g class="hl-swing" style="transform-origin:${x}px ${y}px">${body}</g>`;

  // Gift wrap ornaments: viewBox 0 0 32 32, shown in the photo's top-left corner.
  const GIFT_WRAP = {
    bow: () => bow(16, 12.5, 1),
    wreath: () =>
      leaves({ cx: 16, cy: 17.5, r: 10.6, count: 20, tilt: 28 }, 2.5, 1.15, 'hl-acc-l') +
      leaves({ cx: 16, cy: 17.5, r: 8.2, count: 16, tilt: 28, offset: 0.2 }, 2.2, 1, 'hl-acc-d') +
      berries([[10.6, 9.6], [21.4, 9.6], [8.6, 12.4]], 1.05) +
      bow(16, 7.2, 0.44),
    heart: () => heart(16, 17, 1),
    envelope: () =>
      '<path class="hl-main-l" d="M28.869 2H3.141A1.14 1.14 0 0 0 2 3.14v25.72c0 .63.51 1.14 1.141 1.14h25.718c.63 0 1.141-.51 1.141-1.14V3.14A1.13 1.13 0 0 0 28.869 2z"/>' +
      '<path class="hl-main-d" d="M21.134 12.894 29.98 7.56v1.17l-8.399 5.063A6 6 0 1 1 10.415 13.803L2 8.73V7.56l8.858 5.346A6 6 0 0 1 21.134 12.894z"/>' +
      '<circle class="hl-paper" cx="16" cy="16" r="3.4"/>',
  };

  // Logo ornaments: viewBox 0 0 291 64 = the logo image. The first "o" is centered at
  // (31.5, 31.5) with radius 32; the period at (282.5, 55.5) with radius 8.
  const PERIOD = [282.5, 55.5];
  const LOGO = {
    'price-tag': () =>
      hanging(...PERIOD,
        '<path class="hl-string" d="M282.5 56v12" stroke-width="2.2"/>' +
        '<path class="hl-badge-bg" d="M274 76l8.5-7 8.5 7v28h-17z"/>' +
        '<circle class="hl-badge-sh" cx="282.5" cy="77.5" r="2.3"/>' +
        '<path class="hl-badge-line" d="M277.5 87h10M277.5 94h10" stroke-width="2.4"/>'),
    wreath: () =>
      leaves({ cx: 31.5, cy: 31.5, r: 33, count: 14, tilt: 28 }, 7.5, 3.4, 'hl-acc-l') +
      leaves({ cx: 31.5, cy: 31.5, r: 25, count: 10, tilt: 28, offset: 0.3 }, 6.5, 3, 'hl-acc-d') +
      berries([[16, 8], [47, 8], [11, 14]], 3.4) +
      bow(31.5, 1, 1.05),
    heart: () => heart(282.5, 54, 0.8),
    lantern: () =>
      hanging(...PERIOD,
        '<path class="hl-string" d="M282.5 56v10" stroke-width="2.2"/>' +
        '<rect class="hl-paper" x="276.5" y="65" width="12" height="4" rx="1.5"/>' +
        '<ellipse class="hl-main-l" cx="282.5" cy="79" rx="13" ry="11"/>' +
        '<path class="hl-main-d" d="M282.5 68c-6 3-6 19 0 22 6-3 6-19 0-22z"/>' +
        '<rect class="hl-paper" x="276.5" y="89" width="12" height="4" rx="1.5"/>' +
        '<path class="hl-string" d="M282.5 93v9" stroke-width="2"/>'),
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function ornamentSvg(viewBox, className, markup) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = markup;
    return svg;
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Decorations ---------- */

  function decorateLogo(config) {
    const draw = LOGO[choiceKey(config.logo)];
    if (!draw) return;
    document.querySelectorAll('[data-holiday-logo]').forEach((link) => {
      if (link.querySelector('.hl-logo-orn')) return;
      link.appendChild(ornamentSvg('0 0 291 64', 'hl-logo-orn hl-pop', draw()));
    });
  }

  function decorateGiftWrap(config) {
    const draw = GIFT_WRAP[choiceKey(config.giftWrap)];
    if (!draw) return;
    document.querySelectorAll('.gift-wrap-card__media').forEach((media) => {
      if (media.querySelector('.hl-gw-orn')) return;
      media.appendChild(ornamentSvg('0 0 32 32', 'hl-gw-orn', draw()));
    });
  }

  function playPriceRoll(row, sale, from, to) {
    const original = sale.textContent.trim();
    const start = performance.now() + 500;
    row.classList.add('hl-struck');
    sale.textContent = priceText(original, from);
    const step = (now) => {
      if (!sale.isConnected) return;
      const t = Math.min(1, Math.max(0, (now - start) / 800));
      sale.textContent = t >= 1 ? original : priceText(original, rollCents(from, to, t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setupPriceRoll(config) {
    if (!config.priceRoll || reducedMotion() || !('IntersectionObserver' in window)) return;
    document.querySelectorAll('.tapnest-product-hero__price-row').forEach((row) => {
      const badge = row.querySelector('[data-hl-compare]');
      const sale = row.querySelector('.xo-price__sale > .xo-price__item:not(.xo-price__item--del)');
      if (!badge || !sale || row.classList.contains('hl-roll')) return;
      const from = Number(badge.dataset.hlCompare);
      const to = Number(badge.dataset.hlPrice);
      if (!(from > to)) return;
      row.classList.add('hl-roll');
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        playPriceRoll(row, sale, from, to);
      }, { threshold: 0.6 });
      observer.observe(row);
    });
  }

  /* ---------- Hero effect ---------- */

  function resolveColor(cssValue) {
    const probe = document.createElement('i');
    probe.style.color = cssValue;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function heartPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.1, s * 0.1, -s, -s * 0.1, -s * 0.55, -s * 0.55);
    ctx.bezierCurveTo(-s * 0.25, -s * 0.85, 0, -s * 0.55, 0, -s * 0.35);
    ctx.bezierCurveTo(0, -s * 0.55, s * 0.25, -s * 0.85, s * 0.55, -s * 0.55);
    ctx.bezierCurveTo(s, -s * 0.1, s * 0.1, s * 0.1, 0, s * 0.35);
  }

  function petalPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, -s * 0.2, -s * 0.9);
    ctx.lineTo(0, -s * 0.6);
    ctx.closePath();
  }

  function effects(colors) {
    const outline = (ctx, p) => {
      if (p.c !== colors.white) return;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    };
    return {
      snow: {
        max: 16, rate: 0.18,
        make: () => ({ r: 1 + Math.random() * 1.7, vy: 0.35 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.25, c: colors.white }),
        draw: (ctx, p) => { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill(); outline(ctx, p); },
      },
      hearts: {
        max: 8, rate: 0.08,
        make: () => ({ r: 4 + Math.random() * 3, vy: 0.35 + Math.random() * 0.35, vx: (Math.random() - 0.5) * 0.2, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 0.01, c: pick([colors.main, colors.pale, colors.white]) }),
        draw: (ctx, p) => { ctx.rotate(p.rot); heartPath(ctx, p.r); ctx.fillStyle = p.c; ctx.fill(); outline(ctx, p); },
      },
      petals: {
        max: 10, rate: 0.1,
        make: () => ({ r: 4 + Math.random() * 2.5, vy: 0.45 + Math.random() * 0.4, vx: 0.15 + Math.random() * 0.35, rot: Math.random() * 6, vr: 0.015 + Math.random() * 0.02, flip: Math.random() * 6, c: pick([colors.pale, colors.paper, colors.white]) }),
        draw: (ctx, p) => { ctx.rotate(p.rot); ctx.scale(Math.cos(p.flip), 1); petalPath(ctx, p.r); ctx.fillStyle = p.c; ctx.fill(); ctx.strokeStyle = colors.outline; ctx.lineWidth = 0.5; ctx.stroke(); },
      },
      confetti: {
        max: 30, burst: true,
        make: () => ({ w: 3 + Math.random() * 3, h: 6 + Math.random() * 4, vy: 1.1 + Math.random() * 1.2, vx: (Math.random() - 0.5) * 0.8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, c: pick([colors.badge, colors.main, colors.pale, colors.white]) }),
        draw: (ctx, p) => { ctx.rotate(p.rot); const h = p.h * Math.abs(Math.cos(p.rot * 1.7)); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -h / 2, p.w, h); },
      },
    };
  }

  // Where the canvas goes in the homepage hero: right after the hero's background layer (the
  // absolutely positioned element with a negative z-index) and on the same z-index, so it paints
  // over the photo but under the text and buttons. Without such a layer it sits on top of the section.
  function heroLayer() {
    const main = document.querySelector('main') || document.getElementById('xo-main-content');
    const section = main && main.querySelector('.shopify-section');
    if (!section) return null;
    const background = Array.from(section.querySelectorAll('*')).find((el) => {
      const style = getComputedStyle(el);
      return style.position === 'absolute' && parseInt(style.zIndex, 10) < 0;
    });
    if (background) return { parent: background.parentElement, before: background.nextSibling, zIndex: getComputedStyle(background).zIndex };
    section.classList.add('hl-ambient-host');
    return { parent: section, before: section.firstChild, zIndex: '1' };
  }

  function setupAmbient(config) {
    const kind = choiceKey(config.ambient);
    const layer = config.template === 'index' && kind !== 'none' && !reducedMotion() && heroLayer();
    if (!layer) return;
    const colors = {
      white: resolveColor('#ffffff'),
      main: resolveColor('var(--hl-main-light)'),
      pale: resolveColor('var(--hl-main-pale)'),
      paper: resolveColor('var(--hl-paper)'),
      badge: resolveColor('var(--hl-badge-bg)'),
      outline: resolveColor('color-mix(in srgb, var(--hl-main-dark) 45%, transparent)'),
    };
    const effect = effects(colors)[kind];
    if (!effect) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hl-ambient';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.zIndex = layer.zIndex;
    layer.parent.insertBefore(canvas, layer.before);
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = layer.parent.clientWidth;
    const height = Math.min(layer.parent.clientHeight, window.innerHeight);
    canvas.style.height = height + 'px';
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const until = Date.now() + (Number(config.seconds) || 10) * 1000;
    const fadeFrom = height * 0.8;
    let particles = [];
    if (effect.burst) {
      particles = Array.from({ length: effect.max }, () => Object.assign(effect.make(), { x: Math.random() * width, y: -Math.random() * 160, a: 1, sway: Math.random() * 6 }));
    }
    let frame = null;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      const spawning = !effect.burst && Date.now() < until;
      if (spawning && particles.length < effect.max && Math.random() < effect.rate) {
        particles.push(Object.assign(effect.make(), { x: Math.random() * width, y: -8, a: 0.95, sway: Math.random() * 6 }));
      }
      particles = particles.filter((p) => {
        p.sway += 0.03;
        p.x += p.vx + Math.sin(p.sway) * 0.35;
        p.y += p.vy;
        if (p.vr) p.rot += p.vr;
        if (p.flip !== undefined) p.flip += 0.05;
        if (p.y > fadeFrom) p.a -= 0.025;
        return p.a > 0 && p.y < height + 10;
      });
      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y);
        effect.draw(ctx, p);
        ctx.restore();
      });
      frame = particles.length || spawning ? requestAnimationFrame(tick) : null;
      if (!frame) canvas.remove();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) { cancelAnimationFrame(frame); frame = null; }
      else if (!document.hidden && !frame && canvas.isConnected) frame = requestAnimationFrame(tick);
    });
    frame = requestAnimationFrame(tick);
  }

  /* ---------- Start ---------- */

  function readConfig() {
    const node = document.getElementById('HolidayLookConfig');
    try {
      return node ? JSON.parse(node.textContent) : null;
    } catch (error) {
      return null;
    }
  }

  function decorate(config) {
    decorateLogo(config);
    decorateGiftWrap(config);
    setupPriceRoll(config);
  }

  const config = readConfig();
  if (!config) return;
  decorate(config);
  setupAmbient(config);
  document.addEventListener('shopify:section:load', () => decorate(config));
})();
