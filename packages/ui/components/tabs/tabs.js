/* Tabs ([data-corn-tabs]) and segmented control ([data-corn-segmented]).
   The sliding indicator is measured with a ResizeObserver, so a control that
   starts hidden (closed dialog, inactive panel) gets its indicator as soon as
   it is laid out. Nested tab sets only manage their own tabs and panels. */
(function (Corn) {
  'use strict';

  /** Keep the indicator on `current()`; until the list has a size, leave the
      native selected styling (no .is-enhanced) so the choice stays visible. */
  function track(list, current) {
    function sync(instant) {
      var item = current();
      if (!item || !item.offsetWidth) {
        list.classList.remove('is-enhanced');
        return;
      }
      var first = !list.classList.contains('is-enhanced');
      list.classList.add('is-enhanced');
      list.classList.toggle('is-instant', !!instant || first);
      list.style.setProperty('--_x', item.offsetLeft + 'px');
      list.style.setProperty('--_w', item.offsetWidth + 'px');
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { sync(true); }).observe(list);
    } else {
      window.addEventListener('resize', function () { sync(true); });
    }
    return sync;
  }

  function arrowNav(items, e) {
    var i = items.indexOf(document.activeElement);
    if (i < 0) return null;
    var map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in map)) return null;
    e.preventDefault();
    return items[(map[e.key] + items.length) % items.length];
  }

  function own(root, selector) {
    return [].filter.call(root.querySelectorAll(selector), function (el) {
      return el.closest('[data-corn-tabs]') === root;
    });
  }

  Corn.define('tabs', '[data-corn-tabs]', function (root) {
    var list = own(root, '[role="tablist"]')[0];
    if (!list) return console.warn('[corn] tabs: no role="tablist" inside', root);
    var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
    var panels = own(root, '[role="tabpanel"]');
    if (tabs.length !== panels.length) console.warn('[corn] tabs: tab and panel counts differ', root);
    tabs.forEach(function (tab, i) {
      var panel = panels[i];
      tab.id = tab.id || Corn.uid('corn-tab');
      if (panel) {
        panel.id = panel.id || Corn.uid('corn-panel');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
      }
    });
    var current = 0;
    var sync = track(list, function () { return tabs[current]; });
    function select(i, focus, silent) {
      current = i;
      tabs.forEach(function (tab, j) {
        tab.setAttribute('aria-selected', String(i === j));
        tab.tabIndex = i === j ? 0 : -1;
        if (panels[j]) panels[j].hidden = i !== j;
      });
      if (focus) tabs[i].focus();
      sync(silent);
      if (!silent) Corn.emit(root, 'change', { index: i, value: tabs[i].textContent.trim() });
    }
    select(Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; })), false, true);
    list.addEventListener('click', function (e) {
      var i = tabs.indexOf(e.target.closest('[role="tab"]'));
      if (i >= 0) select(i, false);
    });
    list.addEventListener('keydown', function (e) {
      var next = arrowNav(tabs, e);
      if (next) select(tabs.indexOf(next), true);
    });
  });

  Corn.define('segmented', '[data-corn-segmented]', function (list) {
    var items = [].slice.call(list.querySelectorAll('button'));
    var current = 0;
    var sync = track(list, function () { return items[current]; });
    function select(i, silent) {
      current = i;
      items.forEach(function (b, j) { b.setAttribute('aria-pressed', String(i === j)); });
      sync(silent);
      if (!silent) Corn.emit(list, 'change', { index: i, value: items[i].value || items[i].textContent.trim() });
    }
    select(Math.max(0, items.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; })), true);
    list.addEventListener('click', function (e) {
      var i = items.indexOf(e.target.closest('button'));
      if (i >= 0) select(i);
    });
    list.addEventListener('keydown', function (e) {
      var next = arrowNav(items, e);
      if (next) { next.focus(); select(items.indexOf(next)); }
    });
  });
})(window.Corn);
