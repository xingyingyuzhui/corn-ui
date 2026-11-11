/* Stat count-up: [data-corn-count] animates once when first visible. */
(function (Corn) {
  'use strict';

  function format(n, decimals) {
    return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function run(el) {
    var target = parseFloat(el.getAttribute('data-corn-count'));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var card = el.closest('.corn-stat');
    if (card) card.classList.add('is-counting');
    if (Corn.reducedMotion()) {
      el.textContent = format(target, decimals) + suffix;
      return;
    }
    var start = performance.now();
    var dur = 1100;
    (function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  Corn.define('stat-count', '[data-corn-count]', function (el) {
    // Screen readers get the final value from a hidden twin; the counting
    // digits are aria-hidden so intermediate numbers are never announced.
    var twin = document.createElement('span');
    twin.className = 'corn-sr-only';
    twin.textContent = el.textContent.trim();
    el.setAttribute('aria-hidden', 'true');
    el.after(twin);
    if (!('IntersectionObserver' in window)) return run(el);
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        run(el);
      }
    }, { threshold: 0.4 });
    io.observe(el);
  });
})(window.Corn);
