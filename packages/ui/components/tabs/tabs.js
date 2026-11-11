/* Tabs ([data-corn-tabs]) and segmented control ([data-corn-segmented]). */
(function (Corn) {
  'use strict';

  function indicator(list, item, instant) {
    list.classList.add('is-enhanced');
    list.classList.toggle('is-instant', !!instant);
    list.style.setProperty('--_x', item.offsetLeft + 'px');
    list.style.setProperty('--_w', item.offsetWidth + 'px');
  }

  function arrowNav(items, e) {
    var i = items.indexOf(document.activeElement);
    if (i < 0) return null;
    var map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in map)) return null;
    e.preventDefault();
    return items[(map[e.key] + items.length) % items.length];
  }

  Corn.define('tabs', '[data-corn-tabs]', function (root) {
    var list = root.querySelector('[role="tablist"]');
    var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
    var panels = [].slice.call(root.querySelectorAll('[role="tabpanel"]'));
    if (tabs.length !== panels.length) {
      console.warn('[corn] tabs: tab and panel counts differ', root);
    }
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
    function select(i, focus, instant) {
      tabs.forEach(function (tab, j) {
        var on = i === j;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      indicator(list, tabs[i], instant);
      if (!instant) Corn.emit(root, 'change', { index: i, value: tabs[i].textContent.trim() });
    }
    var start = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
    select(start, false, true);
    list.addEventListener('click', function (e) {
      var i = tabs.indexOf(e.target.closest('[role="tab"]'));
      if (i >= 0) select(i, false);
    });
    list.addEventListener('keydown', function (e) {
      var next = arrowNav(tabs, e);
      if (next) select(tabs.indexOf(next), true);
    });
    window.addEventListener('resize', function () { indicator(list, tabs[tabs.findIndex(function (t) { return t.tabIndex === 0; })], true); });
  });

  Corn.define('segmented', '[data-corn-segmented]', function (list) {
    var items = [].slice.call(list.querySelectorAll('button'));
    function select(i, instant) {
      items.forEach(function (b, j) { b.setAttribute('aria-pressed', String(i === j)); });
      indicator(list, items[i], instant);
      if (!instant) Corn.emit(list, 'change', { index: i, value: items[i].value || items[i].textContent.trim() });
    }
    var start = Math.max(0, items.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; }));
    select(start, true);
    list.addEventListener('click', function (e) {
      var i = items.indexOf(e.target.closest('button'));
      if (i >= 0) select(i);
    });
    list.addEventListener('keydown', function (e) {
      var next = arrowNav(items, e);
      if (next) { next.focus(); select(items.indexOf(next)); }
    });
    window.addEventListener('resize', function () {
      indicator(list, items[items.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; })], true);
    });
  });
})(window.Corn);
