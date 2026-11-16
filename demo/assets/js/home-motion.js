/* Homepage brand theater — 3D kernel renderer. Particles live in world space;
   one RAF projects them through a soft perspective camera every frame, sorts
   back-to-front and blits rounded-kernel sprites. Ambient drift never stops
   while motion is allowed; pointer input brushes nearby grains and tilts the
   camera. One virtual clock: suspends freeze the scene, resumes never leap. */
import { layoutTargets, logoScale } from './home-shapes.js';
import { buildKernels } from './home-kernels.js';

const SEQ = [ // first-load cinematic: logo rises out of depth → CORN → logo
  { at: 0, to: 'logo', dur: 1400 },
  { at: 3200, to: 'word', dur: 1800 },
  { at: 7400, to: 'logo', dur: 1800 }
];
const SEQ_END = 9200;

export function createStage(canvas, src, fontStack) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !src || src.length < 50) return null;
  const N = src.length;
  const kern = buildKernels(src);
  const pos = new Float32Array(N * 3);
  const from = new Float32Array(N * 3);
  const poff = new Float32Array(N * 3); // pointer offsets: screen x/y + world z
  const bsx = new Float32Array(N), bsy = new Float32Array(N); // base projection
  const fpx = new Float32Array(N), fpy = new Float32Array(N); // final draw pos
  const fz = new Float32Array(N), fs = new Float32Array(N);   // depth + scale
  const order = new Uint16Array(N);
  for (let i = 0; i < N; i++) order[i] = i;
  const seed = new Float32Array(N * 3); // stagger, arc push, wobble phase
  for (let i = 0; i < N; i++) {
    seed[i * 3] = ((i * 0.61803) % 1) * 180;             // ≤180ms stagger
    seed[i * 3 + 1] = 50 + (((i * 37) % 97) / 97) * 70;  // 50–120px depth arc
    seed[i * 3 + 2] = ((i * 53) % 89) / 89 * Math.PI * 2; // wobble phase
  }
  let W = 0, H = 0, dpr = 1, tile = 4;
  let rafId = 0, lastNow = 0, v = 0, frameCount = 0;
  let mode = 'logo', target = layoutTargets('logo', src, W || 1, H || 1, fontStack);
  let anim = null, seq = null; // {t0,dur,to,target} / {t0,next}
  let active = true, motion = true, changed = () => {};
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, on: false };
  let aimX = 0, aimY = 0; // smoothed pointer camera tilt

  function layout(kind) { return layoutTargets(kind, src, W, H, fontStack); }

  function measure() {
    const r = canvas.getBoundingClientRect();
    const nW = r.width, nH = r.height;
    if (nW <= 0 || nH <= 0) return;
    const sx = W ? nW / W : 1, sy = W ? nH / H : 1, sz = Math.min(sx, sy);
    W = nW; H = nH;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tile = logoScale(W, H) / 48 * 1.06;
    if (sx !== 1 || sy !== 1) {
      for (let i = 0; i < N * 3; i += 3) {
        pos[i] *= sx; pos[i + 1] *= sy; pos[i + 2] *= sz;
        from[i] *= sx; from[i + 1] *= sy; from[i + 2] *= sz;
        poff[i] *= sx; poff[i + 1] *= sy; poff[i + 2] *= sz;
      }
    }
    target = layout(mode);
    if (anim) anim.target = layout(anim.to);
    else pos.set(target);
    render(v, 16, motion); // always repaint — never leave a blank stage
  }

  function projectAll(t, dt, moving) {
    const f = Math.max(700, W * 0.9);
    const breath = moving ? 1 + 0.012 * Math.sin(t * 0.0008) : 1;
    const lift = moving ? 6 * Math.sin(t * 0.00062) : 0;
    // idle camera sway plus smoothed pointer aim — total stays under ~12deg
    const camX = (moving ? 0.055 * Math.sin(t * 0.00055) : 0) + aimX;
    const camY = (moving ? 0.10 * Math.sin(t * 0.00048) : 0) + aimY;
    const cY = Math.cos(camY), sY = Math.sin(camY);
    const cX = Math.cos(camX), sX = Math.sin(camX);
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(100, Math.max(65, W * 0.075));
    const r2 = radius * radius;
    const k = moving ? 1 - Math.exp(-dt / 90) : 1;
    for (let i = 0; i < N; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1];
      const z = pos[i * 3 + 2] + (moving ? 3 * Math.sin(t * 0.0007 + seed[i * 3 + 2]) : 0);
      const x1 = x * cY + z * sY, z1 = z * cY - x * sY;
      const yy = y - lift;
      const y1 = yy * cX - z1 * sX, z2 = z1 * cX + yy * sX;
      const sc = f / (f - Math.min(z2, f - 200));
      bsx[i] = cx + x1 * sc;
      bsy[i] = cy + y1 * sc;
      // pointer brush: repel nearby grains in screen space, push them back in z
      let dx_ = 0, dy_ = 0, dz_ = 0;
      if (pointer.on && moving) {
        const dx = bsx[i] - pointer.x, dy = bsy[i] - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const amt = 1 - d / radius;
          const ux = d2 > 4 ? dx / d : Math.sin(i), uy = d2 > 4 ? dy / d : Math.cos(i);
          dx_ = ux * 16 * amt * amt;
          dy_ = uy * 16 * amt * amt;
          dz_ = -60 * amt * amt;
        }
      }
      poff[i * 3] += (dx_ - poff[i * 3]) * k;
      poff[i * 3 + 1] += (dy_ - poff[i * 3 + 1]) * k;
      poff[i * 3 + 2] += (dz_ - poff[i * 3 + 2]) * k;
      fpx[i] = bsx[i] + poff[i * 3];
      fpy[i] = bsy[i] + poff[i * 3 + 1];
      const zf = z2 + poff[i * 3 + 2];
      fz[i] = zf;
      fs[i] = f / (f - Math.min(zf, f - 200)) * breath;
    }
    order.sort((a, b) => fz[a] - fz[b]); // back to front — real occlusion
  }

  function draw(t, still) {
    ctx.clearRect(0, 0, W, H);
    const C = kern.cell, cols = kern.cols;
    for (let o = 0; o < N; o++) {
      const i = order[o];
      const s = kern.index[i];
      const d = tile * fs[i];
      ctx.globalAlpha = Math.min(1, 0.62 + 0.38 * fs[i]);
      ctx.drawImage(kern.atlas, (s % cols) * C, ((s / cols) | 0) * C, C, C,
        fpx[i] - d / 2, fpy[i] - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  function render(t, dt, moving) { projectAll(t, dt, moving); draw(t, !moving); }

  function snap(kind) { // atomic static scene: stop everything, land on target
    seq = null; anim = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    mode = kind; target = layout(kind);
    pos.set(target); from.set(target); poff.fill(0);
    pointer.on = false; aimX = aimY = 0;
    render(v, 16, motion); changed();
  }

  function startTransition(kind, t0, dur) {
    from.set(pos); // continue from real current world positions
    anim = { t0: t0, dur: dur, to: kind, target: layout(kind) };
    mode = kind;
    changed(); run();
  }

  function stepAnim() {
    const pd = anim.dur - 180;
    let live = false;
    for (let i = 0; i < N; i++) {
      const p = (v - anim.t0 - seed[i * 3]) / pd;
      if (p >= 1) {
        pos[i * 3] = anim.target[i * 3];
        pos[i * 3 + 1] = anim.target[i * 3 + 1];
        pos[i * 3 + 2] = anim.target[i * 3 + 2];
        continue;
      }
      live = true;
      if (p < 0) continue;
      const e = 1 - Math.pow(1 - p, 3);
      pos[i * 3] = from[i * 3] + (anim.target[i * 3] - from[i * 3]) * e;
      pos[i * 3 + 1] = from[i * 3 + 1] + (anim.target[i * 3 + 1] - from[i * 3 + 1]) * e;
      pos[i * 3 + 2] = from[i * 3 + 2] + (anim.target[i * 3 + 2] - from[i * 3 + 2]) * e +
        seed[i * 3 + 1] * Math.sin(Math.PI * p); // arc through depth, never a flat slide
    }
    if (!live) { target = anim.target; anim = null; pos.set(target); changed(); }
  }

  function stepSeq() {
    const t = v - seq.t0;
    while (seq.next < SEQ.length && t >= SEQ[seq.next].at) {
      const seg = SEQ[seq.next++];
      startTransition(seg.to, seq.t0 + seg.at, seg.dur);
    }
    if (t >= SEQ_END) { seq = null; changed(); }
  }

  function frame(now) {
    rafId = 0;
    if (!active || !motion) return;
    const dt = Math.min(50, now - lastNow || 16.7);
    lastNow = now; v += dt;
    if (seq) stepSeq();
    if (anim) stepAnim();
    // pointer camera aim eases toward the cursor tilt
    aimX += ((pointer.on ? pointer.ny * 0.09 : 0) - aimX) * (1 - Math.exp(-dt / 120));
    aimY += ((pointer.on ? pointer.nx * 0.13 : 0) - aimY) * (1 - Math.exp(-dt / 120));
    render(v, dt, true);
    frameCount++;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }
  function run() {
    if (rafId || !active || !motion) return;
    lastNow = performance.now(); // clock resumes here — suspended time never counts
    rafId = requestAnimationFrame(frame);
  }
  function setActive(on) { // one eligibility gate for IO + scroll + visibility
    active = !!on;
    if (!active && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    else if (active) run();
  }

  const api = {
    get shape() { return mode; },
    get animating() { return !!anim; },
    get sequencing() { return !!seq; },
    get ready() { return true; },
    get motionEnabled() { return motion; },
    get frameCount() { return frameCount; },
    get particleCount() { return N; },
    get pointerActive() { return pointer.on; },
    get camera() { return { x: aimX, y: aimY }; },
    sample(n) { // final projected positions, incl. pointer offsets
      const out = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { out[i * 2] = fpx[i]; out[i * 2 + 1] = fpy[i]; }
      return Array.from(out);
    },
    depthSample(n) { // rotated depth + projected scale — proves real perspective
      return { z: Array.from(fz.slice(0, n)), s: Array.from(fs.slice(0, n)) };
    },
    offsets(n) { return Array.from(poff.slice(0, n * 3)); },
    spriteProbe() { // atlas cell 0: rounded kernel → transparent corner, opaque centre
      const g = kern.atlas.getContext('2d'), c = kern.cell;
      return { corner: g.getImageData(1, 1, 1, 1).data[3],
        center: g.getImageData((c / 2) | 0, (c / 2) | 0, 1, 1).data[3] };
    },
    onChange(fn) { changed = fn; },
    setShape(kind) {
      if (!motion) { snap(kind); return; }
      seq = null; // a manual pick ends the intro permanently
      if (mode === kind && !anim) return;
      startTransition(kind, v, mode === kind ? 700 : 1600);
    },
    setPointer(x, y, nx, ny) {
      if (x === null) { pointer.on = false; return; }
      pointer.x = x; pointer.y = y; pointer.nx = nx; pointer.ny = ny;
      pointer.on = motion; // reduced motion ignores brushing
    },
    setMotion(on) { // the nav 减少动效 button drives this
      on = !!on;
      if (on === motion) return;
      motion = on;
      if (!motion) snap(mode); // snap current target, stop everything, static pose
      else run(); // ambient resumes from the current pose — intro does not replay
    },
    startIntro() { // logo assembled but sunk in depth, easing forward first
      mode = 'logo'; target = layout('logo');
      pos.set(target);
      for (let i = 0; i < N; i++) pos[i * 3 + 2] -= 180;
      seq = { t0: v, next: 0 };
      run(); changed();
    },
    setActive, snap,
    freeze() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
  };
  api.measure = measure;
  return api;
}
