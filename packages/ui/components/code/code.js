/* Copy button: [data-corn-copy="#selector"] copies the target's text. */
(function (Corn) {
  'use strict';

  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  Corn.copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); });
    }
    return Promise.resolve(fallback(text));
  };

  Corn.define('copy', '[data-corn-copy]', function (btn) {
    var label = btn.textContent;
    var timer = 0;
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-corn-copy'));
      var text = target ? target.textContent : '';
      (text ? Corn.copyText(text) : Promise.resolve(false)).then(function (ok) {
        clearTimeout(timer);
        btn.setAttribute('data-state', ok ? 'ok' : 'error');
        btn.textContent = ok ? '已复制' : '复制失败';
        timer = setTimeout(function () {
          btn.removeAttribute('data-state');
          btn.textContent = label;
        }, 1800);
      });
    });
  });
})(window.Corn);
