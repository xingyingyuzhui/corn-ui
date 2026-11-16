// Toast lifetime boundary cases: JS clock across pref flips, hover/focus
// pause and manual close. Split from edges.mjs for the file-size budget.
export async function toastEdges({ browser, base, report, errors }) {
  async function toastCase(setup) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('toast: ' + e.message));
    await page.goto(base + 'components/toast.html');
    await setup(page);
    return { ctx, page };
  }
  // normal → reduce mid-life: still expires on the original deadline
  {
    const { ctx, page } = await toastCase(async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-corn-motion', 'full');
        window.__t = window.Corn.toast({ title: 'toast clock', duration: 1500 });
      });
      await page.waitForTimeout(300);
      await page.evaluate(() => document.documentElement.setAttribute('data-corn-motion', 'reduce'));
    });
    await page.waitForTimeout(2000);
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: normal→reduce still expires', gone);
    await page.screenshot({ path: '/tmp/corn-edges-toast-reduce.png' });
    await ctx.close();
  }
  // reduce → normal: same deadline holds
  {
    const { ctx, page } = await toastCase(async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-corn-motion', 'reduce');
        window.__t = window.Corn.toast({ title: 'toast clock', duration: 1500 });
      });
      await page.waitForTimeout(300);
      await page.evaluate(() => document.documentElement.removeAttribute('data-corn-motion'));
    });
    await page.waitForTimeout(2000);
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: reduce→normal still expires', gone);
    await ctx.close();
  }
  // under reduce the bar freezes at the live fraction (synced on the flip)
  {
    const { ctx, page } = await toastCase((page) =>
      page.evaluate(() => { window.__t = window.Corn.toast({ title: 'bar', duration: 1500 }); }));
    await page.waitForTimeout(600);
    await page.evaluate(() => document.documentElement.setAttribute('data-corn-motion', 'reduce'));
    await page.waitForTimeout(100);
    const frac = () => page.evaluate(() => {
      const m = getComputedStyle(window.__t.element.querySelector('.corn-toast-timer')).transform;
      const match = m.match(/matrix\(([^)]+)\)/);
      return match ? parseFloat(match[1].split(',')[0]) : (m === 'none' ? 1 : -1);
    });
    const f1 = await frac();
    await page.waitForTimeout(300);
    const f2 = await frac();
    await page.evaluate(() => document.documentElement.removeAttribute('data-corn-motion'));
    await page.waitForTimeout(100);
    const bar = await page.evaluate(() => {
      const el = window.__t.element;
      return { rem: parseFloat(el.style.getPropertyValue('--_remaining')),
        left: parseFloat(el.style.getPropertyValue('--_left')) };
    });
    await page.waitForTimeout(1100);
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: bar shows real remaining after pref flip',
      f1 > 0 && f1 < 0.8 && f1 === f2 && bar.rem > 0 && bar.rem < 0.8 &&
      bar.left > 0 && bar.left < 1500 && gone, `f=${f1}/${f2} ` + JSON.stringify(bar));
    await ctx.close();
  }
  // keyboard focus on the toast pauses the clock too (mid-life hold)
  {
    const { ctx, page } = await toastCase((page) =>
      page.evaluate(() => { window.__t = window.Corn.toast({ title: 'focus', duration: 1500 }); }));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__t.element.querySelector('.corn-toast-close').focus());
    await page.waitForTimeout(1700); // past life while held — clock must be paused
    const held = await page.evaluate(() => window.__t.element.isConnected);
    await page.evaluate(() => window.__t.element.querySelector('.corn-toast-close').blur());
    await page.waitForTimeout(1100); // ~600ms remaining + exit — must not restart a full life
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: focus pauses, blur resumes expiry', held && gone, `held=${held} gone=${gone}`);
    await ctx.close();
  }
  // normal control: expires on its own
  {
    const { ctx, page } = await toastCase((page) =>
      page.evaluate(() => { window.__t = window.Corn.toast({ title: 'control', duration: 1500 }); }));
    await page.waitForTimeout(2200);
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: control expires', gone);
    await ctx.close();
  }
  // hover pause stretches wall time, resume finishes the remainder
  {
    const { ctx, page } = await toastCase((page) =>
      page.evaluate(() => { window.__t = window.Corn.toast({ title: 'hover', duration: 1500 }); }));
    await page.waitForTimeout(900); // hold mid-life: ~600ms must remain, not 1500
    const box = await page.evaluate(() => {
      const r = window.__t.element.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(1700); // past life while hovered
    const held = await page.evaluate(() => window.__t.element.isConnected);
    await page.mouse.move(box.x, 30); // leave → remainder resumes
    await page.waitForTimeout(1100);
    const gone = await page.evaluate(() => !window.__t.element.isConnected);
    report.check('toast: hover pauses, resume expires', held && gone, `held=${held} gone=${gone}`);
    await ctx.close();
  }
  // manual close: gone once, no leaks
  {
    const { ctx, page } = await toastCase((page) =>
      page.evaluate(() => { window.__t = window.Corn.toast({ title: 'manual', duration: 60000 }); }));
    await page.locator('.corn-toast-close').first().click();
    await page.waitForTimeout(800);
    const n = await page.evaluate(() => document.querySelectorAll('.corn-toast').length);
    report.check('toast: manual close removes + no duplicates', n === 0, `n=${n}`);
    await ctx.close();
  }

}
