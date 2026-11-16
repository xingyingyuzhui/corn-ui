/* Shared hero behaviour: [data-split] char-by-char titles, [data-cob]
   interactive kernel cobs (generation, wave, ripple, palette copy). Loads
   before site.js; init waits for DOMContentLoaded so corn.js is ready. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var calm = window.Corn && Corn.reducedMotion();

    /* data-split: wrap each character so titles enter letter by letter. */
    if (!calm) {
      document.querySelectorAll('[data-split]').forEach(function (el) {
        var text = el.textContent;
        el.setAttribute('aria-label', text);
        el.textContent = '';
        Array.from(text).forEach(function (ch, i) {
          var s = document.createElement('span');
          s.className = 'corn-enter corn-enter-spring';
          s.style.setProperty('--i', String(i + 1));
          s.setAttribute('aria-hidden', 'true');
          s.textContent = ch === ' ' ? ' ' : ch;
          el.appendChild(s);
        });
      });
    }

    /* data-cob: kernels wave on load, ripple from clicks, glow on hover. */
    var cobs = [];
    document.querySelectorAll('[data-cob]').forEach(function (cob) {
      var cols = parseInt(cob.getAttribute('data-cols') || '0', 10);
      var nRows = parseInt(cob.getAttribute('data-rows') || '0', 10);
      var kernels = [];
      function place(k, r, c) {
        k.style.setProperty('--row', r);
        k.style.setProperty('--col', c);
        k.dataset.row = r;
        k.dataset.col = c;
        kernels.push(k);
      }
      if (!cob.children.length && cols && nRows) {
        // bare cob: generate nRows x cols kernels, ~1 in 6 ripened
        for (var r = 0; r < nRows; r++) {
          for (var c = 0; c < cols; c++) {
            var k = document.createElement('i');
            if ((r * 7 + c * 3) % 6 === 0) k.className = 'is-ripe';
            cob.appendChild(k);
            place(k, r, c);
          }
        }
      } else {
        var rowEls = cob.querySelectorAll('.cob-row');
        if (rowEls.length) {
          rowEls.forEach(function (row, ri) {
            if (ri % 2) row.classList.add('cob-row-odd');
            Array.prototype.forEach.call(row.children, function (k, ci) { place(k, ri, ci); });
          });
        } else {
          Array.prototype.forEach.call(cob.children, function (k, i) {
            var rr = cols ? Math.floor(i / cols) : 0;
            if (rr % 2) k.classList.add('cob-row-odd');
            place(k, rr, cols ? i % cols : i);
          });
        }
      }
      if (cols) cob.style.setProperty('--k-cols', String(cols));
      if (!kernels.length) return;
      cobs.push({ el: cob, kernels: kernels });

      if (!calm) kernels.forEach(function (k) { k.classList.add('corn-wave'); });
      cob.addEventListener('click', function (e) {
        var k = e.target.closest('i, .cob-k');
        if (!k || !cob.contains(k)) return;
        // Palette kernels: copy the token and flash the status line. Links
        // navigate normally; swatch-style [data-copy] handled here only.
        if (k.hasAttribute('data-copy') && window.CornDemo) {
          e.stopPropagation();
          e.preventDefault();
          CornDemo.copy(k.getAttribute('data-copy')).then(function (ok) {
            var status = cob.parentElement.querySelector('.cob-status');
            if (status) {
              status.textContent = ok ? '已复制 ' + k.getAttribute('data-copy') : '复制失败';
              clearTimeout(status._t);
              status._t = setTimeout(function () { status.textContent = ''; }, 1200);
            }
          });
        }
        if (calm) return;
        var r0 = Number(k.dataset.row), c0 = Number(k.dataset.col);
        kernels.forEach(function (x) {
          x.style.setProperty('--row', Math.abs(x.dataset.row - r0));
          x.style.setProperty('--col', Math.abs(x.dataset.col - c0));
          Corn.replay(x, 'corn-wave');
        });
      });
    });

    // [data-cob-scatter="#id"]: ripple outward from the cob's centre.
    document.querySelectorAll('[data-cob-scatter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (calm) return;
        var sel = btn.getAttribute('data-cob-scatter');
        var found = cobs.filter(function (c) { return c.el.matches(sel); })[0];
        if (!found) return;
        var mr = 0, mc = 0;
        found.kernels.forEach(function (k) {
          mr = Math.max(mr, Number(k.dataset.row));
          mc = Math.max(mc, Number(k.dataset.col));
        });
        found.kernels.forEach(function (k) {
          k.style.setProperty('--row', Math.abs(k.dataset.row - mr / 2));
          k.style.setProperty('--col', Math.abs(k.dataset.col - mc / 2));
          Corn.replay(k, 'corn-wave');
        });
      });
    });

    /* Typography hero: 玉 swaps between the three stacks. */
    var glyph = document.getElementById('typo-glyph');
    if (glyph) {
      var fonts = [
        ['var(--corn-serif)', 'corn-serif'],
        ['var(--corn-sans)', 'corn-sans'],
        ['var(--corn-mono)', 'corn-mono']
      ];
      var cap = document.getElementById('typo-cap');
      var btns = Array.prototype.slice.call(document.querySelectorAll('.typo-switch [data-font]'));
      var current = 0;
      function animating() {
        return glyph.getAnimations().some(function (a) { return a.playState === 'running'; });
      }
      function apply(i) {
        current = (i + fonts.length) % fonts.length;
        glyph.style.fontFamily = fonts[current][0];
        if (cap) cap.textContent = fonts[current][1];
        btns.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-font') === fonts[current][0]));
        });
        if (!calm) Corn.replay(glyph, 'corn-pop');
      }
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () { apply(i); });
      });
      glyph.addEventListener('pointerenter', function () {
        if (!calm && !animating()) apply(current + 1);
      });
    }
  });
})();
