/* Button workbench: whitelist-driven live preview + serialized HTML.
   The preview button is rebuilt from scratch each change, so the snippet
   can never carry preview-only ids or data attributes. */
(function () {
  'use strict';
  var root = document.querySelector('[data-wb]');
  if (!root) return;
  var params = root.querySelector('[data-wb-params]');
  var stage = root.querySelector('[data-wb-stage]');
  var codeEl = root.querySelector('[data-wb-code]');
  var copyBtn = root.querySelector('[data-wb-copy]');
  var note = root.querySelector('[data-wb-note]');
  var resetBtn = root.querySelector('[data-wb-reset]');
  var VARIANTS = ['ink', 'maize', 'husk', 'soft', 'ghost', 'danger'];
  var SIZES = { sm: 'corn-btn-sm', lg: 'corn-btn-lg' };
  var f = params.elements;

  function snippet() {
    var v = VARIANTS.indexOf(f.variant.value) >= 0 ? f.variant.value : 'ink';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'corn-btn corn-btn-' + v + (SIZES[f.size.value] ? ' ' + SIZES[f.size.value] : '');
    var label = f.label.value || '保存设置';
    if (f.state.value === 'busy') {
      btn.setAttribute('aria-busy', 'true');
      var span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
    } else {
      btn.textContent = label;
      if (f.state.value === 'disabled') btn.disabled = true;
    }
    return btn;
  }

  var sayT = 0;
  function say(msg) { // button label + sr-only polite note, auto-restores
    clearTimeout(sayT);
    copyBtn.textContent = msg;
    note.textContent = msg;
    sayT = setTimeout(function () { copyBtn.textContent = '复制 HTML'; }, 1600);
  }

  function render() {
    clearTimeout(sayT);
    sayT = 0;
    copyBtn.textContent = '复制 HTML';
    var btn = snippet();
    stage.replaceChildren(btn);
    codeEl.textContent = btn.outerHTML;
  }

  params.disabled = false;
  params.addEventListener('input', render);
  params.addEventListener('change', render);
  resetBtn.addEventListener('click', function () {
    f.variant.value = 'ink';
    f.size.value = 'default';
    f.state.value = 'normal';
    f.label.value = '保存设置';
    render();
  });
  copyBtn.disabled = false; // no-JS keeps it inert: the code stays manually selectable
  copyBtn.addEventListener('click', function () {
    var text = codeEl.textContent;
    try {
      Promise.resolve(CornDemo.copy(text)).then(function (ok) {
        say(ok ? '已复制' : '复制失败');
      }, function () { say('复制失败'); });
    } catch (e) { say('复制失败'); }
  });
  render();
})();
