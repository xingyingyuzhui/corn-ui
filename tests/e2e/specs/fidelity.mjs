// Copy fidelity. For every specimen, two user paths must reproduce what the
// site shows, measured as: body text font, row structure (depth 1 and 2),
// effective background behind the content, and zero console problems.
//   a) the "整页" tab opened on its own;
//   b) the "引入" tab with the HTML tab pasted where it says to paste.
import { listPages, openFixture } from '../lib.mjs';

const PASTE = '<!-- 把 HTML 页签的代码粘到这里 -->';

function measure(selector) {
  const root = document.querySelector(selector);
  // fixed overlays (e.g. the toast live region corn.js adds to <body>) are not layout
  const visible = (el) => !['SCRIPT', 'TEMPLATE', 'DIALOG'].includes(el.tagName) && el.getClientRects().length > 0
    && getComputedStyle(el).position !== 'fixed';
  const rows = (el) => new Set([...el.children].filter(visible).map((c) => Math.round(c.getBoundingClientRect().top))).size;
  const kids = [...root.children].filter(visible);
  const first = kids[0];
  const text = [...root.querySelectorAll('*')].find((el) => visible(el)
    && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  let bg = 'none';
  for (let n = text; n && n !== document.documentElement; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
  }
  return {
    font: text ? getComputedStyle(text).fontFamily : '',
    rows: `${rows(root)}/${kids.length === 1 && first ? rows(first) : '-'}`,
    bg
  };
}

function compose(deps, html) {
  if (deps.includes(PASTE)) return deps.replace(PASTE, html);
  return `${deps}\n<body>\n${html}</body>`; // what a user would do with a bare <link> list
}

export default async function fidelity({ browser, base, dist, report }) {
  let total = 0;
  for (const path of listPages(dist)) {
    if (!(path === 'patterns.html' || (path.startsWith('components/') && path !== 'components/index.html'))) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + path);
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
    const specs = await page.evaluate(() => [...document.querySelectorAll('.specimen')].map((s) => {
      const t = s.querySelector('.code-trigger');
      const text = (key) => (t.dataset[key] && document.getElementById(t.dataset[key])
        ? document.getElementById(t.dataset[key]).content.textContent : null);
      const st = s.querySelector('.specimen-stage');
      const cs = getComputedStyle(st);
      return { id: s.id, html: text('codeHtml'), deps: text('codeDeps'), full: text('codePage'),
        width: Math.round(st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) };
    }));
    for (const sp of specs) {
      total += 1;
      const live = await page.evaluate(measure, `#${sp.id} .specimen-stage`);
      const paths = [['引入+HTML', compose(sp.deps || '', sp.html || '')]];
      if (sp.full) paths.push(['整页', sp.full]);
      else report.check(`${sp.id} has 整页 code`, false);
      for (const [label, html] of paths) {
        const sctx = await browser.newContext({ viewport: { width: sp.width + 16, height: 900 } });
        const { page: alone, problems } = await openFixture(sctx, base, html);
        await alone.waitForTimeout(120);
        const got = await alone.evaluate(measure, 'body');
        const tag = `${sp.id} [${label}]`;
        report.check(`${tag} font`, got.font === live.font, `${got.font.slice(0, 24)} vs ${live.font.slice(0, 24)}`);
        report.check(`${tag} layout rows`, got.rows === live.rows, `${got.rows} vs ${live.rows}`);
        report.check(`${tag} background`, got.bg === live.bg, `${got.bg} vs ${live.bg}`);
        report.check(`${tag} no console problems`, problems.length === 0, problems.join(' | '));
        await sctx.close();
      }
    }
    await ctx.close();
  }
  report.note(`${total} specimens checked for copy fidelity`);
}
