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
      toast.setAttribute('data-leaving', '');
      Corn.afterAnimation(toast, function () { toast.remove(); });
    }
    close.addEventListener('click', dismiss);
    if (Corn.reducedMotion()) {
      // timer bar is frozen in reduced motion; fall back to a plain timeout
      setTimeout(dismiss, life);
    } else {
      timer.addEventListener('animationend', dismiss);
    }
    list.appendChild(toast);
    var items = list.querySelectorAll('.corn-toast:not([data-leaving])');
    if (items.length > MAX) items[0].querySelector('.corn-toast-close').click();
    return { close: dismiss, element: toast };
  };

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
