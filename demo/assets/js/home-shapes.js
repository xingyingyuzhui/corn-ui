/* Homepage brand theater — shape data in world space. corn-mascot.png (a
   flood-filled cutout of the supplied icon) is sampled once on a 48x48 grid
   into kernel particles; each particle keeps its source colour (quantized for
   the sprite atlas) and a kind flag so leaves sit behind and eyes forward.
   The same set is re-laid out for logo / word — the icon morphs, not fades. */
export function sampleIcon(img) {
  const S = 48;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  const pts = [];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (d[i + 3] > 160) { // opaque source pixels: cob, leaves, charcoal eyes
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        pts.push({
          nx: (x + 0.5) / S - 0.5,
          ny: (y + 0.5) / S - 0.5,
          // 4 bits per channel — sprite atlas dedupe key
          q: ((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4),
          kind: r + gg + b < 210 ? 2 : (gg > r * 1.05 && gg > b ? 1 : 0) // eye / leaf / cob
        });
      }
    }
  }
  return pts.length ? pts : null;
}

const wordMasks = new Map(); // rasterize 'CORN' once per font stack; layout re-fits it
function wordPoints(fontStack) {
  const hit = wordMasks.get(fontStack);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 600; c.height = 180;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.font = '700 150px ' + fontStack;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('CORN', 300, 96);
  const d = g.getImageData(0, 0, 600, 180).data;
  const pts = [];
  let minX = 600, maxX = 0, minY = 180, maxY = 0;
  for (let y = 0; y < 180; y += 2) {
    for (let x = 0; x < 600; x += 2) {
      if (d[(y * 600 + x) * 4 + 3] > 160) {
        pts.push({ x, y });
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  const m = { pts, w: maxX - minX || 1, h: maxY - minY || 1, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  wordMasks.set(fontStack, m);
  return m;
}

export function logoScale(W, H) { return Math.min(H * 0.88, W * 0.9, 560); }

/* World-space targets for one mode: Float32Array [x,y,z, ...], origin at stage
   centre. The camera in home-motion projects these every frame. */
export function layoutTargets(kind, src, W, H, fontStack) {
  const N = src.length, out = new Float32Array(N * 3);
  if (kind === 'word') {
    const m = wordPoints(fontStack);
    const s = Math.min(W * 0.8 / m.w, H * 0.55 / m.h);
    for (let i = 0; i < N; i++) {
      const p = m.pts[Math.floor(i * m.pts.length / N)];
      out[i * 3] = (p.x - m.cx) * s;
      out[i * 3 + 1] = (p.y - m.cy) * s;
      out[i * 3 + 2] = (((i * 37) % 97) / 97 - 0.5) * 24; // ±12 shallow thickness
    }
  } else { // logo: sampled icon rebuilt as a gently domed relief
    const size = logoScale(W, H);
    for (let i = 0; i < N; i++) {
      const p = src[i];
      const nx = p.nx, domed = 1 - Math.min(1, (nx / 0.5) * (nx / 0.5));
      let z = size * 0.10 * domed + ((((i * 7919) % 997) / 997) - 0.5) * size * 0.02;
      if (p.kind === 1) z -= size * 0.04;      // husk leaves behind the cob
      else if (p.kind === 2) z += size * 0.02; // eyes ride the front surface
      out[i * 3] = nx * size;
      out[i * 3 + 1] = p.ny * size;
      out[i * 3 + 2] = z;
    }
  }
  // Spread centres without shrinking the kernels.
  for (let i = 0; i < N * 3; i += 3) { out[i] *= 1.04; out[i + 1] *= 1.04; }
  return out;
}
