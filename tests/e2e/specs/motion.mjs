// Reduced motion: system preference and the in-page toggle both collapse
// durations, remove lifts and pause loops; reveal content is visible at once.
export default async function motion({ browser, base, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}components/progress.html`);
  const r = await page.evaluate(() => ({
    dur: getComputedStyle(document.documentElement).getPropertyValue('--corn-dur').trim(),
    loop: getComputedStyle(document.querySelector('.corn-spinner')).animationPlayState,
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length
  }));
  report.check('reduce: durations collapse', r.dur === '1ms', r.dur);
  report.check('reduce: loops paused', r.loop === 'paused', r.loop);
  report.check('reduce: reveal content visible', r.hidden === 0, `${r.hidden} hidden`);
  await page.goto(`${base}components/button.html`);
  await page.hover('.corn-btn-ink');
  const lift = (pg) => pg.evaluate(() => {
    const m = getComputedStyle(document.querySelector('.corn-btn-ink')).transform.match(/-?[\d.]+/g);
    return m ? Number(m[5]) : 0; // translateY component of matrix()
  });
  report.check('reduce: no hover lift', (await lift(page)) === 0);
  await ctx.close();

  const full = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await full.newPage();
  await p2.goto(`${base}components/button.html`);
  await p2.hover('.corn-btn-ink');
  await p2.waitForTimeout(300);
  report.check('full motion: hover lifts', (await lift(p2)) < 0);
  await p2.click('[data-site-toggle="motion"]');
  const t = await p2.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-corn-motion'),
    dur: getComputedStyle(document.documentElement).getPropertyValue('--corn-dur').trim(),
    stored: localStorage.getItem('corn-motion')
  }));
  report.check('toggle: reduce applied + persisted', t.attr === 'reduce' && t.dur === '1ms' && t.stored === 'reduce', JSON.stringify(t));
  await p2.click('[data-site-toggle="theme"]');
  const bg = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
  report.check('toggle: dark theme applied', bg === 'rgb(27, 30, 26)', bg);
  await full.close();
}
