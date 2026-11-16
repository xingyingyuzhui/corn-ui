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
  const swap = await p2.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    flag: document.documentElement.hasAttribute('data-corn-theming')
  }));
  report.check('toggle: dark theme applied instantly under reduce', swap.bg === 'rgb(27, 30, 26)', swap.bg);
  report.check('theme swap: no theming flag under reduce', !swap.flag);
  await full.close();

  // Full-motion theme swap: data-corn-theming flags one uniform colour fade
  const tc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tp = await tc.newPage();
  await tp.goto(`${base}components/button.html`);
  await tp.click('[data-site-toggle="theme"]');
  const mid = await tp.evaluate(() => ({
    flag: document.documentElement.hasAttribute('data-corn-theming'),
    theme: document.documentElement.getAttribute('data-corn-theme')
  }));
  report.check('theme swap: flag up + attr switched', mid.flag && mid.theme === 'dark', JSON.stringify(mid));
  await tp.waitForTimeout(800);
  const after = await tp.evaluate(() => ({
    flag: document.documentElement.hasAttribute('data-corn-theming'),
    bg: getComputedStyle(document.body).backgroundColor
  }));
  report.check('theme swap: fades to dark bg', after.bg === 'rgb(27, 30, 26)', after.bg);
  report.check('theme swap: flag cleared after fade', !after.flag);
  await tc.close();

  // Feedback utilities: shake replays when aria-invalid flips on
  const fc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const fp = await fc.newPage();
  await fp.goto(`${base}components/form.html`);
  const shake = await fp.evaluate(() => new Promise((res) => {
    const el = document.getElementById('fm-slug');
    el.setAttribute('aria-invalid', 'false');
    void el.offsetWidth;
    el.addEventListener('animationstart', (e) => res(e.animationName), { once: true });
    el.setAttribute('aria-invalid', 'true');
    setTimeout(() => res('(no animation)'), 600);
  }));
  report.check('shake: replays when aria-invalid flips on', shake === 'corn-shake', shake);
  // Native path: :user-invalid matches only after real interaction (fill + blur)
  await fp.fill('#fm-slug', 'bad slug!');
  await fp.locator('#fm-slug').press('Tab');
  const ui = await fp.evaluate(() => {
    const el = document.getElementById('fm-slug');
    return { matches: el.matches(':user-invalid'), anim: getComputedStyle(el).animationName };
  });
  report.check('shake: fires on :user-invalid', ui.matches && ui.anim === 'corn-shake', JSON.stringify(ui));
  // :user-valid positive feedback once corrected
  await fp.fill('#fm-slug', 'ok-path');
  await fp.locator('#fm-slug').press('Tab');
  const uv = await fp.evaluate(() => {
    const el = document.getElementById('fm-slug');
    return { matches: el.matches(':user-valid'), border: getComputedStyle(el).borderColor };
  });
  report.check('user-valid: brand border on corrected field', uv.matches, JSON.stringify(uv));
  await fp.goto(`${base}foundations/motion.html`);
  const names = await fp.evaluate(() => {
    const probe = (cls) => {
      const d = document.createElement('div');
      d.className = cls;
      document.body.append(d);
      const n = getComputedStyle(d).animationName;
      d.remove();
      return n;
    };
    return {
      flash: probe('corn-flash'),
      repop: probe('corn-repop'),
      down: probe('corn-enter corn-enter-down'),
      burst: probe('corn-burst'),
      draw: probe('corn-draw'),
      leave: probe('corn-leave'),
      pop: probe('corn-pop'),
      unveil: probe('corn-unveil'),
      mark: probe('corn-mark'),
      wave: probe('corn-wave'),
    };
  });
  report.check('utility: corn-pop registered', names.pop === 'corn-pop', names.pop);
  report.check('utility: corn-unveil registered', names.unveil === 'corn-unveil', names.unveil);
  report.check('utility: corn-mark registered', names.mark === 'corn-mark', names.mark);
  report.check('utility: corn-wave registered', names.wave === 'corn-wave', names.wave);
  const cob = await fp.evaluate(() => document.querySelectorAll('#mfx-cob > *').length);
  report.check('hero: cob populated', cob >= 60, `${cob} kernels`);
  report.check('utility: corn-flash registered', names.flash === 'corn-flash', names.flash);
  report.check('utility: corn-repop registered', names.repop === 'corn-pop-in', names.repop);
  report.check('utility: corn-enter-down registered', names.down === 'corn-fade-down', names.down);
  report.check('utility: corn-burst registered', names.burst === 'corn-burst', names.burst);
  report.check('utility: corn-draw registered', names.draw === 'corn-draw', names.draw);
  report.check('utility: corn-leave registered', names.leave === 'corn-pop-out', names.leave);
  const spring = await fp.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'corn-enter corn-enter-spring';
    document.body.append(d);
    const tf = getComputedStyle(d).animationTimingFunction;
    d.remove();
    return { tf, token: getComputedStyle(document.documentElement).getPropertyValue('--corn-ease-spring').trim() };
  });
  report.check('spring: token + modifier wired', spring.tf === spring.token && spring.tf.includes('0.34'), JSON.stringify(spring));
  const replayed = await fp.evaluate(() => {
    const el = document.getElementById('mfx-row');
    window.Corn.replay(el, 'corn-flash');
    return el.classList.contains('corn-flash') && getComputedStyle(el).animationName === 'corn-flash';
  });
  report.check('replay: one-shot retriggered', replayed);
  // Declarative hooks: data-corn-replay button replays on its target
  await fp.click('[data-corn-replay="corn-shake"]');
  const viaHook = await fp.evaluate(() => getComputedStyle(document.getElementById('mfx-input')).animationName);
  report.check('replay: data-corn-replay hook works', viaHook === 'corn-shake', viaHook);
  // data-corn-set-theme goes through the same crossfade path
  await fp.click('[data-corn-set-theme="dark"]');
  const hooked = await fp.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-corn-theme'),
    flag: document.documentElement.hasAttribute('data-corn-theming')
  }));
  report.check('set-theme hook: attr + crossfade flag', hooked.theme === 'dark' && hooked.flag, JSON.stringify(hooked));
  // Corn.flip: reorder slides survivors via WAAPI, new order applies
  const flipped = await fp.evaluate(() => {
    const list = document.getElementById('mfx-flip-list');
    Corn.flip(list, () => list.appendChild(list.children[0]));
    return {
      first: list.firstElementChild.textContent.trim(),
      anims: document.getAnimations().length
    };
  });
  report.check('flip: reorder applied', flipped.first === '二', flipped.first);
  report.check('flip: slides via WAAPI', flipped.anims > 0, `${flipped.anims} animations`);
  // data-corn-reveal: hook hides then .is-in lands on scroll into view
  const reveal = await fp.evaluate(() => {
    const el = document.querySelector('#motion-reveal [data-corn-reveal]');
    return { hidden: el.classList.contains('corn-reveal'), inned: el.classList.contains('is-in') };
  });
  report.check('reveal: hook hid element', reveal.hidden, JSON.stringify(reveal));
  await fp.evaluate(() => document.querySelector('#motion-reveal [data-corn-reveal]').scrollIntoView());
  await fp.waitForTimeout(150);
  const revealed = await fp.evaluate(() => document.querySelector('#motion-reveal [data-corn-reveal]').classList.contains('is-in'));
  report.check('reveal: is-in on entering view', revealed);
  await fc.close();
}
