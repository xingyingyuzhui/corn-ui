// Theme correctness: inside every dark stage / .corn-dark block and with the
// whole page in data-corn-theme="dark", visible text must stay readable.
function audit(page) {
  return page.evaluate(() => {
    const opaque = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const a = bg.match(/[\d.]+/g);
        if (a && (a.length < 4 || Number(a[3]) > 0.95)) return bg;
      }
      return 'rgb(255,255,255)';
    };
    const out = [];
    const nodes = document.querySelectorAll('.specimen-stage *, .corn-dark *');
    nodes.forEach((el) => {
      const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (!own || !el.getClientRects().length) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.6 || cs.color === 'rgba(0, 0, 0, 0)') return;
      if (el.closest('[disabled], :disabled, [aria-disabled="true"], [aria-busy="true"], [role="tooltip"], .corn-code-card')) return;
      out.push({ text: el.textContent.trim().slice(0, 24), fg: cs.color, bg: opaque(el), size: parseFloat(cs.fontSize), bold: Number(cs.fontWeight) >= 700 });
    });
    return out;
  });
}

import { contrast } from '../lib.mjs';

export default async function theme({ browser, base, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const targets = ['accordion', 'alert', 'button', 'card', 'choice', 'code', 'dialog', 'empty',
    'form', 'menu', 'progress', 'stat', 'surface', 'table', 'tabs', 'tag', 'toast', 'tooltip'];
  for (const mode of ['light', 'dark']) {
    for (const name of targets) {
      await page.goto(`${base}components/${name}.html`);
      await page.evaluate((m) => document.documentElement.setAttribute('data-corn-theme', m), mode);
      await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
      await page.waitForTimeout(350);
      const bad = (await audit(page))
        .map((s) => ({ ...s, ratio: contrast(s.fg, s.bg) }))
        .filter((s) => s.ratio < (s.size >= 24 || (s.size >= 18.66 && s.bold) ? 3 : 4.5));
      report.check(`${name} text contrast (${mode})`, bad.length === 0,
        bad.slice(0, 3).map((b) => `"${b.text}" ${b.ratio.toFixed(2)} ${b.fg} on ${b.bg}`).join('; '));
    }
  }
  await ctx.close();
}
