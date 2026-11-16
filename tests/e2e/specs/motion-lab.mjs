// Motion field lab: the hero particle field, the three studies, and their
// reduced-motion behaviour — including toggles flipped after page load.
import labSnippets from './motion-lab-snippets.mjs';

export default async function motionLab({ browser, base, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}foundations/motion.html`);
  await page.waitForTimeout(2200); // initial gather settles

  const kids = await page.evaluate(() => document.querySelectorAll('#mfx-cob i').length);
  report.check('field: exactly 380 kernels (95 cells x4)', kids === 380, `${kids}`);
  const chrome = await page.evaluate(() => ({
    status: !!document.getElementById('mfx-field-status'),
    text: document.querySelector('.motion-lab-hero').innerText
  }));
  report.check('field: no status output or survey labels',
    !chrome.status && !chrome.text.includes('KINETIC TYPE') && !chrome.text.includes('MOVE YOUR POINTER'));
  report.check('field: RAF stops once settled',
    await page.evaluate(() => document.getElementById('mfx-field').dataset.running === 'false'));

  const firstTransform = () => page.evaluate(() =>
    document.querySelector('#mfx-cob i').style.transform);

  const settle = () => page.waitForTimeout(1400);

  const tType = await firstTransform();
  await page.click('[data-field-mode="scatter"]');
  await settle();
  const tScatter = await firstTransform();
  await page.click('[data-field-mode="stack"]');
  await settle();
  const tStack = await firstTransform();
  report.check('field: modes move kernels', tType !== tScatter && tScatter !== tStack && tType !== tStack,
    `${tType} | ${tScatter} | ${tStack}`);
  const pressed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-field-mode]')].map((b) => b.getAttribute('aria-pressed')));
  report.check('field: aria-pressed exclusive', pressed.join() === 'false,false,true', pressed.join());
  // rapid switching: no errors, no leaked children
  for (const m of ['type', 'stack', 'scatter', 'type', 'stack']) {
    await page.click(`[data-field-mode="${m}"]`);
  }
  await settle();
  const kidsAfter = await page.evaluate(() => document.querySelectorAll('#mfx-cob i').length);
  report.check('field: rapid switching stable', kidsAfter === kids && errors.length === 0, errors.join('|'));
  // returning to type restores the bitmap layout
  await page.click('[data-field-mode="type"]');
  await settle();
  const tTypeBack = await firstTransform();
  report.check('field: type layout restores', tTypeBack === tType, `${tTypeBack} vs ${tType}`);

  // Pointer brushing: mid-flight positions differ from settled, leave returns
  const kPos = await page.evaluate(() => {
    const f = document.getElementById('mfx-field');
    const fr = f.getBoundingClientRect();
    const kr = document.querySelector('#mfx-cob i').getBoundingClientRect();
    return { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2, kx: kr.left + kr.width / 2, ky: kr.top + kr.height / 2 };
  });
  await page.mouse.move(kPos.x, kPos.y);
  await page.mouse.move(kPos.kx, kPos.ky, { steps: 4 });
  await page.waitForTimeout(250);
  const tPtr = await firstTransform();
  report.check('field: pointer displaces kernels', tPtr !== tTypeBack, `${tPtr} vs ${tTypeBack}`);
  // Stationary pointer: kernels reach the displaced equilibrium, then RAF stops
  await page.waitForFunction(() => document.getElementById('mfx-field').dataset.running === 'false', null, { timeout: 4000 });
  report.check('field: stationary pointer converges then sleeps', true);
  await page.evaluate(() => {
    document.getElementById('mfx-field').dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  });
  await settle();
  const tBack = await firstTransform();
  report.check('field: pointer leave reconverges', tBack === tTypeBack, `${tBack} vs ${tTypeBack}`);

  // Early-vs-mid positions prove real motion, not just animation names.
  await page.click('[data-field-mode="scatter"]');
  await page.waitForTimeout(120);
  const early = await firstTransform();
  await page.waitForTimeout(500);
  const mid = await firstTransform();
  report.check('field: positions change during flight', early !== mid, `${early} vs ${mid}`);
  await page.click('[data-field-mode="type"]');
  await settle();
  report.check('field: no page errors', errors.length === 0, errors.join('|'));

  // Scrolled out of view: the loop suspends instead of idling offscreen.
  await page.locator('#study-peel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  report.check('field: RAF suspended offscreen',
    await page.evaluate(() => document.getElementById('mfx-field').dataset.running === 'false'));
  await page.locator('#mfx-field').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  /* --- 01 peel ---------------------------------------------------------- */
  const peel = page.locator('#mfx-peel');
  await peel.focus();
  await peel.press('Home');
  const p0 = await page.evaluate(() => ({
    v: document.getElementById('mfx-peel').value,
    peel: getComputedStyle(document.querySelector('#study-peel .study-peel')).getPropertyValue('--peel').trim()
  }));
  report.check('peel: Home sets 0', p0.v === '0' && parseFloat(p0.peel) === 0, JSON.stringify(p0));
  await peel.press('End');
  const p100 = await page.evaluate(() => ({
    v: document.getElementById('mfx-peel').value,
    peel: getComputedStyle(document.querySelector('#study-peel .study-peel')).getPropertyValue('--peel').trim(),
    posterVisible: document.querySelector('.peel-poster-title').getBoundingClientRect().height > 40
  }));
  report.check('peel: End sets 100 + poster shown', p100.v === '100' && parseFloat(p100.peel) === 1 && p100.posterVisible, JSON.stringify(p100));
  await page.click('#mfx-peel-replay');
  await page.waitForTimeout(300);
  const midPeel = await page.evaluate(() => Number(document.getElementById('mfx-peel').value));
  // Manual scrub mid-replay wins: replay cancelled, chosen value holds.
  await peel.focus();
  await peel.press('Home');
  await page.waitForTimeout(400);
  const heldPeel = await page.evaluate(() => Number(document.getElementById('mfx-peel').value));
  report.check('peel: scrub mid-replay cancels it', midPeel > 0 && midPeel < 100 && heldPeel === 0, `${midPeel} → ${heldPeel}`);
  await page.click('#mfx-peel-replay');
  await page.waitForTimeout(1200);
  const endPeel = await page.evaluate(() => Number(document.getElementById('mfx-peel').value));
  report.check('peel: replay ends at 100', endPeel === 100, `${endPeel}`);

  /* --- 02 stamp --------------------------------------------------------- */
  await page.locator('#study-stamp').scrollIntoViewIfNeeded();
  const serial = () => page.evaluate(() => document.getElementById('mfx-serial').textContent);
  const stamped = () => page.evaluate(() => getComputedStyle(document.getElementById('mfx-seal')).opacity === '1');
  report.check('stamp: replay disabled before first confirm',
    await page.evaluate(() => document.getElementById('mfx-stamp-replay').disabled));
  await page.click('#mfx-stamp');
  await page.waitForTimeout(900);
  report.check('stamp: first confirm → NO. 0001', (await serial()) === 'NO. 0001', await serial());
  await page.click('#mfx-stamp');
  await page.waitForTimeout(900);
  report.check('stamp: second confirm → NO. 0002', (await serial()) === 'NO. 0002', await serial());
  // three rapid clicks during flight increment at most once
  await page.evaluate(() => {
    const b = document.getElementById('mfx-stamp');
    b.click(); b.click(); b.click();
  });
  await page.waitForTimeout(900);
  report.check('stamp: rapid clicks count once', (await serial()) === 'NO. 0003', await serial());
  report.check('stamp: seal lands + label updates',
    (await stamped()) && await page.evaluate(() => document.getElementById('mfx-stamp').textContent.trim()) === '再收一季');
  // confirm mid-flight while a replay is running is ignored
  await page.click('#mfx-stamp-replay');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('mfx-stamp').click());
  await page.waitForTimeout(900);
  report.check('stamp: confirm during replay ignored', (await serial()) === 'NO. 0003' && (await stamped()), await serial());
  // replay attempt mid-confirmation is ignored
  await page.evaluate(() => document.getElementById('mfx-stamp').click());
  await page.waitForTimeout(200);
  const replayDuringConfirm = await page.evaluate(() => {
    const r = document.getElementById('mfx-stamp-replay');
    const wasDisabled = r.disabled;
    r.click();
    return wasDisabled;
  });
  await page.waitForTimeout(900);
  report.check('stamp: replay during confirm blocked',
    replayDuringConfirm && (await serial()) === 'NO. 0004', await serial());
  // animation objects stay bounded across repeated runs
  for (let i = 0; i < 9; i++) {
    await page.click('#mfx-stamp');
    await page.waitForTimeout(750);
  }
  const liveAnims = await page.evaluate(() =>
    document.getElementById('mfx-ticket').getAnimations({ subtree: true }).length);
  report.check('stamp: no animation accumulation after 10 confirms', liveAnims === 0, `${liveAnims} live`);

  /* --- 03 type ---------------------------------------------------------- */
  await page.locator('#study-type').scrollIntoViewIfNeeded();
  const g0 = () => page.evaluate(() => ({
    t: getComputedStyle(document.querySelector('#mfx-type span')).transform,
    n: document.querySelector('#mfx-type span').getAnimations().length
  }));
  await page.click('#mfx-type-gust');
  await page.waitForTimeout(400);
  const gMid = await g0();
  await page.waitForTimeout(1400);
  const gEnd = await g0();
  report.check('type: gust lifts then returns', gMid.n > 0 && gMid.t !== 'none' && (gEnd.t === 'none' || gEnd.t === 'matrix(1, 0, 0, 1, 0, 0)'), `${gMid.t} → ${gEnd.t}`);

  /* --- reduced motion ---------------------------------------------------- */
  const rc = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage();
  await rp.goto(`${base}foundations/motion.html`);
  await rp.waitForTimeout(600);
  const rState = await rp.evaluate(() => ({
    kids: document.querySelectorAll('#mfx-cob i').length,
    first: document.querySelector('#mfx-cob i').style.transform,
    peel: getComputedStyle(document.querySelector('#study-peel .study-peel')).getPropertyValue('--peel').trim(),
    peelVal: document.getElementById('mfx-peel').value,
    running: document.getElementById('mfx-field').dataset.running
  }));
  report.check('reduce: field pre-assembled', rState.kids >= 60 && rState.first.includes('translate'), JSON.stringify(rState));
  report.check('reduce: peel starts at 100', parseFloat(rState.peel) === 1 && rState.peelVal === '100', JSON.stringify(rState));
  report.check('reduce: no field RAF', rState.running !== 'true', `running=${rState.running}`);
  await rp.click('[data-field-mode="stack"]');
  await rp.waitForTimeout(150);
  const rStack = await rp.evaluate(() => document.querySelector('#mfx-cob i').style.transform);
  report.check('reduce: mode switch is immediate', rStack !== rState.first, `${rStack}`);
  const anims = await rp.evaluate(() => {
    let n = 0;
    document.querySelectorAll('#mfx-cob, #study-peel, #study-stamp, #study-type').forEach((el) => {
      n += el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length;
    });
    return n;
  });
  report.check('reduce: no running anims in new stages', anims === 0, `${anims} running`);
  await rp.click('#mfx-stamp');
  await rp.waitForTimeout(100);
  const rStamp = await rp.evaluate(() => ({
    serial: document.getElementById('mfx-serial').textContent,
    stamped: getComputedStyle(document.getElementById('mfx-seal')).opacity === '1'
  }));
  report.check('reduce: stamp applies immediately', rStamp.serial === 'NO. 0001' && rStamp.stamped, JSON.stringify(rStamp));
  await rc.close();

  /* --- toggling reduce AFTER load stops live motion --------------------- */
  await page.locator('#mfx-field').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const preGust = await firstTransform();
  await page.evaluate(() => document.getElementById('mfx-field').__motionField.gust());
  await page.waitForTimeout(250);
  const midGust = await firstTransform();
  report.check('late reduce: gust actually in flight', midGust !== preGust, `${midGust} vs ${preGust}`);
  await page.evaluate(() => document.documentElement.setAttribute('data-corn-motion', 'reduce'));
  await page.waitForTimeout(300);
  const snapped1 = await firstTransform();
  await page.waitForTimeout(300);
  const snapped2 = await firstTransform();
  report.check('late reduce: field stops + stays put', snapped1 === snapped2, `${snapped1} vs ${snapped2}`);
  // peel replay mid-flight (motion back on), then reduce snaps it open
  await page.evaluate(() => document.documentElement.removeAttribute('data-corn-motion'));
  await page.locator('#study-peel').scrollIntoViewIfNeeded();
  await page.click('#mfx-peel-replay');
  await page.waitForTimeout(300);
  const flyingPeel = await page.evaluate(() => Number(document.getElementById('mfx-peel').value));
  await page.evaluate(() => document.documentElement.setAttribute('data-corn-motion', 'reduce'));
  await page.waitForTimeout(200);
  const latePeel = await page.evaluate(() => Number(document.getElementById('mfx-peel').value));
  report.check('late reduce: mid-replay peel snaps to 100', flyingPeel > 0 && flyingPeel < 100 && latePeel === 100, `${flyingPeel} → ${latePeel}`);
  const lateAnims = await page.evaluate(() => {
    let n = 0;
    document.querySelectorAll('#mfx-cob, #study-peel, #study-stamp, #study-type').forEach((el) => {
      n += el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length;
    });
    return n;
  });
  report.check('late reduce: nothing still running on new stages', lateAnims === 0, `${lateAnims} running`);
  // toggling back out of reduce re-enables stamp replay, count untouched
  await page.evaluate(() => document.documentElement.removeAttribute('data-corn-motion'));
  await page.waitForTimeout(150);
  const reEnabled = await page.evaluate(() => !document.getElementById('mfx-stamp-replay').disabled);
  const serialBefore = await page.evaluate(() => document.getElementById('mfx-serial').textContent);
  report.check('reduce→normal: replay re-enabled', reEnabled);
  await page.click('#mfx-stamp-replay');
  await page.waitForTimeout(900);
  const afterReplay = await page.evaluate(() => ({
    serial: document.getElementById('mfx-serial').textContent,
    stamped: getComputedStyle(document.getElementById('mfx-seal')).opacity === '1'
  }));
  report.check('reduce→normal: replay runs, count unchanged',
    afterReplay.serial === serialBefore && afterReplay.stamped, JSON.stringify(afterReplay));

  /* --- copied code tabs run standalone ---------------------------------- */
  await labSnippets({ browser, base, report });

  /* --- narrow viewports -------------------------------------------------- */
  for (const w of [390, 320]) {
    const nc = await browser.newContext({ viewport: { width: w, height: 844 } });
    const np = await nc.newPage();
    await np.goto(`${base}foundations/motion.html`);
    await np.waitForTimeout(600);
    const sw = await np.evaluate(() => document.documentElement.scrollWidth);
    report.check(`motion @${w}: no overflow`, sw <= w, `${sw}px`);
    await nc.close();
  }
  await ctx.close();
}
