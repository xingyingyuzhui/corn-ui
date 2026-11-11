// Corn UI browser regression suite.
//   node tests/e2e/run.mjs            (expects dist/ — run `pnpm build` first)
// Playwright is not a project dependency: it is resolved from the
// environment (`playwright` on the module path, or CORN_PLAYWRIGHT=/path/to/playwright).
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { Report } from './lib.mjs';
import pages from './specs/pages.mjs';
import codePop from './specs/code-pop.mjs';
import components from './specs/components.mjs';
import theme from './specs/theme.mjs';
import motion from './specs/motion.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.CORN_PLAYWRIGHT, 'playwright', 'playwright-core'].filter(Boolean);
  for (const id of candidates) {
    try { return require(id); } catch { /* try next */ }
  }
  console.error('Playwright not found. Install it locally (pnpm add -D playwright) or set CORN_PLAYWRIGHT=/abs/path/node_modules/playwright');
  process.exit(2);
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ missing — run `python3 scripts/build.py` first');
  process.exit(2);
}

const { chromium } = loadPlaywright();
const server = await serve(DIST);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const report = new Report();
const suites = { pages, codePop, components, theme, motion };
const only = process.argv.slice(2);
try {
  for (const [name, spec] of Object.entries(suites)) {
    if (only.length && !only.includes(name)) continue;
    const t0 = Date.now();
    const before = report.failed.length;
    await spec({ browser, base, dist: DIST, report });
    console.log(`  ${name.padEnd(11)} ${report.failed.length === before ? 'ok  ' : 'FAIL'} (${Date.now() - t0} ms)`);
  }
} finally {
  await browser.close();
  server.close();
}
for (const n of report.notes) console.log(`  note: ${n}`);
for (const f of report.failed) console.log(`  ✗ ${f}`);
console.log(`${report.passed} checks passed, ${report.failed.length} failed`);
process.exit(report.failed.length ? 1 : 0);
