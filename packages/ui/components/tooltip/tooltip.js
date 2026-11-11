/* Tooltip: Esc hides the bubble until the pointer/focus leaves (WCAG 1.4.13). */
(function (Corn) {
  'use strict';
  Corn.define('tooltip', '.corn-tooltip', function (tip) {
    function reset() { tip.removeAttribute('data-dismissed'); }
    tip.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') tip.setAttribute('data-dismissed', '');
    });
    tip.addEventListener('mouseleave', reset);
    tip.addEventListener('focusout', reset);
  });
})(window.Corn);
