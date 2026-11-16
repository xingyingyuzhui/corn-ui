/* Motion page only: the three mini-experiments in motion-studies.html —
   peel (range-scrubbed 3D leaves), stamp (one landing per confirm),
   type (pointer breeze on giant glyphs). Live reduced-motion checks. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.Corn) return;
    function reduced() { return Corn.reducedMotion(); }

    /* Shared after-load preference hook: snap states on change. */
    var prefSubs = [];
    function onPrefChange() { prefSubs.forEach(function (f) { f(); }); }
    new MutationObserver(onPrefChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-corn-motion'] });
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', onPrefChange);

    /* --- 01 peel -------------------------------------------------------- */
    var peelStage = document.querySelector('#study-peel .study-peel');
    var peelRange = document.getElementById('mfx-peel');
    var peelOut = document.getElementById('mfx-peel-out');
    if (peelStage && peelRange) {
      var peelRaf = 0;
      function setPeel(v) {
        var p = Math.max(0, Math.min(100, v));
        peelStage.style.setProperty('--peel', (p / 100).toFixed(3));
        peelRange.value = String(Math.round(p));
        peelRange.setAttribute('aria-valuetext', '剥开 ' + Math.round(p) + '%');
        if (peelOut) peelOut.textContent = Math.round(p) + '%';
      }
      peelRange.addEventListener('input', function () {
        // Manual scrub wins: cancel any in-flight replay and hold this state.
        if (peelRaf) { cancelAnimationFrame(peelRaf); peelRaf = 0; }
        setPeel(Number(peelRange.value));
      });
      var peelReplay = document.getElementById('mfx-peel-replay');
      if (peelReplay) {
        peelReplay.addEventListener('click', function () {
          if (reduced()) { setPeel(100); return; }
          if (peelRaf) cancelAnimationFrame(peelRaf);
          var t0 = performance.now();
          (function tick(now) {
            peelRaf = 0;
            var p = Math.min(1, (now - t0) / 900);
            var eased = 1 - Math.pow(1 - p, 3);
            setPeel(eased * 100);
            if (p < 1) peelRaf = requestAnimationFrame(tick);
          })(t0);
        });
      }
      prefSubs.push(function () {
        if (reduced()) { if (peelRaf) { cancelAnimationFrame(peelRaf); peelRaf = 0; } setPeel(100); }
      });
      setPeel(reduced() ? 100 : Number(peelRange.value));
    }

    /* --- 02 stamp ------------------------------------------------------- */
    var stampBtn = document.getElementById('mfx-stamp');
    var seal = document.getElementById('mfx-seal');
    var ticket = document.getElementById('mfx-ticket');
    var serial = document.getElementById('mfx-serial');
    var stampOut = document.getElementById('mfx-stamp-out');
    var stampReplay = document.getElementById('mfx-stamp-replay');
    if (stampBtn && seal && ticket && serial) {
      var count = 0, busy = false, run = null, anims = [];
      function clearAnims() {
        anims.forEach(function (a) { a.onfinish = null; a.oncancel = null; a.cancel(); });
        anims = [];
      }
      function syncReplay() {
        if (stampReplay) stampReplay.disabled = !(count > 0 && !busy && !reduced());
      }
      function endRun() {
        busy = false; run = null;
        stampBtn.removeAttribute('aria-busy');
        clearAnims(); // finished forwards-fill anims must not accumulate
        syncReplay();
      }
      function applyStamped() {
        seal.classList.add('is-stamped');
        serial.textContent = 'NO. ' + String(count).padStart(4, '0');
        if (stampOut) stampOut.textContent = '第 ' + count + ' 次收成已确认';
        stampBtn.textContent = '再收一季';
      }
      function landSeal(done) {
        clearAnims();
        seal.classList.remove('is-stamped');
        var a = seal.animate(
          [{ transform: 'scale(1.8) rotate(-18deg)', opacity: 0 },
           { transform: 'scale(0.94) rotate(-10deg)', opacity: 1, offset: 0.7 },
           { transform: 'scale(1) rotate(-10deg)', opacity: 1 }],
          { duration: 650, easing: 'cubic-bezier(0.34,1.3,0.64,1)', fill: 'forwards' });
        var t = ticket.animate(
          [{ transform: 'translateY(0) scaleY(1)' },
           { transform: 'translateY(3px) scaleY(0.97)', offset: 0.35 },
           { transform: 'translateY(0) scaleY(1)' }],
          { duration: 500, easing: 'ease-out' });
        anims = [a, t];
        ticket.querySelectorAll('.stamp-fleck').forEach(function (f) {
          anims.push(f.animate(
            [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
             { transform: 'translate(' + f.dataset.dx + 'px,' + f.dataset.dy + 'px) scale(.4)', opacity: 0 }],
            { duration: 520, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' }));
        });
        a.onfinish = done;
      }
      function confirmHarvest() {
        if (busy) return; // one confirmation in flight; extra clicks ignored
        busy = true; run = 'confirm';
        stampBtn.setAttribute('aria-busy', 'true');
        count += 1;
        syncReplay();
        if (reduced()) { applyStamped(); endRun(); return; }
        landSeal(function () { applyStamped(); endRun(); });
      }
      stampBtn.addEventListener('click', confirmHarvest);
      if (stampReplay) {
        // Replay the landing visuals only — never touches the counter.
        stampReplay.addEventListener('click', function () {
          if (busy || !count || reduced()) return;
          busy = true; run = 'replay';
          syncReplay();
          landSeal(function () { seal.classList.add('is-stamped'); endRun(); });
        });
        syncReplay();
      }
      prefSubs.push(function () {
        if (reduced() && (busy || count)) {
          if (busy && run === 'confirm') applyStamped();
          else if (count) seal.classList.add('is-stamped');
          if (busy) endRun(); else clearAnims();
        }
        syncReplay();
      });
    }

    /* --- 03 type -------------------------------------------------------- */
    var typeStage = document.querySelector('#study-type .study-type');
    var glyphs = document.querySelectorAll('#mfx-type span');
    if (typeStage && glyphs.length) {
      var typeRect = null, typeX = -1e4, typeRaf = 0, gustAnims = [];
      function paintType() {
        typeRaf = 0;
        glyphs.forEach(function (g) {
          var gr = g._r;
          var d = Math.abs(typeX - (gr.left + gr.width / 2));
          var lift = Math.max(0, 24 * (1 - d / 160));
          var rot = Math.max(-9, Math.min(9, (typeX - (gr.left + gr.width / 2)) / 160 * -9 * (lift / 24)));
          g.style.transform = lift > 0.3
            ? 'translateY(' + (-lift).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)'
            : '';
        });
      }
      function typeWake() {
        if (reduced()) { glyphs.forEach(function (g) { g.style.transform = ''; }); return; }
        if (!typeRaf) typeRaf = requestAnimationFrame(paintType);
      }
      typeStage.addEventListener('pointerenter', function (e) {
        if (reduced()) return;
        typeRect = typeStage.getBoundingClientRect();
        glyphs.forEach(function (g) { g._r = g.getBoundingClientRect(); });
        typeX = e.clientX;
        typeWake();
      });
      typeStage.addEventListener('pointermove', function (e) {
        if (reduced() || !typeRect) return;
        typeX = e.clientX;
        typeWake();
      });
      typeStage.addEventListener('pointerleave', function () {
        typeRect = null; typeX = -1e4;
        glyphs.forEach(function (g) { g.style.transform = ''; });
      });
      var typeGust = document.getElementById('mfx-type-gust');
      if (typeGust) {
        typeGust.addEventListener('click', function () {
          if (reduced()) return;
          gustAnims.forEach(function (a) { a.cancel(); });
          gustAnims = [];
          glyphs.forEach(function (g, i) {
            gustAnims.push(g.animate(
              [{ transform: 'translateY(0)' },
               { transform: 'translateY(-26px) rotate(4deg)', offset: 0.45 },
               { transform: 'translateY(0)' }],
              { duration: 700, delay: i * 90, easing: 'cubic-bezier(0.22,0.61,0.36,1)' }));
          });
        });
      }
      prefSubs.push(function () {
        if (reduced()) {
          if (typeRaf) { cancelAnimationFrame(typeRaf); typeRaf = 0; }
          gustAnims.forEach(function (a) { a.cancel(); });
          gustAnims = [];
          typeRect = null;
          glyphs.forEach(function (g) { g.style.transform = ''; });
        }
      });
    }
  });
})();
