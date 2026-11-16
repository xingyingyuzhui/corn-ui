// Boundary regressions: menu JS-fallback placement/flip, tooltip Esc
// dismissal without focus, toast lifetime under live motion-pref changes.
import { toastEdges } from './edges-toast.mjs';
export default async function edges({ browser, base, report }) {
  const errors = [];

  /* === menu: forced JS positioning fallback ================================ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      const orig = CSS.supports.bind(CSS);
      CSS.supports = function (...args) {
        if (args.some((a) => typeof a === 'string' && a.includes('anchor-name'))) return false;
        return orig(...args);
      };
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('menu: ' + e.message));
    await page.goto(base + 'components/menu.html');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-corn-motion', 'reduce');
      const wrap = document.querySelector('.corn-menu-wrap');
      document.body.appendChild(wrap);
      wrap.style.cssText = 'position:fixed;bottom:8px;right:8px;left:auto;top:auto;z-index:999';
    });
    await page.locator('.corn-menu-wrap [data-corn-menu]').first().click();
    await page.waitForTimeout(400);
    const m1 = await page.evaluate(() => {
      const wrap = document.querySelector('.corn-menu-wrap');
      const menu = wrap.querySelector('[popover], [role="menu"], .corn-menu');
      const btn = wrap.querySelector('[data-corn-menu]');
      const r = menu.getBoundingClientRect();
      return {
        open: menu.matches(':popover-open'),
        expanded: btn.getAttribute('aria-expanded'),
        focusIn: menu.contains(document.activeElement),
        rect: { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height },
        vw: innerWidth, vh: innerHeight
      };
    });
    const inside = m1.rect.x >= 7 && m1.rect.y >= 7 && m1.rect.r <= m1.vw - 7 && m1.rect.b <= m1.vh - 7;
    report.check('menu fallback: opened inside viewport at edge',
      m1.open && m1.expanded === 'true' && m1.focusIn && inside, JSON.stringify(m1));
    await page.screenshot({ path: '/tmp/corn-edges-menu-fallback.png' });

    // trigger moved onscreen → position follows on resize/scroll, still inside
    await page.evaluate(() => {
      const wrap = document.querySelector('.corn-menu-wrap');
      wrap.style.bottom = '120px';
      wrap.style.right = '300px';
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(250);
    const mf = await page.evaluate(() => {
      const wrap = document.querySelector('.corn-menu-wrap');
      const menu = wrap.querySelector('[popover]');
      const b = wrap.querySelector('[data-corn-menu]').getBoundingClientRect();
      const r = menu.getBoundingClientRect();
      return { open: menu.matches(':popover-open'),
        above: Math.abs(r.bottom + 6 - b.top), below: Math.abs(b.bottom + 6 - r.top),
        inside: r.left >= 7 && r.right <= innerWidth - 7 && r.top >= 7 && r.bottom <= innerHeight - 7 };
    });
    report.check('menu fallback: follows trigger on resize/scroll',
      mf.open && mf.inside && (mf.above < 2 || mf.below < 2), JSON.stringify(mf));

    // trigger pushed offscreen → menu closes without focus steal
    await page.evaluate(() => {
      document.querySelector('.corn-menu-wrap').style.bottom = '-600px';
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(300);
    const m2 = await page.evaluate(() => {
      const wrap = document.querySelector('.corn-menu-wrap');
      const menu = wrap.querySelector('[popover], [role="menu"], .corn-menu');
      return {
        open: menu.matches(':popover-open'),
        expanded: wrap.querySelector('[data-corn-menu]').getAttribute('aria-expanded'),
        focusInMenu: menu.contains(document.activeElement)
      };
    });
    report.check('menu fallback: offscreen trigger closes cleanly',
      !m2.open && m2.expanded === 'false' && !m2.focusInMenu, JSON.stringify(m2));

    // reposition + tall menu → constrained height with internal scroll
    await page.evaluate(() => {
      const wrap = document.querySelector('.corn-menu-wrap');
      wrap.style.bottom = '8px';
      wrap.style.right = '8px';
      window.dispatchEvent(new Event('resize'));
      const menu = wrap.querySelector('[popover], [role="menu"], .corn-menu');
      for (let i = 0; i < 20; i++) {
        const it = document.createElement('button');
        it.setAttribute('role', 'menuitem');
        it.textContent = '填充项 ' + i;
        menu.appendChild(it);
      }
    });
    await page.locator('.corn-menu-wrap [data-corn-menu]').first().click();
    await page.waitForTimeout(400);
    const m3 = await page.evaluate(() => {
      const menu = document.querySelector('.corn-menu-wrap [popover], .corn-menu-wrap [role="menu"]');
      const r = menu.getBoundingClientRect();
      const cs = getComputedStyle(menu);
      return {
        open: menu.matches(':popover-open'),
        h: r.height, b: r.bottom, vh: innerHeight,
        scrollable: menu.scrollHeight > menu.clientHeight && cs.overflowY === 'auto'
      };
    });
    report.check('menu fallback: tall menu capped + scrolls internally',
      m3.open && m3.h <= m3.vh - 14 && m3.b <= m3.vh - 7 && m3.scrollable, JSON.stringify(m3));

    // scrolling inside the menu must not trigger a reposition jump
    const rectOf = 'JSON.stringify(document.querySelector(\'.corn-menu-wrap [popover]\').getBoundingClientRect())';
    const rBefore = await page.evaluate(rectOf);
    await page.evaluate(() => {
      const menu = document.querySelector('.corn-menu-wrap [popover]');
      menu.scrollTop = 60;
      menu.dispatchEvent(new Event('scroll'));
      document.dispatchEvent(new Event('scroll')); // bubbled-to-document form is ignored too
    });
    await page.waitForTimeout(150);
    const rAfter = await page.evaluate(rectOf);
    report.check('menu fallback: internal scroll stays put', rBefore === rAfter, rBefore + ' vs ' + rAfter);

    // empty item list: ArrowDown must not throw
    await page.evaluate(() => {
      const menu = document.querySelector('.corn-menu-wrap [popover], .corn-menu-wrap [role="menu"]');
      menu.querySelectorAll('[role="menuitem"]').forEach((i) => i.remove());
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    report.check('menu: empty list ArrowDown no error', errors.length === 0, errors.join('|'));
    await ctx.close();
  }

  /* === menu: native anchored path where fully supported ==================== */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + 'components/menu.html');
    const anchored = await page.evaluate(() =>
      CSS.supports('anchor-name: --a') && CSS.supports('position-area: block-end') &&
      CSS.supports('top: anchor(bottom)'));
    if (anchored) {
      await page.locator('[data-corn-menu]').first().click();
      await page.waitForTimeout(300);
      const an = await page.evaluate(() => {
        const menu = document.querySelector('[data-anchored]');
        const r = menu && menu.getBoundingClientRect();
        return { flagged: !!menu, open: menu && menu.matches(':popover-open'),
          visible: r && r.width > 50 && r.y > 0 && r.y < innerHeight };
      });
      report.check('menu anchored: native path stays anchored + visible',
        an.flagged && an.open && an.visible, JSON.stringify(an));
    } else {
      report.note('menu anchored: full CSS anchor positioning unsupported here — skipped');
    }
    await ctx.close();
  }

  /* === tooltip: Esc dismisses hover-opened tips ============================ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('tooltip: ' + e.message));
    await page.goto(base + 'components/tooltip.html');
    const probe = () => page.evaluate(() => {
      const tip = document.querySelector('.corn-tooltip');
      const bub = tip.querySelector('.corn-tooltip-bubble') || tip.lastElementChild;
      const cs = getComputedStyle(bub);
      return { vis: cs.visibility, op: cs.opacity,
        dismissed: tip.hasAttribute('data-dismissed'),
        sameFocus: document.activeElement === window.__tipFocus };
    });
    await page.evaluate(() => { // park focus on something unrelated
      window.__tipFocus = document.querySelector('main .corn-btn') || document.body;
      window.__tipFocus.focus();
    });
    await page.locator('.corn-tooltip').first().hover();
    await page.waitForTimeout(400);
    const t1 = await probe();
    report.check('tooltip: hover shows bubble', t1.vis === 'visible' && t1.op === '1', JSON.stringify(t1));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const t2 = await probe();
    report.check('tooltip: Esc hides hover bubble, focus untouched',
      (t2.vis === 'hidden' || t2.op === '0') && t2.dismissed && t2.sameFocus, JSON.stringify(t2));
    // focus shifting elsewhere while still hovered must NOT re-arm the tip
    await page.evaluate(() => {
      const alt = [].find.call(document.querySelectorAll('main button'),
        (b) => !b.closest('.corn-tooltip')) || document.body;
      (window.__tipFocus = alt).focus();
    });
    await page.waitForTimeout(250);
    const t2b = await probe();
    report.check('tooltip: stays dismissed while still hovered',
      t2b.dismissed && (t2b.vis === 'hidden' || t2b.op === '0'), JSON.stringify(t2b));
    // a second Esc is NOT swallowed — the tip is already dismissed
    const notEaten = await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      return !e.defaultPrevented;
    });
    report.check('tooltip: closed tips do not eat the next Esc', notEaten);
    // leave + re-hover re-arms the tip
    await page.locator('h1').first().hover();
    await page.waitForTimeout(300);
    await page.locator('.corn-tooltip').first().hover();
    await page.waitForTimeout(400);
    const t3 = await probe();
    report.check('tooltip: re-hover re-arms bubble', t3.vis === 'visible' && !t3.dismissed, JSON.stringify(t3));
    // focused case still dismisses on Esc
    await page.evaluate(() => document.querySelector('.corn-tooltip button').focus());
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const t4 = await probe();
    report.check('tooltip: focused Esc hides bubble', t4.vis === 'hidden' || t4.op === '0', JSON.stringify(t4));
    await page.screenshot({ path: '/tmp/corn-edges-tooltip-esc.png' });
    await ctx.close();
  }

  /* === toast: JS lifetime clock (see edges-toast.mjs) ================ */
  await toastEdges({ browser, base, report, errors });

  report.check('edges: no page errors', errors.length === 0, errors.join('|'));
}
