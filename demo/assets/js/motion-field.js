/* Motion page only: the hero field — ~90 maize kernels spelling CORN that
   can scatter, stack and be brushed aside by the pointer. One RAF integrator,
   no work while settled/hidden/offscreen/reduced. Page-private seam:
   document.getElementById('mfx-field').__motionField.{setMode,gust}. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var field = document.getElementById('mfx-field');
    var cob = document.getElementById('mfx-cob');
    if (!field || !cob || !window.Corn) return;

    /* CORN as a 23x7 bitmap (5-wide glyphs, 1-column gaps). */
    var GLYPHS = [
      ['01111', '11000', '11000', '11000', '11000', '11000', '01111'],
      ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
      ['11110', '11011', '11011', '11110', '11100', '11010', '11001'],
      ['11001', '11101', '11101', '11011', '11011', '11011', '11001']
    ];
    var bits = [];
    GLYPHS.forEach(function (g, gi) {
      g.forEach(function (row, r) {
        row.split('').forEach(function (ch, c) {
          if (ch !== '1') return;
          // Each lit cell subdivides 2x2: the field reads as grain, not dots.
          for (var sr = 0; sr < 2; sr++) for (var sc = 0; sc < 2; sc++) {
            bits.push({ c: (gi * 6 + c) * 2 + sc, r: r * 2 + sr });
          }
        });
      });
    });
    var N = bits.length;

    var kernels = [];
    for (var i = 0; i < N; i++) {
      var k = document.createElement('i');
      if (i % 8 === 3) k.className = 'is-sage';
      cob.appendChild(k);
      kernels.push({ el: k, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rot: 0 });
    }

    var W = 0, H = 0, kw = 12;
    var rect = null, rafId = 0, gustStart = 0, onscreen = true;
    var pointer = { x: -1e4, y: -1e4, in: false };
    var dirty = true; // targets need (re)computing

    function reduced() { return Corn.reducedMotion(); }

    function targets() {
      var mode = field.dataset.mode || 'type';
      if (mode === 'type') {
        var cell = Math.min(W * 0.75 / 46, H * 0.8 / 14);
        var ox = (W - 46 * cell) / 2, oy = (H - 14 * cell) / 2;
        bits.forEach(function (b, i) {
          kernels[i].tx = ox + (b.c + 0.5) * cell;
          kernels[i].ty = oy + (b.r + 0.5) * cell;
        });
      } else if (mode === 'scatter') {
        var cx = W / 2, cy = H / 2;
        kernels.forEach(function (k, i) {
          var a = i * 2.39996, r = Math.sqrt((i + 0.5) / N);
          k.tx = Math.min(W - 2 * kw, Math.max(kw, cx + Math.cos(a) * W * 0.4 * r));
          k.ty = Math.min(H - 2 * kw, Math.max(kw, cy + Math.sin(a) * H * 0.38 * r));
        });
      } else { // stack: a tight crate, alternating half-cell offset
        var cols = 28, step = kw * 1.45;
        var rows = Math.ceil(N / cols), bw = cols * step, bh = rows * step;
        kernels.forEach(function (k, i) {
          var r = Math.floor(i / cols), c = i % cols;
          k.tx = (W - bw) / 2 + (r % 2 ? step / 2 : 0) + c * step;
          k.ty = (H - bh) / 2 + r * step;
        });
      }
    }

    function write() {
      kernels.forEach(function (k) {
        k.el.style.transform = 'translate(' + k.x.toFixed(1) + 'px,' + k.y.toFixed(1) + 'px) rotate(' + k.rot.toFixed(1) + 'deg)';
      });
    }

    function snap() {
      if (dirty) { targets(); dirty = false; }
      kernels.forEach(function (k) { k.x = k.tx; k.y = k.ty; k.vx = k.vy = k.rot = 0; });
      write();
    }

    /* Effective (pointer/gust-adjusted) goal for one kernel, computed from
       BASE targets so a resting equilibrium is well-defined. */
    function goal(k, gustP) {
      var gx = k.tx, gy = k.ty, gr = 0;
      if (gustP >= 0) {
        var env = Math.sin(Math.PI * gustP);
        gx += Math.sin(k.tx / W * Math.PI * 2 + gustP * Math.PI * 2) * 60 * env;
        gy += Math.cos(k.ty / H * Math.PI + gustP * Math.PI * 3) * 30 * env;
      }
      if (pointer.in && rect) {
        var dx = k.tx - (pointer.x - rect.left), dy = k.ty - (pointer.y - rect.top);
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90 && d > 0.01) {
          var f = (1 - d / 90) * 35;
          gx += dx / d * f;
          gy += dy / d * f;
          gr = (dx < 0 ? -1 : 1) * f * 0.5;
        }
      }
      return { x: gx, y: gy, r: gr };
    }

    function running() { field.dataset.running = rafId ? 'true' : 'false'; }

    /* Freeze the loop wherever it is; positions are preserved for resume. */
    function suspend() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      gustStart = 0;
      pointer.in = false; pointer.x = pointer.y = -1e4;
      running();
    }

    var last = 0;
    function frame(now) {
      rafId = 0;
      if (reduced() || document.hidden || !onscreen) { running(); return; }
      var dt = Math.min(33, now - last || 16.7); // clamp: no leap on resume
      last = now;
      var steps = Math.max(0.3, Math.min(2, dt / 16.7)); // sub-1 at high refresh
      var gustP = gustStart ? (now - gustStart) / 1200 : -1;
      if (gustP >= 1) { gustStart = 0; gustP = -1; }
      var moving = false;
      kernels.forEach(function (k) {
        var g = goal(k, gustP);
        k.vx = (k.vx + (g.x - k.x) * 0.06 * steps) * Math.pow(0.76, steps);
        k.vy = (k.vy + (g.y - k.y) * 0.06 * steps) * Math.pow(0.76, steps);
        k.x += k.vx * steps;
        k.y += k.vy * steps;
        k.rot += (g.r - k.rot) * 0.15 * steps;
        // Land exactly on the effective goal: rest states are deterministic.
        if (Math.abs(g.x - k.x) < 0.8 && Math.abs(k.vx) < 0.3) { k.x = g.x; k.vx = 0; }
        if (Math.abs(g.y - k.y) < 0.8 && Math.abs(k.vy) < 0.3) { k.y = g.y; k.vy = 0; }
        if (Math.abs(g.r - k.rot) < 0.05) k.rot = g.r;
        if (k.vx || k.vy || Math.abs(g.x - k.x) > 0.01 || Math.abs(g.y - k.y) > 0.01 || Math.abs(g.r - k.rot) > 0.001) moving = true;
      });
      write();
      if (moving || gustStart) {
        rafId = requestAnimationFrame(frame);
      }
      running();
    }

    function wake() {
      if (reduced() || document.hidden || !onscreen) return;
      if (dirty) { targets(); dirty = false; }
      if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); running(); }
    }

    function measure() {
      W = field.clientWidth; H = field.clientHeight;
      kw = Math.max(2.5, Math.min(8, (W * 0.75 / 46) * 0.65));
      cob.style.setProperty('--fk', kw.toFixed(1) + 'px');
      rect = field.getBoundingClientRect();
      dirty = true;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        onscreen = en[0].isIntersecting;
        if (onscreen) wake(); else suspend();
      }).observe(field);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) suspend(); else wake();
    });

    /* Reduced-motion changes after load: snap / calm immediately. */
    function onPrefChange() {
      if (reduced()) {
        suspend();
        snap();
      } else {
        wake();
      }
    }
    new MutationObserver(onPrefChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-corn-motion'] });
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', onPrefChange);

    /* Pointer only records coordinates; RAF does the physics. */
    function pointerOff() { pointer.in = false; pointer.x = pointer.y = -1e4; wake(); }
    field.addEventListener('pointerenter', function (e) {
      if (reduced()) return;
      rect = field.getBoundingClientRect();
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.in = true;
      wake();
    });
    field.addEventListener('pointermove', function (e) {
      if (reduced() || !pointer.in) return;
      pointer.x = e.clientX; pointer.y = e.clientY;
      wake();
    });
    field.addEventListener('pointerleave', pointerOff);
    field.addEventListener('pointercancel', pointerOff);
    document.addEventListener('scroll', function () {
      if (pointer.in) rect = field.getBoundingClientRect();
    }, { passive: true });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { measure(); reduced() ? snap() : wake(); }).observe(field);
    }
    window.addEventListener('resize', measure);

    /* Modes + gust — page-private seam on the field element only. */
    var modeBtns = Array.prototype.slice.call(document.querySelectorAll('[data-field-mode]'));
    function setMode(name) {
      field.dataset.mode = name;
      modeBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-field-mode') === name));
      });
      dirty = true;
      if (reduced()) snap(); else wake();
    }
    function gust() {
      if (reduced() || document.hidden || !onscreen) return;
      gustStart = performance.now();
      wake();
    }
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-field-mode')); });
    });
    var gustBtn = document.getElementById('mfx-field-gust');
    if (gustBtn) gustBtn.addEventListener('click', gust);
    field.__motionField = { setMode: setMode, gust: gust };

    /* Boot: kernels gather from a deterministic off-field arrangement into
       CORN once; reduced motion starts already assembled. */
    measure();
    targets(); dirty = false;
    if (reduced()) {
      snap();
    } else {
      kernels.forEach(function (k, i) {
        k.x = ((i * 37) % 97) / 97 * W;
        k.y = ((i * 53) % 89) / 89 * H;
      });
      write();
      field.dataset.mode = 'type';
      wake();
    }
  });
})();
