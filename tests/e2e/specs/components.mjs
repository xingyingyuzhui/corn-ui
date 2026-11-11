// Behaviour of the scripted components (keyboard paths included).
export default async function components({ browser, base, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const go = (name) => page.goto(`${base}components/${name}.html`);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // tabs: arrow keys move selection, panel follows, indicator moves
  await go('tabs');
  const tabs = page.locator('[data-corn-tabs]').first();
  await tabs.locator('[role="tab"]').first().focus();
  const x0 = await ev(() => getComputedStyle(document.querySelector('.corn-tabs')).getPropertyValue('--_x'));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  const t = await ev(() => {
    const root = document.querySelector('[data-corn-tabs]');
    const sel = [...root.querySelectorAll('[role="tab"]')].map((x) => x.getAttribute('aria-selected'));
    const vis = [...root.querySelectorAll('[role="tabpanel"]')].map((p) => !p.hidden);
    return { sel, vis, focus: document.activeElement.textContent, x: getComputedStyle(root.querySelector('.corn-tabs')).getPropertyValue('--_x') };
  });
  report.check('tabs ArrowRight selects next', t.sel.join() === 'false,true,false' && t.vis.join() === 'false,true,false', JSON.stringify(t));
  report.check('tabs indicator moves', t.x !== x0, `${x0} → ${t.x}`);
  await page.keyboard.press('End');
  report.check('tabs End', await ev(() => document.activeElement.textContent === '设置'));
  await page.click('[data-corn-segmented] button:nth-child(3)');
  report.check('segmented emits corn:change', (await page.textContent('#seg-out')).includes('month'));

  // menu: keyboard open, move, select, focus return; Esc closes
  await go('menu');
  await page.focus('[data-corn-menu]');
  await page.keyboard.press('ArrowDown');
  report.check('menu opens on ArrowDown', await ev(() => !document.getElementById('menu-field').hidden && document.activeElement.value === 'rename'));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  report.check('menu Enter selects', (await page.textContent('#menu-out')).includes('duplicate'));
  report.check('menu closes + focus returns', await ev(() => document.getElementById('menu-field').hidden && document.activeElement.hasAttribute('data-corn-menu')));
  await page.click('[data-corn-menu]');
  await page.keyboard.press('Escape');
  report.check('menu Esc closes', await ev(() => document.getElementById('menu-field').hidden));

  // dialog: open, Esc animates closed, focus returns, result event
  await go('dialog');
  await page.click('[data-corn-dialog-open="dlg-archive"]');
  report.check('dialog opens modal', await ev(() => document.getElementById('dlg-archive').open && document.getElementById('dlg-archive').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  report.check('dialog Esc closes', await ev(() => !document.getElementById('dlg-archive').open));
  report.check('dialog focus returns', await ev(() => document.activeElement.getAttribute('data-corn-dialog-open') === 'dlg-archive'));
  await page.click('[data-corn-dialog-open="dlg-archive"]');
  await page.click('#dlg-archive [data-corn-dialog-close="archive"]');
  await page.waitForTimeout(400);
  report.check('dialog close value', (await page.textContent('#dlg-out')).includes('archive'));

  // toast: appears in live region, then leaves
  await go('toast');
  await page.click('[data-toast-title="已保存"]');
  await page.waitForTimeout(150);
  report.check('toast shown in status region', await ev(() => {
    const r = document.querySelector('.corn-toast-region');
    return !!r && r.getAttribute('role') === 'status' && r.textContent.includes('已保存');
  }));
  await page.waitForTimeout(4700);
  report.check('toast auto-dismisses', await ev(() => !document.querySelector('.corn-toast')));

  // tooltip: shows on focus, Esc hides
  await go('tooltip');
  await page.focus('[aria-describedby="tip-refresh"]');
  await page.waitForTimeout(400);
  const op = () => ev(() => getComputedStyle(document.getElementById('tip-refresh')).opacity);
  report.check('tooltip visible on focus', (await op()) === '1');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  report.check('tooltip Esc hides', (await op()) === '0');

  // alert dismiss
  await go('alert');
  await page.click('[data-corn-dismiss]');
  await page.waitForTimeout(400);
  report.check('alert dismiss removes', await ev(() => !document.querySelector('[data-corn-dismissible]')));

  // stat count-up ends on the target value
  await go('stat');
  await page.locator('[data-corn-count]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  report.check('stat counts to target', (await page.textContent('[data-corn-count="612.4"]')).trim() === '612.4');

  // choice: indeterminate select-all
  await go('choice');
  await page.click('.ck-item >> nth=1');
  report.check('checkbox select-all syncs', await ev(() => document.getElementById('ck-all').checked));

  // button busy state
  await go('button');
  await page.click('#save-demo');
  report.check('button aria-busy on', (await page.getAttribute('#save-demo', 'aria-busy')) === 'true');
  await page.waitForTimeout(1400);
  report.check('button aria-busy off', (await page.getAttribute('#save-demo', 'aria-busy')) === 'false');

  await ctx.close();
}
