// The motion code tabs must be runnable, not just readable: pull each
// template's source out of the built page, assemble a standalone fixture
// with the real tokens/css/js, and drive its primary action.
import { fixturePage } from '../lib.mjs';

const TEMPLATES = ['t-field', 't-field-css', 't-field-js', 't-peel', 't-stamp', 't-type', 't-studies-css', 't-studies-js'];

export default async function labSnippets({ browser, base, report }) {
  const src = await browser.newPage();
  await src.goto(`${base}foundations/motion.html`);
  const tpl = await src.evaluate((ids) => {
    const out = {};
    ids.forEach((id) => { out[id] = document.getElementById(id).content.textContent; });
    return out;
  }, TEMPLATES);
  await src.close();

  // strip the "load the asset file" hint line from copied HTML; the fixture
  // injects the real CSS/JS text instead
  const stripLoader = (html) => html.replace(/<script[^>]*><\/script>/g, '');

  async function fixture(name, { html, css, js }) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const body = `<style>${css}</style>${stripLoader(html)}<script>${js}</script>`;
    await page.route('**/assets/corn/__fixture.html', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixturePage(body) }));
    await page.goto(`${base}assets/corn/__fixture.html`);
    await page.waitForTimeout(1600);
    report.check(`snippet ${name}: no page errors`, errors.length === 0, errors.join('|'));
    return { ctx, page };
  }

  // field: kernels generated, mode buttons move them
  {
    const { ctx, page } = await fixture('field', { html: tpl['t-field'], css: tpl['t-field-css'], js: tpl['t-field-js'] });
    const n = await page.evaluate(() => document.querySelectorAll('#mfx-cob i').length);
    report.check('snippet field: 380 kernels', n === 380, `${n}`);
    const t0 = await page.evaluate(() => document.querySelector('#mfx-cob i').style.transform);
    await page.click('[data-field-mode="stack"]');
    await page.waitForTimeout(1400);
    const t1 = await page.evaluate(() => document.querySelector('#mfx-cob i').style.transform);
    report.check('snippet field: mode buttons work', t0 !== t1, `${t0} vs ${t1}`);
    await page.screenshot({ path: '/tmp/corn-motion-snippet-field.png' });
    await ctx.close();
  }

  // peel: range drives --peel
  {
    const { ctx, page } = await fixture('peel', { html: tpl['t-peel'], css: tpl['t-studies-css'], js: tpl['t-studies-js'] });
    await page.evaluate(() => {
      const r = document.getElementById('mfx-peel');
      r.value = 40; r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const v = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.study-peel')).getPropertyValue('--peel').trim());
    report.check('snippet peel: range drives --peel', parseFloat(v) === 0.4, v);
    await ctx.close();
  }

  // stamp: confirm increments and the seal lands
  {
    const { ctx, page } = await fixture('stamp', { html: tpl['t-stamp'], css: tpl['t-studies-css'], js: tpl['t-studies-js'] });
    await page.click('#mfx-stamp');
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => ({
      serial: document.getElementById('mfx-serial').textContent,
      stamped: getComputedStyle(document.getElementById('mfx-seal')).opacity === '1'
    }));
    report.check('snippet stamp: confirm counts + seals', s.serial === 'NO. 0001' && s.stamped, JSON.stringify(s));
    await ctx.close();
  }

  // type: gust lifts glyphs then they settle
  {
    const { ctx, page } = await fixture('type', { html: tpl['t-type'], css: tpl['t-studies-css'], js: tpl['t-studies-js'] });
    await page.click('#mfx-type-gust');
    await page.waitForTimeout(400);
    const n = await page.evaluate(() => document.querySelector('#mfx-type span').getAnimations().length);
    report.check('snippet type: gust animates', n > 0, `${n} anims`);
    await page.screenshot({ path: '/tmp/corn-motion-snippet-type.png' });
    await ctx.close();
  }
}
