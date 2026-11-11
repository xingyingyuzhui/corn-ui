// Code popover on every trigger of every page: opens, shows exactly the
// template text for each tab, copies exactly that text, stays inside the
// viewport, closes on Esc (focus returns) and on outside click.
import { listPages } from '../lib.mjs';

async function clipboard(page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

export default async function codePop({ browser, base, dist, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base.replace(/\/$/, '') });
  let total = 0;
  for (const path of listPages(dist)) {
    const page = await ctx.newPage();
    await page.goto(base + path);
    const count = await page.locator('.code-trigger').count();
    for (let i = 0; i < count; i++) {
      total += 1;
      const trigger = page.locator('.code-trigger').nth(i);
      const label = `${path}#${i}`;
      try {
        await exercise(page, trigger, label, i, count, report);
      } catch (err) {
        report.check(`${label} completes`, false, err.message.split('\n')[0]);
        await page.keyboard.press('Escape');
      }
    }
    await page.close();
  }
  report.note(`${total} code triggers exercised`);
  await ctx.close();
}

async function exercise(page, trigger, label, i, count, report) {
  {
    {
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      await page.keyboard.press('Enter');                 // keyboard open
      await page.waitForTimeout(260);
      const state = await page.evaluate(() => {
        const pop = document.getElementById('code-pop');
        const r = pop.getBoundingClientRect();
        return {
          open: !pop.hidden,
          expanded: document.querySelector('.code-trigger[aria-expanded="true"]') !== null,
          inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          focusInPop: pop.contains(document.activeElement)
        };
      });
      report.check(`${label} opens`, state.open && state.expanded);
      report.check(`${label} inside viewport`, state.inside);
      report.check(`${label} focus moves into popover`, state.focusInPop);

      const tabs = await page.locator('#code-pop [role="tab"]').count();
      for (let t = 0; t < tabs; t++) {
        await page.locator('#code-pop [role="tab"]').nth(t).click({ timeout: 3000 });
        const same = await page.evaluate((idx) => {
          const trig = document.querySelector('.code-trigger[aria-expanded="true"]');
          const kind = document.querySelectorAll('#code-pop [role="tab"]')[idx].dataset.kind;
          const key = { html: 'codeHtml', css: 'codeCss', js: 'codeJs', deps: 'codeDeps', page: 'codePage' }[kind];
          const tpl = document.getElementById(trig.dataset[key]).content.textContent;
          return { ok: document.querySelector('#code-pop code').textContent === tpl, tpl, kind };
        }, t);
        report.check(`${label} tab ${same.kind} shows template`, same.ok);
        if (t === 0 || same.kind === 'js') {
          await page.click('#code-pop [data-pop-copy]', { timeout: 3000 });
          await page.waitForTimeout(80);
          const copied = await clipboard(page);
          const status = await page.textContent('#code-pop .code-pop-status');
          report.check(`${label} copy ${same.kind} exact`, copied === same.tpl, `${copied.length} vs ${same.tpl.length}`);
          report.check(`${label} copy feedback`, /已复制/.test(status), status);
        }
      }
      if (i === 0 || i === count - 1) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(260);
        const esc = await page.evaluate(() => ({
          hidden: document.getElementById('code-pop').hidden,
          focusBack: document.activeElement.classList.contains('code-trigger'),
          expanded: document.querySelector('.code-trigger[aria-expanded="true"]') !== null
        }));
        report.check(`${label} Esc closes`, esc.hidden && !esc.expanded);
        report.check(`${label} Esc returns focus`, esc.focusBack);
        await trigger.click();
        await page.waitForTimeout(200);
        await page.mouse.click(5, 795);
        await page.waitForTimeout(260);
        report.check(`${label} outside click closes`, await page.evaluate(() => document.getElementById('code-pop').hidden));
      } else {
        await trigger.click();                            // toggle closed
        await page.waitForTimeout(260);
        report.check(`${label} trigger toggles closed`, await page.evaluate(() => document.getElementById('code-pop').hidden));
      }
    }
  }
}
