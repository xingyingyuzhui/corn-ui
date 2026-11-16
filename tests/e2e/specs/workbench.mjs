import { docsNav } from './workbench-docs.mjs';
// Workbench regressions: component directory <search> filtering and the
// button parameter pilot (preview, serialization, escaping, copy).
import { openFixture, fixturePage, contrast } from '../lib.mjs';

export default async function workbench({ browser, base, report }) {
  const errors = [];

  /* === directory search ==================================================== */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('dir: ' + e.message));
    await page.goto(base + 'components/');
    const cards = () => page.evaluate(() => ({
      total: document.querySelectorAll('.comp-card').length,
      shown: document.querySelectorAll('.comp-card:not([hidden])').length,
      groupsShown: document.querySelectorAll('.comp-group:not([hidden])').length,
      status: document.querySelector('[data-comp-filter-status]').textContent
    }));

    await page.fill('#comp-filter-q', '按钮');
    await page.waitForTimeout(150);
    let s = await cards();
    report.check('dir: Chinese query narrows cards', s.shown > 0 && s.shown < s.total, JSON.stringify(s));

    await page.fill('#comp-filter-q', 'toast');
    await page.waitForTimeout(150);
    s = await cards();
    report.check('dir: English name query matches', s.shown >= 1, JSON.stringify(s));

    // query ∩ group: 'toast' matches a feedback component, not 'action'
    await page.fill('#comp-filter-q', 'toast');
    await page.selectOption('#comp-filter-group', 'action');
    await page.waitForTimeout(150);
    s = await cards();
    const inGroup = await page.evaluate(() =>
      [].every.call(document.querySelectorAll('.comp-card:not([hidden])'),
        (c) => c.getAttribute('data-group') === 'action'));
    report.check('dir: query + group intersect', s.shown === 0 && inGroup, JSON.stringify(s));

    // no-results state + clear
    const emptyVisible = await page.evaluate(() =>
      !document.querySelector('[data-comp-filter-empty]').hidden);
    await page.click('[data-comp-filter-clear]');
    await page.waitForTimeout(150);
    s = await cards();
    report.check('dir: no-results shows reset, clear restores all',
      emptyVisible && s.shown === s.total, JSON.stringify(s));

    // group-only filter hides empty groups
    await page.selectOption('#comp-filter-group', 'action');
    await page.waitForTimeout(150);
    s = await cards();
    report.check('dir: group filter shows only that group',
      s.groupsShown === 1 && s.shown < s.total, JSON.stringify(s));

    // every card keeps a real link
    const links = await page.evaluate(() =>
      [].map.call(document.querySelectorAll('.comp-card'), (a) => a.getAttribute('href')));
    report.check('dir: all cards keep real hrefs',
      links.length === s.total && links.every((h) => h && h.endsWith('.html')), links.slice(0, 3).join(','));

    // keyboard: focus stays on the control while typing
    await page.selectOption('#comp-filter-group', '');
    await page.click('#comp-filter-q');
    await page.keyboard.type('表');
    await page.waitForTimeout(150);
    const focusOk = await page.evaluate(() => document.activeElement.id === 'comp-filter-q');
    report.check('dir: focus stays on search while typing', focusOk);
    await ctx.close();
  }

  // no-JS: controls stay hidden, all cards visible; workbench stays static
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + 'components/');
    const s = await page.evaluate(() => ({
      filterHidden: document.querySelector('[data-comp-filter]').hidden,
      total: document.querySelectorAll('.comp-card').length,
      shown: [].filter.call(document.querySelectorAll('.comp-card'), (c) => !c.hidden).length
    }));
    report.check('dir: no-JS shows all cards, controls hidden',
      s.filterHidden && s.shown === s.total, JSON.stringify(s));
    await page.goto(base + 'components/button.html');
    const wb = await page.evaluate(() => ({
      copyDisabled: document.querySelector('[data-wb-copy]').disabled,
      paramsDisabled: document.querySelector('[data-wb-params]').disabled,
      code: document.querySelector('[data-wb-code]').textContent.includes('corn-btn-ink')
    }));
    report.check('wb: no-JS static preview + inert controls',
      wb.copyDisabled && wb.paramsDisabled && wb.code, JSON.stringify(wb));
    await ctx.close();
  }

  /* === button workbench ==================================================== */
  const wbOpen = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('wb: ' + e.message));
    await page.goto(base + 'components/button.html');
    return { ctx, page };
  };
  {
    const { ctx, page } = await wbOpen();
    const read = () => page.evaluate(() => {
      const btn = document.querySelector('[data-wb-stage] button');
      const code = document.querySelector('[data-wb-code]').textContent;
      return { cls: btn.className, html: btn.outerHTML, code,
        disabled: btn.disabled, busy: btn.getAttribute('aria-busy') };
    });

    let r = await read();
    report.check('wb: default preview matches snippet',
      r.cls === 'corn-btn corn-btn-ink' && r.code === r.html, r.code);

    let varOk = true;
    for (const v of ['maize', 'husk', 'soft', 'ghost', 'danger']) {
      await page.selectOption('#wb-variant', v);
      r = await read();
      if (r.cls !== 'corn-btn corn-btn-' + v || r.code !== r.html) varOk = false;
    }
    report.check('wb: all variants render + serialize', varOk, r.cls + ' | ' + r.code.slice(0, 60));

    await page.selectOption('#wb-variant', 'ink');
    await page.selectOption('#wb-size', 'lg');
    r = await read();
    const lg = r.cls.includes('corn-btn-lg');
    await page.selectOption('#wb-size', 'sm');
    r = await read();
    report.check('wb: sizes apply classes', lg && r.cls.includes('corn-btn-sm'), r.cls);

    await page.selectOption('#wb-size', 'default');
    await page.selectOption('#wb-state', 'disabled');
    r = await read();
    const dis = r.disabled && r.code.includes('disabled');
    await page.selectOption('#wb-state', 'busy');
    r = await read();
    report.check('wb: disabled + busy states',
      dis && r.busy === 'true' && r.code.includes('aria-busy="true"'), r.code);

    // label with HTML-looking input is escaped, never executed
    await page.selectOption('#wb-state', 'normal');
    await page.fill('#wb-label', '<img src=x onerror=alert(1)>');
    await page.waitForTimeout(100);
    r = await read();
    const safe = await page.evaluate(() => !document.querySelector('[data-wb-stage] img'));
    report.check('wb: HTML label is escaped in preview + code',
      safe && r.code.includes('&lt;img') && r.code === r.html, r.code);

    // copy passes the current snippet text + reports outcome
    // (blur first: WebKit eats the first real click while the text field
    //  still owns an input suggestion popup — a driver quirk, not a bug)
    await page.evaluate(() => {
      document.getElementById('wb-label').blur();
      window.__copied = null;
      window.CornDemo.copy = (t) => { window.__copied = t; return Promise.resolve(true); };
    });
    await page.click('[data-wb-copy]');
    await page.waitForTimeout(250);
    const copied = await page.evaluate(() => window.__copied);
    const fb = await page.evaluate(() => ({
      label: document.querySelector('[data-wb-copy]').textContent,
      note: document.querySelector('[data-wb-note]').textContent
    }));
    report.check('wb: copy sends current snippet + success feedback',
      copied === r.code && fb.label === '已复制' && fb.note === '已复制',
      String(copied).slice(0, 60) + ' | ' + JSON.stringify(fb));
    // failed copy says so instead of lying
    await page.evaluate(() => { window.CornDemo.copy = () => Promise.resolve(false); });
    await page.click('[data-wb-copy]');
    await page.waitForTimeout(250);
    const fb2 = await page.evaluate(() => ({
      label: document.querySelector('[data-wb-copy]').textContent,
      note: document.querySelector('[data-wb-note]').textContent
    }));
    report.check('wb: copy failure feedback', fb2.label === '复制失败' && fb2.note === '复制失败',
      JSON.stringify(fb2));

    // reset restores defaults everywhere
    await page.click('[data-wb-reset]');
    r = await read();
    const controls = await page.evaluate(() => ({
      v: document.getElementById('wb-variant').value,
      s: document.getElementById('wb-size').value,
      st: document.getElementById('wb-state').value,
      l: document.getElementById('wb-label').value
    }));
    report.check('wb: reset restores defaults',
      r.cls === 'corn-btn corn-btn-ink' && controls.v === 'ink' &&
      controls.s === 'default' && controls.st === 'normal' && controls.l === '保存设置',
      JSON.stringify(controls));
    await page.screenshot({ path: '/tmp/corn-wb-default.png' });

    // paste the snippet into a bare page with the bundle: identical button
    const { page: fx, problems } = await openFixture(ctx, base, fixturePage(r.code));
    const pasted = await fx.evaluate(() => {
      const b = document.querySelector('.corn-btn');
      return { cls: b.className, label: b.textContent, h: b.getBoundingClientRect().height };
    });
    report.check('wb: snippet renders standalone with bundled CSS',
      pasted.cls === 'corn-btn corn-btn-ink' && pasted.label === '保存设置' && pasted.h > 40 &&
      problems.length === 0, JSON.stringify(pasted));
    await ctx.close();
  }

  // small viewports: a 24-char label overflows the stage LOCALLY (scrolls),
  // never the page; the code block scrolls inside its own panel too
  for (const w of [320, 390]) {
    const { ctx, page } = await wbOpen({ viewport: { width: w, height: 844 } });
    await page.fill('#wb-label', '这是一个超长的按钮文字用来测试舞台溢出情况');
    await page.selectOption('#wb-size', 'lg');
    await page.waitForTimeout(150);
    const st = await page.evaluate(() => {
      const stage = document.querySelector('[data-wb-stage]');
      const btn = stage.querySelector('.corn-btn');
      const sr = stage.getBoundingClientRect();
      const start = btn.getBoundingClientRect();
      stage.scrollLeft = 1e6;
      const end = btn.getBoundingClientRect();
      stage.scrollLeft = 0;
      return {
        scrollable: stage.scrollWidth > stage.clientWidth + 4,
        startOk: start.left >= sr.left - 2,
        reached: end.right <= sr.right + 2,
        codeScrolls: getComputedStyle(document.querySelector('.wb-code')).overflowX === 'auto',
        docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    report.check(`wb: long label contained at ${w}px`,
      st.docOver <= 1 && st.scrollable && st.startOk && st.reached && st.codeScrolls, JSON.stringify(st));
    if (w === 390) await page.screenshot({ path: '/tmp/corn-wb-mobile.png' });
    await ctx.close();
  }

  // dark + reduced-motion smoke
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base + 'components/button.html');
    await page.waitForTimeout(300);
    const ok = await page.evaluate(() => {
      const btn = document.querySelector('[data-wb-stage] button');
      return !!btn && btn.className === 'corn-btn corn-btn-ink' &&
        document.querySelector('[data-wb-params]').disabled === false;
    });
    report.check('wb: dark + reduced-motion still interactive', ok);
    // label/status text keeps ≥4.5 contrast on its real dark background
    const cc = await page.evaluate(() => {
      const lab = document.querySelector('.wb-field');
      let el = lab, bg = '';
      while (el && el !== document.documentElement) {
        const b = getComputedStyle(el).backgroundColor;
        const m = b.match(/rgba?\(([^)]+)\)/);
        if (m && (m[1].split(',').length < 4 || parseFloat(m[1].split(',')[3]) > 0.9)) { bg = b; break; }
        el = el.parentElement;
      }
      return { color: getComputedStyle(lab).color, bg };
    });
    report.check('wb: dark label contrast ≥ 4.5', !!cc.bg && contrast(cc.color, cc.bg) >= 4.5, JSON.stringify(cc));
    await page.screenshot({ path: '/tmp/corn-wb-dark.png' });
    await ctx.close();
  }

  await docsNav({ browser, base, report, errors }); // mobile docs <details> nav

  report.check('workbench: no page errors', errors.length === 0, errors.join('|'));
}
