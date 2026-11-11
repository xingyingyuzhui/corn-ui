// Shared helpers for the e2e specs.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function listPages(dist) {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== 'assets') walk(full);
      } else if (name.endsWith('.html')) {
        out.push(relative(dist, full).split('\\').join('/'));
      }
    }
  })(dist);
  return out.sort();
}

/** Open a page and record console errors/warnings, page errors and failed requests. */
export async function openTracked(ctx, url) {
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  await page.goto(url, { waitUntil: 'load' });
  return { page, problems };
}

export class Report {
  constructor() { this.passed = 0; this.failed = []; this.notes = []; }
  check(name, ok, detail = '') {
    if (ok) this.passed += 1;
    else this.failed.push(detail ? `${name} — ${detail}` : name);
  }
  note(text) { this.notes.push(text); }
}

/** WCAG contrast ratio between two "rgb(a)" strings (alpha over white ignored: callers pass opaque). */
export function contrast(a, b) {
  const lum = (s) => {
    const [r, g, bl] = s.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
