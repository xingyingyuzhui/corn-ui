/* Kernel sprite atlas for the brand theater. Each unique quantized source
   colour gets one rounded-cuboid corn kernel — a squarish face slightly taller
   than wide with soft corners, an upper bevel light and a darker lower-right
   side lip for real thickness. Antialiased once at build time; particles are
   blitted with drawImage — no per-frame gradients or CSS filters. */
const CELL = 32, TILT = -8 * Math.PI / 180;

function chan(q, s) { return ((q >> s) & 15) * 17; }
function rgb(r, g, b, a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
function rr(g, x, y, w, h, rad) {
  g.beginPath();
  g.roundRect(x, y, w, h, rad);
}

function paintKernel(g, x, y, q) {
  const r = chan(q, 8), gg = chan(q, 4), b = chan(q, 0);
  const lr = Math.min(255, r + 48), lg = Math.min(255, gg + 48), lb = Math.min(255, b + 48);
  const dr = r * 0.68 | 0, dg = gg * 0.68 | 0, db = b * 0.68 | 0;
  const fw = CELL * 0.82, fh = CELL * 0.86, rad = fw * 0.19; // ~19% corner radius
  g.save();
  g.translate(x + CELL / 2, y + CELL / 2);
  g.rotate(TILT);
  // darker back body peeking out lower-right — the kernel's thickness
  g.fillStyle = rgb(dr, dg, db, 1);
  rr(g, -fw / 2 + fw * 0.08, -fh / 2 + fh * 0.08, fw, fh, rad);
  g.fill();
  // front face, nudged up-left over the back body
  const grad = g.createLinearGradient(-fw / 2, -fh / 2, fw / 2, fh / 2);
  grad.addColorStop(0, rgb(lr, lg, lb, 1));
  grad.addColorStop(0.55, rgb(r, gg, b, 1));
  grad.addColorStop(1, rgb(r * 0.88 | 0, gg * 0.88 | 0, b * 0.88 | 0, 1));
  g.fillStyle = grad;
  rr(g, -fw / 2, -fh / 2, fw, fh, rad);
  g.fill();
  g.strokeStyle = rgb(0, 0, 0, 0.08); // faint rim keeps grains separate
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

export function buildKernels(src) {
  const lut = new Map();
  const colours = [];
  const index = new Int32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    let cell = lut.get(src[i].q);
    if (cell === undefined) { cell = colours.length; colours.push(src[i].q); lut.set(src[i].q, cell); }
    index[i] = cell;
  }
  const cols = Math.ceil(Math.sqrt(colours.length));
  const rows = Math.ceil(colours.length / cols);
  const atlas = document.createElement('canvas');
  atlas.width = cols * CELL;
  atlas.height = rows * CELL;
  const g = atlas.getContext('2d');
  colours.forEach((q, i) => paintKernel(g, (i % cols) * CELL, ((i / cols) | 0) * CELL, q));
  return { atlas, cell: CELL, cols, index };
}
