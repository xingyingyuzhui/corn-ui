/* Demo site: theme / motion toggles, scroll reveal, swatch copy. */
(function () {
  'use strict';
  var root = document.documentElement;
  var PREFS = {
    theme: { attr: 'data-corn-theme', on: 'dark', off: 'light', key: 'corn-theme' },
    motion: { attr: 'data-corn-motion', on: 'reduce', off: 'full', key: 'corn-motion' }
  };

  function isOn(p) {
    var v = root.getAttribute(p.attr);
    if (v) return v === p.on;
    if (p.key === 'corn-motion') return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return false;
  }

  document.querySelectorAll('[data-site-toggle]').forEach(function (btn) {
    var p = PREFS[btn.getAttribute('data-site-toggle')];
    if (!p) return;
    btn.setAttribute('aria-pressed', String(isOn(p)));
    btn.addEventListener('click', function () {
      var value = isOn(p) ? p.off : p.on;
      root.setAttribute(p.attr, value);
      btn.setAttribute('aria-pressed', String(value === p.on));
      try { localStorage.setItem(p.key, value); } catch (e) { /* not persisted */ }
    });
  });

  /* reveal on scroll; everything already on screen appears in staggered order */
  var items = document.querySelectorAll('[data-reveal]');
  function showAll() { items.forEach(function (el) { el.classList.add('is-in'); }); }
  if (!('IntersectionObserver' in window) || (window.Corn && window.Corn.reducedMotion())) {
    showAll();
  } else {
    var MAX_STEP = 4; // stagger at most 4 × --corn-stagger (240ms)
    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (en) { return en.isIntersecting; }).forEach(function (en, n) {
        en.target.style.setProperty('--reveal-i', String(Math.min(n, MAX_STEP)));
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* swatches: copy var(--corn-*) */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn || !window.CornDemo) return;
    var label = btn.textContent;
    window.CornDemo.copy(btn.getAttribute('data-copy')).then(function (ok) {
      btn.setAttribute('data-state', ok ? 'ok' : 'error');
      btn.textContent = ok ? '已复制 ✓' : '复制失败';
      setTimeout(function () {
        btn.removeAttribute('data-state');
        btn.textContent = label;
      }, 1600);
    });
  });
})();
