/* Code popover: anchored to the clicked .code-trigger, shows the exact
   source of that variant (read from <template> elements written by the
   build), with tabs, copy + feedback, Esc / outside-click close and focus
   return. One shared popover per page. */
(function () {
  'use strict';
  var pop = document.getElementById('code-pop');
  if (!pop) return;
  var demo = window.CornDemo || {};
  var titleEl = pop.querySelector('#code-pop-title');
  var tabsEl = pop.querySelector('.code-pop-tabs');
  var codeEl = pop.querySelector('.code-pop-code code');
  var preEl = pop.querySelector('.code-pop-code');
  var metaEl = pop.querySelector('.code-pop-meta');
  var statusEl = pop.querySelector('.code-pop-status');
  var copyBtn = pop.querySelector('[data-pop-copy]');
  var copyLabel = pop.querySelector('.code-pop-copy-label');
  var KINDS = [
    ['html', 'HTML', 'codeHtml'], ['css', 'CSS', 'codeCss'],
    ['js', 'JS', 'codeJs'], ['deps', '引入', 'codeDeps']
  ];
  var trigger = null;
  var current = { text: '', ok: false };
  var resetTimer = 0;

  function readTemplate(id) {
    var tpl = id && document.getElementById(id);
    if (!tpl || !tpl.content) return null;
    return { text: tpl.content.textContent, lang: tpl.getAttribute('data-lang') || 'html' };
  }

  function setStatus(msg, tone) {
    statusEl.textContent = msg;
    if (tone) statusEl.setAttribute('data-tone', tone); else statusEl.removeAttribute('data-tone');
  }

  function resetCopy() {
    clearTimeout(resetTimer);
    copyBtn.removeAttribute('data-state');
    copyLabel.textContent = '复制代码';
    setStatus('');
  }

  function show(kind, label, src) {
    resetCopy();
    tabsEl.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t.getAttribute('data-kind') === kind;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    if (!src) {
      current = { text: '', ok: false };
      codeEl.textContent = '找不到这段代码的源（模板缺失），请刷新页面或检查构建。';
      metaEl.textContent = '';
      copyBtn.disabled = true;
      setStatus('代码源缺失', 'error');
      return;
    }
    current = { text: src.text, ok: true };
    copyBtn.disabled = false;
    if (demo.highlight) demo.highlight(codeEl, src.text, src.lang); else codeEl.textContent = src.text;
    // restart the fade so switching tabs is visible
    codeEl.style.animation = 'none';
    void codeEl.offsetWidth;
    codeEl.style.animation = '';
    var lines = src.text.replace(/\n$/, '').split('\n').length;
    metaEl.textContent = label + ' · ' + lines + ' 行';
    preEl.scrollTop = 0;
    place(); // a longer tab grows the popover: keep it inside the viewport
  }

  function buildTabs(btn) {
    tabsEl.replaceChildren();
    var first = null;
    KINDS.forEach(function (k) {
      var id = btn.dataset[k[2]];
      if (!id) return;
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'code-pop-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('data-kind', k[0]);
      tab.textContent = k[1];
      tab.addEventListener('click', function () { show(k[0], k[1], readTemplate(id)); });
      tabsEl.appendChild(tab);
      if (!first) first = function () { show(k[0], k[1], readTemplate(id)); };
    });
    if (first) first();
  }

  function place() {
    if (!trigger) return;
    var r = trigger.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var gap = 8;
    var below = r.bottom + gap + h <= vh - gap;
    var above = r.top - gap - h >= gap;
    var top = below || !above ? r.bottom + gap : r.top - gap - h;
    top = Math.max(gap, Math.min(top, vh - h - gap));
    var left = Math.max(gap, Math.min(r.right - w, vw - w - gap));
    pop.style.top = Math.round(top) + 'px';
    pop.style.left = Math.round(left) + 'px';
    pop.style.setProperty('--pop-origin', (top < r.top ? 'bottom' : 'top') + ' right');
  }

  function open(btn) {
    if (trigger) close(false);
    trigger = btn;
    titleEl.textContent = btn.getAttribute('data-code-title') || '代码';
    buildTabs(btn);
    pop.hidden = false;
    pop.setAttribute('data-state', 'open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', 'code-pop');
    place();
    pop.focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (!trigger) return;
    var btn = trigger;
    trigger = null;
    btn.setAttribute('aria-expanded', 'false');
    pop.setAttribute('data-state', 'closing');
    var done = function () {
      if (trigger) return; // re-opened meanwhile
      pop.hidden = true;
      pop.removeAttribute('data-state');
    };
    if (window.Corn && window.Corn.afterAnimation) window.Corn.afterAnimation(pop, done); else done();
    if (returnFocus) btn.focus({ preventScroll: true });
  }

  copyBtn.addEventListener('click', function () {
    if (!current.ok) return;
    var copy = demo.copy || function () { return Promise.resolve(false); };
    copy(current.text).then(function (ok) {
      clearTimeout(resetTimer);
      if (ok) {
        copyBtn.setAttribute('data-state', 'ok');
        copyLabel.textContent = '已复制 ✓';
        setStatus('已复制到剪贴板', 'ok');
      } else {
        var range = document.createRange();
        range.selectNodeContents(codeEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        setStatus('复制失败：已选中代码，请按 Ctrl/⌘ + C', 'error');
      }
      resetTimer = setTimeout(resetCopy, 2200);
    });
  });

  tabsEl.addEventListener('keydown', function (e) {
    var tabs = [].slice.call(tabsEl.querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    var t = tabs[(next + tabs.length) % tabs.length];
    t.focus();
    t.click();
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.code-trigger');
    if (btn) {
      if (btn === trigger) close(true); else open(btn);
      return;
    }
    if (e.target.closest('[data-pop-close]')) close(true);
  });
  document.addEventListener('pointerdown', function (e) {
    if (trigger && !pop.contains(e.target) && !e.target.closest('.code-trigger')) close(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && trigger) {
      e.preventDefault();
      close(true);
    }
  });
  document.addEventListener('focusin', function (e) {
    if (trigger && !pop.contains(e.target) && e.target !== trigger) close(false);
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });
})();
