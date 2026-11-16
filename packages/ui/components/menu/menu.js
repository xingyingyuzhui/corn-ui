/* Menu button: [data-corn-menu] toggles the role=menu it aria-controls.
   The menu is a [popover] — top layer, native light-dismiss — pinned with
   CSS anchor positioning where supported and JS-computed coordinates
   elsewhere; pre-popover engines fall back to hidden + absolute. */
(function (Corn) {
  'use strict';
  Corn.define('menu', '[data-corn-menu]', function (btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) {
      console.warn('[corn] menu: aria-controls target not found', btn);
      return;
    }
    var canPopover = typeof menu.showPopover === 'function';
    // CSS anchoring needs the full feature set, not just anchor-name
    var anchored = canPopover && window.CSS &&
      CSS.supports('anchor-name: --a') &&
      CSS.supports('position-area: block-end') &&
      CSS.supports('top: anchor(bottom)');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    if (canPopover) {
      menu.setAttribute('popover', '');
      menu.removeAttribute('hidden'); // popover attr already keeps it out of view
      menu.setAttribute('data-popover', '');
      if (anchored) {
        var name = '--' + Corn.uid('anchor');
        btn.style.setProperty('anchor-name', name);
        menu.style.setProperty('position-anchor', name);
        menu.setAttribute('data-anchored', '');
      }
    } else {
      menu.hidden = true; // the popover attr is inert here — hide it ourselves
    }

    function items() { return [].slice.call(menu.querySelectorAll('[role="menuitem"]:not([disabled])')); }
    function isOpen() { return canPopover ? menu.matches(':popover-open') : !menu.hidden; }

    var GAP = 6, EDGE = 8;
    function place() {
      // popover without CSS anchoring: viewport-fit coords, flipping when needed
      var r = btn.getBoundingClientRect();
      menu.style.maxHeight = ''; // measure the natural size first
      var mw = menu.offsetWidth, mh = menu.offsetHeight;
      var below = window.innerHeight - r.bottom - GAP - EDGE;
      var above = r.top - GAP - EDGE;
      var origin = mh <= below ? 'bottom' : (above > below ? 'top' : 'bottom');
      var avail = origin === 'bottom' ? below : above;
      menu.style.maxHeight = mh > avail ? Math.max(80, avail) + 'px' : '';
      menu.style.overflowY = 'auto';
      menu.style.maxWidth = (window.innerWidth - EDGE * 2) + 'px';
      mw = menu.offsetWidth; var h = menu.offsetHeight; // re-read after constraining
      var top = origin === 'bottom' ? r.bottom + GAP : r.top - GAP - h;
      top = Math.min(Math.max(EDGE, top), Math.max(EDGE, window.innerHeight - h - EDGE));
      var left = menu.getAttribute('data-align') === 'end' ? r.right - mw : r.left;
      left = Math.min(Math.max(EDGE, left), Math.max(EDGE, window.innerWidth - mw - EDGE));
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';
      menu.style.setProperty('--corn-pop-origin', origin === 'bottom' ? 'top' : 'bottom');
    }
    // while open, the fallback position follows its trigger on reflow
    function onReflow(e) {
      if (e && e.target && e.target.nodeType === 1 && menu.contains(e.target)) return; // menu's own scroll
      if (!btn.isConnected) { close(false); return; }
      var r = btn.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
        close(false); // trigger scrolled away — close without stealing focus
        return;
      }
      if (canPopover && !anchored) place();
    }
    function watch(on) {
      var fn = on ? 'addEventListener' : 'removeEventListener';
      window[fn]('resize', onReflow);
      document[fn]('scroll', onReflow, true);
    }
    function open(focusLast) {
      if (canPopover) {
        menu.showPopover();
        if (!anchored) place();
      } else {
        menu.hidden = false;
      }
      btn.setAttribute('aria-expanded', 'true');
      var list = items();
      list.forEach(function (i) { i.tabIndex = -1; });
      if (list.length) list[focusLast ? list.length - 1 : 0].focus();
      document.addEventListener('pointerdown', outside, true);
      watch(true);
    }
    function close(refocus) {
      if (!isOpen()) return;
      if (canPopover) menu.hidePopover(); else menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      watch(false);
      if (refocus) btn.focus();
    }
    function outside(e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close(false);
    }
    // any native dismissal (light-dismiss click or Esc) keeps aria in sync
    menu.addEventListener('toggle', function (e) {
      if (e.newState !== 'closed') return;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      watch(false);
    });

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
        if (list.length) list[(map[e.key] + list.length) % list.length].focus();
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
