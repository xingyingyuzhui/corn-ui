/* Dialog: openers, closers, animated close, optional backdrop close. */
(function (Corn) {
  'use strict';

  function animateClose(dialog, value) {
    if (!dialog.open || dialog.hasAttribute('data-closing')) return;
    dialog.setAttribute('data-closing', '');
    Corn.afterAnimation(dialog, function () {
      dialog.removeAttribute('data-closing');
      dialog.close(value);
    });
  }
  Corn.closeDialog = animateClose;

  Corn.define('dialog-open', '[data-corn-dialog-open]', function (btn) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', function () {
      var dialog = document.getElementById(btn.getAttribute('data-corn-dialog-open'));
      if (!dialog || typeof dialog.showModal !== 'function') {
        console.warn('[corn] dialog: target missing or <dialog> unsupported', btn);
        return;
      }
      if (!dialog.open) dialog.showModal();
    });
  });

  Corn.define('dialog', 'dialog.corn-dialog', function (dialog) {
    dialog.addEventListener('cancel', function (e) {
      // Esc: run the exit animation instead of closing instantly
      e.preventDefault();
      animateClose(dialog, '');
    });
    dialog.addEventListener('click', function (e) {
      var closer = e.target.closest('[data-corn-dialog-close]');
      if (closer) {
        animateClose(dialog, closer.value || closer.getAttribute('data-corn-dialog-close') || '');
      } else if (e.target === dialog && dialog.hasAttribute('data-backdrop-close')) {
        animateClose(dialog, '');
      }
    });
    dialog.addEventListener('close', function () {
      Corn.emit(dialog, 'close', { value: dialog.returnValue });
    });
  });
})(window.Corn);
