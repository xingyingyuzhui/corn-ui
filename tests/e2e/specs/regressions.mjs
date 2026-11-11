// One check per defect found in the second review (REVIEW-SECOND.md).
// Each was written to fail on 8ccd195 before the fix.
import { contrast, fixturePage, listPages, openFixture } from '../lib.mjs';

const HIDDEN_CLASSES = ['corn-empty', 'corn-alert', 'corn-card', 'corn-btn', 'corn-tag', 'corn-field',
  'corn-stack', 'corn-cluster', 'corn-grid', 'corn-stat', 'corn-panel', 'corn-well', 'corn-table-wrap'];

export default async function regressions({ browser, base, dist, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ev = (p, fn, arg) => p.evaluate(fn, arg);

  // P1-1 hidden must hide every component
  {
    const body = HIDDEN_CLASSES.map((c) => `<div class="${c}" hidden data-c="${c}">x</div>`).join('');
    const { page } = await openFixture(ctx, base, fixturePage(body));
    const shown = await ev(page, () => [...document.querySelectorAll('[data-c]')]
      .filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.dataset.c));
    report.check('hidden attribute hides components', shown.length === 0, shown.join(','));
    await page.close();
  }

  // P1-1 scene "从空到第一条": the empty state really leaves
  {
    const page = await ctx.newPage();
    await page.goto(`${base}patterns.html`);
    await page.click('[data-corn-dialog-open="pt-dlg"]');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const r = await ev(page, () => ({
      emptyVisible: document.getElementById('pt-empty').checkVisibility(),
      cards: document.querySelectorAll('#pt-list .corn-card').length,
      focusOnNew: document.activeElement === document.querySelector('#pt-list .corn-card')
    }));
    report.check('scene empty→first: empty state hidden', !r.emptyVisible);
    report.check('scene empty→first: one card added', r.cards === 1, String(r.cards));
    report.check('scene empty→first: focus moves to the new card', r.focusOnNew);
    // P3-5 settings: out-of-range threshold is rejected, no success toast
    await page.fill('#pt-threshold', '999');
    await page.click('#pt-settings [type=submit]');
    await page.waitForTimeout(1200);
    const s = await ev(page, () => ({
      invalid: document.getElementById('pt-threshold').getAttribute('aria-invalid'),
      saved: [...document.querySelectorAll('.corn-toast')].some((t) => t.textContent.includes('设置已保存'))
    }));
    report.check('scene settings: 999% rejected', s.invalid === 'true' && !s.saved, JSON.stringify(s));
    await page.close();
  }

  // P2-2 tabs / segmented initialised while hidden; P3-7 nested tabs
  {
    const body = `<button id="o" data-corn-dialog-open="d">open</button>
<dialog class="corn-dialog" id="d"><div class="corn-dialog-body">
  <div class="corn-tabs" data-corn-segmented role="group" aria-label="p" id="seg"><button type="button" aria-pressed="true">日</button><button type="button" aria-pressed="false">周</button></div>
  <div data-corn-tabs id="tb"><div class="corn-tabs" role="tablist" aria-label="t"><button type="button" role="tab" aria-selected="true">一</button><button type="button" role="tab" aria-selected="false">二</button></div>
    <div class="corn-tab-panel" role="tabpanel">a</div><div class="corn-tab-panel" role="tabpanel" hidden>b</div></div>
</div></dialog>
<div data-corn-tabs id="outer"><div class="corn-tabs" role="tablist" aria-label="outer"><button type="button" role="tab" aria-selected="true">外一</button><button type="button" role="tab" aria-selected="false">外二</button></div>
  <div class="corn-tab-panel" role="tabpanel" id="op1">
    <div data-corn-tabs id="inner"><div class="corn-tabs" role="tablist" aria-label="inner"><button type="button" role="tab" aria-selected="false">内一</button><button type="button" role="tab" aria-selected="true">内二</button></div>
      <div class="corn-tab-panel" role="tabpanel" id="ip1" hidden>i1</div><div class="corn-tab-panel" role="tabpanel" id="ip2">i2</div></div>
  </div>
  <div class="corn-tab-panel" role="tabpanel" id="op2" hidden>o2</div></div>`;
    const { page, problems } = await openFixture(ctx, base, fixturePage(body));
    await page.waitForTimeout(100);
    await page.click('#o');
    await page.waitForTimeout(700);
    const ind = await ev(page, () => ['#seg', '#tb .corn-tabs'].map((s) => {
      const el = document.querySelector(s);
      return parseFloat(getComputedStyle(el, '::before').width) || 0;
    }));
    report.check('segmented in closed dialog shows selection', ind[0] > 10, `${ind[0]}px`);
    report.check('tabs in closed dialog shows selection', ind[1] > 10, `${ind[1]}px`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.click('#outer [role=tab] >> nth=1');
    const n = await ev(page, () => ['op1', 'op2', 'ip1', 'ip2'].map((id) => !document.getElementById(id).hidden).join());
    report.check('nested tabs: outer switch leaves inner alone', n === 'false,true,false,true', n);
    report.check('nested tabs: no console warnings', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // P3-6 toast live region exists before the first toast
  {
    const { page } = await openFixture(ctx, base, fixturePage('<p>no toast yet</p>'));
    await page.waitForTimeout(150);
    report.check('toast region pre-created', await ev(page, () => !!document.querySelector('.corn-toast-region[role="status"]')));
    await page.close();
  }

  // P2-4 interactive-state contrast (menu item focused) in both themes
  for (const theme of ['light', 'dark']) {
    const page = await ctx.newPage();
    await page.goto(`${base}components/menu.html`);
    await ev(page, (t) => document.documentElement.setAttribute('data-corn-theme', t), theme);
    await page.focus('[data-corn-menu]');
    await page.keyboard.press('ArrowUp'); // opens with the last (danger) item focused
    await page.waitForTimeout(250);
    const read = (sel) => ev(page, (s) => {
      const el = document.querySelector(s);
      const item = el.closest('[role=menuitem]');
      return [getComputedStyle(el).color, getComputedStyle(item).backgroundColor];
    }, sel);
    const danger = await read('#menu-field .corn-menu-danger');   // focused by ArrowUp
    await page.keyboard.press('Home');                            // focus first item (has kbd hint)
    await page.waitForTimeout(250);                               // let the hover/focus fade finish
    const kbd = await read('#menu-field [role=menuitem] .corn-menu-kbd');
    const pairs = [['danger item focused', ...danger], ['kbd hint focused', ...kbd]];
    for (const [what, fg, bg] of pairs) {
      const r = contrast(fg, bg);
      report.check(`${what} contrast (${theme})`, r >= 4.5, `${r.toFixed(2)} ${fg} on ${bg}`);
    }
    await page.close();
  }

  // P2-5 reveal delay is capped
  {
    const page = await ctx.newPage();
    await page.goto(`${base}components/index.html`);
    for (let y = 0; y < 4000; y += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(40); }
    await page.waitForTimeout(300);
    const max = await ev(page, () => Math.max(...[...document.querySelectorAll('[data-reveal].is-in')]
      .map((e) => Math.max(...getComputedStyle(e).transitionDelay.split(',').map(parseFloat)))));
    report.check('reveal delay ≤ 0.24s', max <= 0.24, `${max}s`);
    await page.close();
  }

  // P3-1/2 code popover: closes when its anchor leaves; visible focus; tabpanel wiring
  {
    const page = await ctx.newPage();
    await page.goto(`${base}components/button.html`);
    await page.focus('.code-trigger >> nth=0');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const f = await ev(page, () => {
      const a = document.activeElement;
      const panel = document.getElementById(a.getAttribute('aria-controls') || '-');
      return { role: a.getAttribute('role'), outline: getComputedStyle(a).outlineStyle, panel: panel && panel.getAttribute('role') };
    });
    report.check('popover focus lands on a visible control', f.outline !== 'none', JSON.stringify(f));
    report.check('popover tabs control a tabpanel', f.role === 'tab' && f.panel === 'tabpanel', JSON.stringify(f));
    await page.click('#code-pop [role=tab][data-kind=css]');
    const note = await ev(page, () => (document.querySelector('#code-pop .code-pop-note') || {}).textContent || '');
    report.check('CSS tab explains its dependencies', /corn\.css/.test(note || ''), note || '(none)');
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(400);
    report.check('popover closes when anchor scrolls away', await ev(page, () => document.getElementById('code-pop').hidden));
    await page.close();
  }

  // P3-3 heading levels never skip
  for (const path of listPages(dist)) {
    const page = await ctx.newPage();
    await page.goto(base + path);
    const skip = await ev(page, () => {
      let prev = 0;
      for (const h of document.querySelectorAll('main h1, main h2, main h3, main h4')) {
        const l = Number(h.tagName[1]);
        if (h.closest('dialog, template')) continue;
        if (prev && l > prev + 1) return `${h.tagName} "${h.textContent.trim().slice(0, 16)}" after h${prev}`;
        prev = l;
      }
      return '';
    });
    report.check(`${path} heading order`, !skip, skip);
    await page.close();
  }

  // P3-8 stat: accessible name is the final value while counting
  {
    const page = await ctx.newPage();
    await page.goto(`${base}components/stat.html`);
    await page.waitForTimeout(250);
    const snap = await page.locator('.corn-stat').first().ariaSnapshot();
    report.check('stat exposes final value during count-up', snap.includes('612.4'), snap.replace(/\n/g, ' ').slice(0, 80));
    await page.close();
  }
  await ctx.close();

  // P3-9 forced colors (Windows high contrast, emulated): state stays visible
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: 'active' });
  const fp = await fctx.newPage();
  await fp.goto(`${base}components/choice.html`);
  const fc = await ev(fp, () => ['.corn-radio:checked', '.corn-switch:checked'].map((s) => {
    const el = document.querySelector(s);
    return [s, getComputedStyle(el, '::after').backgroundColor, getComputedStyle(el).backgroundColor];
  }));
  for (const [s, mark, bg] of fc) report.check(`forced-colors: ${s} mark visible`, mark !== bg, `${mark} on ${bg}`);
  await fp.goto(`${base}components/tabs.html`);
  await fp.waitForTimeout(200);
  report.check('forced-colors: selected segment marked', await ev(fp, () =>
    getComputedStyle(document.querySelector('[data-corn-segmented] [aria-pressed="true"]')).outlineStyle !== 'none'));
  await fctx.close();

  // P2-3 reduced motion: toast bar static, hover pauses dismissal; sparkline instant
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await rctx.newPage();
  await page.goto(`${base}components/toast.html`);
  await page.click('[data-toast-title="已保存"]');
  await page.waitForTimeout(100);
  report.check('reduce: toast timer bar static', await ev(page, () =>
    getComputedStyle(document.querySelector('.corn-toast-timer')).animationPlayState === 'paused'));
  await page.hover('.corn-toast');
  await page.waitForTimeout(4600);
  report.check('reduce: hover pauses toast dismissal', await ev(page, () => !!document.querySelector('.corn-toast:not([data-leaving])')));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(4600);
  report.check('reduce: toast dismisses after leave', await ev(page, () => !document.querySelector('.corn-toast')));
  await page.goto(`${base}components/stat.html`);
  await page.waitForTimeout(200);
  const spark = await ev(page, () => getComputedStyle(document.querySelector('.corn-stat-spark path')).animationDuration);
  report.check('reduce: sparkline draw collapses', parseFloat(spark) <= 0.01, spark);
  await rctx.close();
}
