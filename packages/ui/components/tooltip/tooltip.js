/* Tooltip: Esc dismisses the bubble until the pointer/focus leaves
   (WCAG 1.4.13). Per-tip keydown covers the focused case; a capture listener
   dismisses hover-opened tips even when focus sits elsewhere. */
(function (Corn) {
  'use strict';

  function visible(tip) {
    if (tip.hasAttribute('data-dismissed')) return false;
    var bub = tip.querySelector('.corn-tooltip-bubble') || tip.lastElementChild;
    if (!bub) return false;
    var cs = getComputedStyle(bub);
    return cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  // First Esc hides any visible tooltip and stops here; with none visible the
  // key passes straight through so a parent dialog/menu can still consume it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    var live = [].filter.call(document.querySelectorAll('.corn-tooltip'), visible);
    if (!live.length) return;
    e.preventDefault();
    e.stopPropagation();
    live.forEach(function (t) { t.setAttribute('data-dismissed', ''); });
  }, true);

  Corn.define('tooltip', '.corn-tooltip', function (tip) {
    function reset() { tip.removeAttribute('data-dismissed'); }
    tip.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') tip.setAttribute('data-dismissed', '');
    });
    // Re-arm only once the tip is neither hovered nor focus-within; focus can
    // hop between children, so check focusout on the next microtask.
    tip.addEventListener('mouseleave', function () {
      if (!tip.matches(':focus-within')) reset();
    });
    tip.addEventListener('focusout', function (e) {
      if (e.relatedTarget && tip.contains(e.relatedTarget)) return;
      setTimeout(function () {
        if (!tip.matches(':hover, :focus-within')) reset();
      }, 0);
    });
  });
})(window.Corn);
