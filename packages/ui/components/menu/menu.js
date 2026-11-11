/* Menu button: [data-corn-menu] toggles the role=menu it aria-controls. */
(function (Corn) {
  'use strict';
  Corn.define('menu', '[data-corn-menu]', function (btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) {
      console.warn('[corn] menu: aria-controls target not found', btn);
      return;
    }
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    function items() { return [].slice.call(menu.querySelectorAll('[role="menuitem"]:not([disabled])')); }
    function isOpen() { return !menu.hidden; }

    function open(focusLast) {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      var list = items();
      items().forEach(function (i) { i.tabIndex = -1; });
      if (list.length) list[focusLast ? list.length - 1 : 0].focus();
      document.addEventListener('pointerdown', outside, true);
    }
    function close(refocus) {
      if (!isOpen()) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      if (refocus) btn.focus();
    }
    function outside(e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close(false);
    }

    btn.addEventListener('click', function () { if (isOpen()) close(true); else open(false); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open(e.key === 'ArrowUp');
      }
    });
    menu.addEventListener('keydown', function (e) {
      var list = items();
      var i = list.indexOf(document.activeElement);
      var map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 };
      if (e.key in map) {
        e.preventDefault();
        list[(map[e.key] + list.length) % list.length].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      } else if (e.key === 'Tab') {
        close(false);
      }
    });
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[role="menuitem"]');
      if (!item || item.disabled) return;
      Corn.emit(menu, 'select', { value: item.value || item.textContent.trim(), item: item });
      close(true);
    });
  });
})(window.Corn);
