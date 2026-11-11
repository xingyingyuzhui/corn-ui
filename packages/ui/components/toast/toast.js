/* Toast: Corn.toast(options) + declarative [data-corn-toast] triggers.
   Lifetime is driven by the timer bar's animationend, so hover/focus pause
   (CSS animation-play-state) also pauses the dismissal. */
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

    var gone = false;
    function dismiss() {
      if (gone) return;
      gone = true;
      clearTimeout(clock.id);
      toast.setAttribute('data-leaving', '');
      Corn.afterAnimation(toast, function () { toast.remove(); });
    }
    close.addEventListener('click', dismiss);
    // Normal motion: the timer bar's animation is the clock (CSS pauses it on
    // hover/focus). Reduced motion: the bar is static (--corn-loop: paused),
    // so a JS clock runs instead and pauses on the same hover/focus.
    var clock = { id: 0, left: life, since: 0 };
    if (Corn.reducedMotion()) {
      var run = function () { clock.since = Date.now(); clock.id = setTimeout(dismiss, clock.left); };
      var hold = function () {
        if (!clock.id) return;
        clearTimeout(clock.id);
        clock.id = 0;
        clock.left -= Date.now() - clock.since;
      };
      var resume = function () { if (!clock.id && !gone && !toast.matches(':hover, :focus-within')) run(); };
      toast.addEventListener('mouseenter', hold);
      toast.addEventListener('focusin', hold);
      toast.addEventListener('mouseleave', resume);
      toast.addEventListener('focusout', function () { setTimeout(resume, 0); });
      run();
    } else {
      timer.addEventListener('animationend', dismiss);
    }
    list.appendChild(toast);
    var items = list.querySelectorAll('.corn-toast:not([data-leaving])');
    if (items.length > MAX) items[0].querySelector('.corn-toast-close').click();
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
