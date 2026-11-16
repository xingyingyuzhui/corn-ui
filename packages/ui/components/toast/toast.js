/* Toast: Corn.toast(options) + declarative [data-corn-toast] triggers.
   A JS monotonic clock owns expiry in every motion mode — hover/focus pauses
   it, and the timer bar is a pure visual that is re-synced (never restarted)
   whenever the global motion preference changes. */
(function (Corn) {
  'use strict';
  var MAX = 3;
  var region = null;

  function getRegion() {
    if (region && document.body.contains(region)) return region;
    region = document.createElement('div');
    region.className = 'corn-toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
    return region;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  Corn.toast = function (opts) {
    opts = opts || {};
    var list = getRegion();
    var toast = el('div', 'corn-toast' + (opts.tone ? ' corn-toast-' + opts.tone : ''));
    var life = Math.max(1500, Number(opts.duration) || 4000);
    toast.style.setProperty('--_life', life + 'ms');
    toast.appendChild(el('p', 'corn-toast-title', opts.title || '完成'));
    var close = el('button', 'corn-toast-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭通知');
    toast.appendChild(close);
    if (opts.message) toast.appendChild(el('p', 'corn-toast-body', opts.message));
    var timer = el('span', 'corn-toast-timer');
    toast.appendChild(timer);

    // --- lifetime clock: pause on hover/focus, expire on a real deadline ---
    var gone = false;
    var clockId = 0, left = life, since = 0;
    var reduced = Corn.reducedMotion();
    function remaining() {
      return Math.max(0, left - (clockId ? performance.now() - since : 0));
    }
    function run() {
      left = remaining();
      since = performance.now();
      clockId = setTimeout(dismiss, left);
    }
    function hold() {
      if (!clockId) return;
      var rem = remaining(); // capture BEFORE clearing the clock
      clearTimeout(clockId);
      clockId = 0;
      left = rem;
    }
    function resume() {
      if (clockId || gone || toast.matches(':hover, :focus-within')) return;
      run();
    }

    // --- timer bar: visual only, kept in step with `remaining()` ---
    function syncBar() {
      var rem = remaining(), frac = Math.max(0, rem / life);
      toast.style.setProperty('--_remaining', frac);
      toast.style.setProperty('--_left', rem + 'ms');
      // restart the CSS clock from `frac` in BOTH directions — under reduce,
      // --corn-loop simply keeps the restarted animation on its from frame.
      timer.style.animation = 'none';
      void timer.offsetWidth;
      timer.style.animation = '';
    }
    function onPref() {
      var now = Corn.reducedMotion();
      if (now === reduced) return;
      reduced = now;
      syncBar();
    }
    var prefObs = new MutationObserver(onPref);
    prefObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-corn-motion'] });
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', onPref);

    function dismiss() {
      if (gone) return;
      gone = true;
      if (clockId) { clearTimeout(clockId); clockId = 0; }
      prefObs.disconnect();
      if (mq.removeEventListener) mq.removeEventListener('change', onPref);
      toast.setAttribute('data-leaving', '');
      Corn.afterAnimation(toast, function () { toast.remove(); });
    }
    close.addEventListener('click', dismiss);
    toast.addEventListener('mouseenter', hold);
    toast.addEventListener('focusin', hold);
    toast.addEventListener('mouseleave', resume);
    toast.addEventListener('focusout', function () { setTimeout(resume, 0); });

    list.appendChild(toast);
    var items = list.querySelectorAll('.corn-toast:not([data-leaving])');
    if (items.length > MAX) items[0].querySelector('.corn-toast-close').click();
    syncBar();
    if (!toast.matches(':hover, :focus-within')) run(); // appended under the cursor stays paused
    return { close: dismiss, element: toast };
  };

  // Create the live region up front: a region inserted together with its
  // first message is often not announced by screen readers.
  Corn.define('toast-region', 'body', function () { getRegion(); });

  Corn.define('toast-trigger', '[data-corn-toast]', function (btn) {
    btn.addEventListener('click', function () {
      Corn.toast({
        title: btn.getAttribute('data-toast-title'),
        message: btn.getAttribute('data-toast-message'),
        tone: btn.getAttribute('data-toast-tone'),
        duration: btn.getAttribute('data-toast-duration')
      });
    });
  });
})(window.Corn);
