// Mobile docs <details> directory nav: collapsed + disclosure on small
// screens, open + hidden summary on desktop, no-JS stays usable.
export async function docsNav({ browser, base, report, errors }) {
  /* === mobile docs directory <details> ===================================== */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('dirnav: ' + e.message));
    await page.goto(base + 'components/button.html');
    await page.waitForTimeout(400);
    const d1 = await page.evaluate(() => {
      const d = document.querySelector('.docs-directory');
      const s = d.querySelector('summary');
      const h1 = document.querySelector('.docs-main h1');
      return { open: d.open, sumH: s.getBoundingClientRect().height,
        h1Top: h1.getBoundingClientRect().top,
        wbTop: document.querySelector('[data-wb]').getBoundingClientRect().top };
    });
    report.check('docs dir: collapsed on mobile, content above fold',
      !d1.open && d1.sumH > 0 && d1.h1Top < 844 && d1.wbTop < 844, JSON.stringify(d1));
    await page.evaluate(() => document.querySelector('.docs-directory summary').focus());
    await page.keyboard.press('Enter');
    const d2 = await page.evaluate(() => {
      const d = document.querySelector('.docs-directory');
      return { open: d.open,
        linkVisible: d.querySelector('.docs-side a[href$=".html"]').getBoundingClientRect().height > 0 };
    });
    report.check('docs dir: Enter opens usable nav links', d2.open && d2.linkVisible, JSON.stringify(d2));
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const stillOpen = await page.evaluate(() => document.querySelector('.docs-directory').open);
    report.check('docs dir: user toggle survives resize', stillOpen);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);
    const d3 = await page.evaluate(() => {
      const d = document.querySelector('.docs-directory');
      return { open: d.open,
        summaryHidden: d.querySelector('summary').getBoundingClientRect().height === 0,
        linkVisible: d.querySelector('.docs-side a[href$=".html"]').getBoundingClientRect().height > 0 };
    });
    report.check('docs dir: desktop shows nav, hides summary',
      d3.open && d3.summaryHidden && d3.linkVisible, JSON.stringify(d3));
    await page.screenshot({ path: '/tmp/corn-dirnav-mobile.png' });
    await ctx.close();
  }
  // no-JS: summary is a real disclosure widget
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + 'components/button.html');
    const d = await page.evaluate(() => {
      const el = document.querySelector('.docs-directory');
      return { enhanced: el.classList.contains('is-enhanced'),
        sumH: el.querySelector('summary').getBoundingClientRect().height };
    });
    report.check('docs dir: no-JS summary visible', !d.enhanced && d.sumH > 0, JSON.stringify(d));
    await page.click('.docs-directory summary');
    const opened = await page.evaluate(() => document.querySelector('.docs-directory').open);
    report.check('docs dir: no-JS click opens nav', opened);
    await ctx.close();
  }
}
