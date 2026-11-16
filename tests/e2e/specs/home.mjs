// Homepage brand theater: kernel logo ⇄ CORN morphs, ambient motion,
// pointer brushing, nav 减少动效 gate, offscreen suspend, no-JS fallback.
export default async function home({ browser, base, report }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + 'index.html');

  const state = () => page.evaluate(() => {
    const a = document.getElementById('home-theater').__homeArt;
    return a ? { shape: a.shape, anim: a.animating, seq: a.sequencing, frames: a.frameCount,
      n: a.particleCount, motion: a.motionEnabled, pos: a.sample(6).join(','),
      depth: a.depthSample(600) } : null;
  });
  const posAt = (i) => page.evaluate((j) => {
    const a = document.getElementById('home-theater').__homeArt;
    const s = a.sample(j + 1);
    return s[j * 2] + ',' + s[j * 2 + 1];
  }, i);

  /* --- DOM / assets -------------------------------------------------------- */
  const basics = await page.evaluate(() => {
    const img = document.getElementById('home-logo');
    const a = document.getElementById('home-theater').__homeArt;
    const h1 = document.querySelector('.hero-copy h1');
    return {
      imgOk: img.complete && img.naturalWidth > 0 && img.src.includes('corn-mascot.png'),
      h1: document.querySelectorAll('h1').length,
      h1sr: !!h1 && h1.getAttribute('aria-label') === h1.textContent &&
        !!document.querySelector('.hero-copy.corn-sr-only'),
      dots: document.querySelectorAll('[data-home-shape]').length,
      noExtra: !document.querySelector('#home-play, [data-home-shape="scatter"], ' +
        '.home-cover :is(.home-masthead, .home-tagline, .corn-dark), .hero-card, .home-press'),
      ctas: document.querySelectorAll('.home-cover a.corn-btn').length,
      cta: document.querySelector('.home-cta').getAttribute('href'),
      ready: a && a.ready, n: a && a.particleCount
    };
  });
  report.check('home: two dots, no play control, single CTA',
    basics.dots === 2 && basics.noExtra && basics.ctas === 1 && basics.cta === 'components/index.html',
    JSON.stringify(basics));
  report.check('home: sr-only h1 + mascot asset', basics.h1 === 1 && basics.h1sr && basics.imgOk);
  report.check('stage: canvas ready, kernels sampled', basics.ready && basics.n > 200, `${basics.n}`);

  /* --- rounded kernel sprites, not hard square pixels ----------------------- */
  const sprite = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('2d');
    // re-derive one sprite cell from the atlas seam: sample corner vs centre alpha
    const a = document.getElementById('home-theater').__homeArt;
    return a && a.spriteProbe ? a.spriteProbe() : null;
  });
  report.check('kernels: sprite corner transparent, centre opaque',
    !!sprite && sprite.corner < 30 && sprite.center > 200, JSON.stringify(sprite));

  /* --- intro plays, then ambient never stops -------------------------------- */
  const s0 = await state();
  await page.waitForTimeout(10500); // intro ~9.2s + start offset lands on logo
  const s1 = await state();
  report.check('intro: positions moved + landed on logo',
    s0.pos !== s1.pos && s1.shape === 'logo' && !s1.seq && !s1.anim);
  const amb1 = await state();
  await page.waitForTimeout(800);
  const amb2 = await state();
  report.check('ambient: idle keeps moving without pointer',
    amb2.frames > amb1.frames && amb2.pos !== amb1.pos, `${amb1.frames}→${amb2.frames}`);

  /* --- real perspective ------------------------------------------------------ */
  const dep = s1.depth;
  const zSpread = Math.max(...dep.z) - Math.min(...dep.z);
  const sSpread = Math.max(...dep.s) - Math.min(...dep.s);
  report.check('depth: z spread + projected scale variation',
    zSpread > 10 && sSpread > 0.02, `z=${zSpread.toFixed(1)} s=${sSpread.toFixed(3)}`);

  /* --- manual dots: direct logo⇄word morphs ----------------------------------- */
  const w0 = await state();
  await page.click('[data-home-shape="word"]'); await page.waitForTimeout(1900);
  const w1 = await state();
  report.check('dots: word morph moves + settles', w1.pos !== w0.pos && w1.shape === 'word' && !w1.anim);
  const pressed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-home-shape]')].map((b) => b.getAttribute('aria-pressed')));
  report.check('dots: aria-pressed exclusive', pressed.join() === 'false,true', pressed.join());
  for (const m of ['logo', 'word', 'logo']) {
    await page.click(`[data-home-shape="${m}"]`); await page.waitForTimeout(120);
  }
  report.check('dots: rapid picks no errors', errors.length === 0, errors.join('|'));
  report.check('dots: same particle set', (await state()).n === basics.n);
  await page.waitForTimeout(1800); // settle logo

  /* --- pointer brushing ------------------------------------------------------- */
  const rect = await page.evaluate(() => {
    const r = document.getElementById('home-theater').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  // aim the cursor at a real grain — centre of the assembled logo
  const grain = await page.evaluate(() => {
    const a = document.getElementById('home-theater').__homeArt;
    const s = a.sample(200);
    let bx = 0, by = 0;
    for (let i = 0; i < 200; i++) { bx += s[i * 2]; by += s[i * 2 + 1]; }
    return { x: bx / 200, y: by / 200, idx: 0 };
  });
  const cam0 = (await page.evaluate(() =>
    document.getElementById('home-theater').__homeArt.camera)).y;
  await page.mouse.move(rect.x + grain.x, rect.y + grain.y, { steps: 6 });
  await page.waitForTimeout(450);
  const off1 = await page.evaluate(() =>
    document.getElementById('home-theater').__homeArt.offsets(200));
  const cam1 = (await page.evaluate(() =>
    document.getElementById('home-theater').__homeArt.camera)).y;
  const offMag = Math.max(...off1.map((v) => Math.abs(v)));
  report.check('pointer: nearby grains pushed + camera tilts',
    offMag > 0.5 && Math.abs(cam1 - cam0) > 0.005, `off=${offMag.toFixed(2)} cam=${(cam1 - cam0).toFixed(3)}`);
  await page.mouse.move(rect.x + rect.w - 4, rect.y + 6, { steps: 4 }); // drift out, stay hovering
  await page.mouse.move(rect.x + rect.w + 60, rect.y + 6, { steps: 4 }); // leave the stage
  await page.waitForTimeout(1200);
  const off2 = await page.evaluate(() =>
    document.getElementById('home-theater').__homeArt.offsets(200));
  const offMag2 = Math.max(...off2.map((v) => Math.abs(v)));
  const amb3 = await state();
  report.check('pointer: leave calms offsets, ambient persists',
    offMag2 < offMag * 0.4 && amb3.frames > 0, `off ${offMag.toFixed(1)}→${offMag2.toFixed(2)}`);
  // held-stationary cursor: local field settles but idle still animates
  await page.mouse.move(rect.x + grain.x, rect.y + grain.y, { steps: 3 });
  await page.waitForTimeout(700);
  const still1 = (await state()).pos;
  await page.waitForTimeout(400);
  const still2 = (await state()).pos;
  report.check('pointer: stationary cursor still animates', still1 !== still2);

  /* --- nav 减少动效 button gates EVERYTHING ------------------------------------ */
  await page.click('[data-site-toggle="motion"]'); // real user click
  await page.waitForTimeout(400);
  const r1 = await state();
  await page.waitForTimeout(400);
  const r2 = await state();
  report.check('reduce: nav click freezes frames + positions',
    r1.motion === false && r1.frames === r2.frames && r1.pos === r2.pos,
    `frames ${r1.frames}→${r2.frames}`);
  await page.mouse.move(rect.x + grain.x, rect.y + grain.y); // brushing ignored
  await page.waitForTimeout(300);
  const off3 = await page.evaluate(() =>
    document.getElementById('home-theater').__homeArt.offsets(100));
  report.check('reduce: pointer offsets stay zero',
    Math.max(...off3.map((v) => Math.abs(v))) === 0);
  await page.click('[data-home-shape="word"]'); await page.waitForTimeout(200);
  const r3 = await state();
  report.check('reduce: dot switches instantly, no RAF',
    r3.shape === 'word' && r3.frames === r2.frames);
  await page.click('[data-site-toggle="motion"]'); // toggle back
  await page.waitForTimeout(600);
  const r4 = await state();
  report.check('reduce off: ambient resumes, no intro replay',
    r4.motion && r4.frames > r3.frames && !r4.seq, `frames ${r3.frames}→${r4.frames}`);

  /* --- offscreen suspend ------------------------------------------------------ */
  const o0 = await state();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  const o1 = await state();
  report.check('offscreen: RAF suspended', o1.frames - o0.frames <= 2, `${o0.frames}→${o1.frames}`);
  await page.evaluate(() => document.getElementById('home-theater').__homeArt.setActive(false));
  await page.evaluate(() => document.getElementById('home-theater').__homeArt.setActive(false));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  const o2 = await state();
  report.check('offscreen: idempotent, resumes ambient', o2.frames > o1.frames,
    `${o1.frames}→${o2.frames}`);

  /* --- resize while motion disabled repaints ----------------------------------- */
  await page.evaluate(() => document.documentElement.setAttribute('data-corn-motion', 'reduce'));
  await page.waitForTimeout(300);
  const m0 = await state();
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(400);
  const mpx = await page.evaluate(() => {
    const c = document.getElementById('home-canvas');
    const a = document.getElementById('home-theater').__homeArt;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 3; i < d.length; i += 400) if (d[i] > 0) lit++;
    return { lit, frames: a.frameCount };
  });
  report.check('reduce+resize: canvas repainted, clock frozen',
    mpx.lit > 50 && mpx.frames === m0.frames, `lit=${mpx.lit}`);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => document.documentElement.removeAttribute('data-corn-motion'));
  await page.waitForTimeout(300);
  await ctx.close();

  /* --- OS-level reduced context ------------------------------------------------ */
  const rc = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage();
  await rp.goto(base + 'index.html');
  await rp.waitForTimeout(600);
  const rr = await rp.evaluate(() => {
    const a = document.getElementById('home-theater').__homeArt;
    return { shape: a.shape, frames: a.frameCount, motion: a.motionEnabled };
  });
  await rp.waitForTimeout(400);
  const rr2 = await rp.evaluate(() => document.getElementById('home-theater').__homeArt.frameCount);
  report.check('reduce ctx: static logo, no RAF', rr.shape === 'logo' && !rr.motion && rr.frames === rr2);
  await rp.locator('[data-home-shape="word"]').focus();
  await rp.keyboard.press('Enter');
  await rp.waitForTimeout(200);
  const rr3 = await rp.evaluate(() => document.getElementById('home-theater').__homeArt.shape);
  report.check('reduce ctx: keyboard dot switch instant', rr3 === 'word', rr3);
  await rc.close();

  /* --- no-JS fallback -------------------------------------------------------- */
  const jc = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const jp = await jc.newPage();
  await jp.goto(base + 'index.html');
  const fb = await jp.evaluate(() => {
    const img = document.getElementById('home-logo');
    const r = img.getBoundingClientRect();
    return {
      visible: r.width > 200 && r.height > 200,
      art: !!document.getElementById('home-theater').__homeArt,
      disabled: [...document.querySelectorAll('[data-home-shape]')].every((b) => b.disabled)
    };
  });
  report.check('no-JS: transparent mascot + inert dots', fb.visible && !fb.art && fb.disabled, JSON.stringify(fb));
  await jc.close();

  /* --- widths ---------------------------------------------------------------- */
  for (const w of [1280, 768, 390, 320]) {
    const nc = await browser.newContext({ viewport: { width: w, height: 844 } });
    const np = await nc.newPage();
    await np.goto(base + 'index.html');
    await np.waitForTimeout(800);
    const sw = await np.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cta: document.querySelector('.home-cta').getBoundingClientRect().width > 0
    }));
    report.check(`home @${w}: no overflow + CTA visible`, sw.sw <= w && sw.cta, `${sw.sw}px`);
    await nc.close();
  }
  report.check('home: no page errors', errors.length === 0, errors.join('|'));
}
