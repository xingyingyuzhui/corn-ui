/* Component directory filter: normalized search + group select intersect
   over the generated grid's data-* attributes. Hidden until this script
   runs, so a no-JS page still shows every card. */
(function () {
  'use strict';
  var root = document.querySelector('[data-comp-filter]');
  if (!root) return;
  var form = root.querySelector('[data-comp-filter-form]');
  var q = form.elements.q;
  var sel = form.elements.group;
  var status = root.querySelector('[data-comp-filter-status]');
  var empty = document.querySelector('[data-comp-filter-empty]');
  var cards = [].slice.call(document.querySelectorAll('.comp-card[data-component]'));
  var groups = [].slice.call(document.querySelectorAll('.comp-group[data-group]'));
  root.hidden = false;

  function norm(s) { return (s || '').normalize('NFKC').toLowerCase(); }
  function apply() {
    var terms = norm(q.value).split(/\s+/).filter(Boolean);
    var gid = sel.value, shown = 0;
    cards.forEach(function (card) {
      var hay = norm(card.getAttribute('data-search'));
      var ok = (!gid || card.getAttribute('data-group') === gid) &&
        terms.every(function (t) { return hay.indexOf(t) !== -1; });
      card.hidden = !ok;
      if (ok) shown += 1;
    });
    groups.forEach(function (g) {
      g.hidden = ![].some.call(g.querySelectorAll('.comp-card'), function (c) { return !c.hidden; });
    });
    status.textContent = '显示 ' + shown + ' / ' + cards.length + ' 个组件';
    if (empty) empty.hidden = shown !== 0;
  }
  q.addEventListener('input', apply);
  sel.addEventListener('change', apply);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('reset', function () { setTimeout(apply, 0); });
  if (empty) empty.querySelector('[data-comp-filter-clear]').addEventListener('click', function () {
    q.value = '';
    sel.value = '';
    apply();
    q.focus();
  });
  apply();
})();
