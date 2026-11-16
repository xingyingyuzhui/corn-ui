/* Corn core: a tiny hook registry plus helpers shared by component scripts.
   Components call Corn.define(name, selector, setup); setup runs once per
   matching element now and on every later Corn.init(root). */
(function (global) {
  'use strict';
  var Corn = (global.Corn = global.Corn || {});
  var hooks = [];
  var booted = false;

  Corn.version = '0.1.0';

  function run(hook, root) {
    var nodes = root.querySelectorAll(hook.selector);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.__corn = el.__corn || {};
      if (el.__corn[hook.name]) continue;
      el.__corn[hook.name] = true;
      try {
        hook.setup(el);
      } catch (err) {
        console.error('[corn] ' + hook.name + ' failed to initialise', el, err);
      }
    }
  }

  Corn.define = function (name, selector, setup) {
    var hook = { name: name, selector: selector, setup: setup };
    hooks.push(hook);
    if (booted) run(hook, document);
  };

  /** Initialise hooks inside `root` (call after inserting HTML dynamically). */
  Corn.init = function (root) {
    hooks.forEach(function (hook) { run(hook, root || document); });
  };

  Corn.reducedMotion = function () {
    var pref = document.documentElement.getAttribute('data-corn-motion');
    if (pref === 'reduce') return true;
    if (pref === 'full') return false;
    return global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /** Call `done` once el's CSS animation ends (or right away if none/reduced). */
  Corn.afterAnimation = function (el, done) {
    var name = global.getComputedStyle(el).animationName;
    if (Corn.reducedMotion() || !name || name === 'none') return done();
    var finished = false;
    var timer = setTimeout(finish, 700);
    function onEnd(e) { if (e.target === el) finish(); }
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      el.removeEventListener('animationend', onEnd);
      done();
    }
    el.addEventListener('animationend', onEnd);
  };

  /** Replay a one-shot animation class (.corn-shake / .corn-flash / .corn-repop,
      .corn-enter): remove → reflow → re-add, so the CSS animation restarts.
      The inline `animation:none` reset kills names that linger through a
      sibling class (e.g. a direction modifier) — otherwise the browser sees
      the same animation instance and never restarts it. */
  Corn.replay = function (el, cls) {
    if (!el) return;
    var prev = el.style.animation;
    el.classList.remove(cls);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = prev;
    el.classList.add(cls);
  };

  /** Swap <html data-corn-theme> behind a uniform colour crossfade: the
      data-corn-theming flag (see motion.css) stays up until the fade finishes.
      Reduced motion: plain attribute swap, no flag. */
  Corn.setTheme = function (theme) {
    var root = document.documentElement;
    if (Corn.reducedMotion()) {
      root.setAttribute('data-corn-theme', theme);
      return;
    }
    var raw = global.getComputedStyle(root).getPropertyValue('--corn-dur-slow').trim();
    var ms = parseFloat(raw) * (raw.slice(-2) === 'ms' ? 1 : 1000);
    root.setAttribute('data-corn-theming', '');
    root.setAttribute('data-corn-theme', theme);
    setTimeout(function () { root.removeAttribute('data-corn-theming'); },
      (isNaN(ms) ? 550 : ms) + 120);
  };

  /** Corn.flip(container, mutate): layout transition — snapshot positions,
      run the DOM change, then slide each surviving child from its old spot.
      New children fade in; removed children are gone (mutate handles exits).
      Reduced motion: mutate only. */
  Corn.flip = function (container, mutate) {
    if (Corn.reducedMotion()) { mutate(); return; }
    var els = container.children;
    for (var i = 0; i < els.length; i++) {
      els[i].__cornFlipFrom = els[i].getBoundingClientRect();
    }
    mutate();
    var cs = global.getComputedStyle(container);
    var raw = cs.getPropertyValue('--corn-dur-slow').trim();
    var ms = parseFloat(raw) * (raw.slice(-2) === 'ms' ? 1 : 1000);
    if (isNaN(ms)) ms = 550;
    var ease = cs.getPropertyValue('--corn-ease-out').trim() || 'ease-out';
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var before = el.__cornFlipFrom;
      delete el.__cornFlipFrom;
      var now = el.getBoundingClientRect();
      if (!before) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: ease });
        continue;
      }
      var dx = before.left - now.left, dy = before.top - now.top;
      if (!dx && !dy) continue;
      el.animate(
        [{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'translate(0, 0)' }],
        { duration: ms, easing: ease }
      );
    }
  };

  Corn.emit = function (el, name, detail) {
    el.dispatchEvent(new CustomEvent('corn:' + name, { bubbles: true, detail: detail }));
  };

  var seq = 0;
  Corn.uid = function (prefix) { return (prefix || 'corn') + '-' + ++seq; };

  /** Generic replay: <button data-corn-replay="corn-flash" data-corn-target="#row">
      replays a one-shot animation class on every element the target selector
      matches (or on the button itself when no target is given). */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-corn-replay]');
    if (!btn) return;
    var sel = btn.getAttribute('data-corn-target');
    var els = sel ? document.querySelectorAll(sel) : [btn];
    for (var i = 0; i < els.length; i++) Corn.replay(els[i], btn.getAttribute('data-corn-replay'));
  });

  /** <button data-corn-set-theme="dark"> swaps the page theme with the crossfade. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-corn-set-theme]');
    if (btn) Corn.setTheme(btn.getAttribute('data-corn-set-theme'));
  });

  /** Scroll-in entrances: [data-corn-reveal] hides via .corn-reveal (added by
      the hook, so no-JS pages stay visible), then .is-in lands when it enters
      view. Siblings crossing together stagger via --reveal-i. */
  var revealIO = null;
  function revealObserver() {
    if (revealIO || !('IntersectionObserver' in global)) return revealIO;
    revealIO = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--reveal-i', String(Math.min(n++, 4)));
        en.target.classList.add('is-in');
        revealIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    return revealIO;
  }
  Corn.define('reveal', '[data-corn-reveal]', function (el) {
    var ob = revealObserver();
    if (!ob || Corn.reducedMotion()) return;
    el.classList.add('corn-reveal');
    ob.observe(el);
  });

  /** Generic dismiss: <button data-corn-dismiss> removes its closest [data-corn-dismissible]. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-corn-dismiss]');
    if (!btn) return;
    var box = btn.closest('[data-corn-dismissible]');
    if (!box) return;
    box.setAttribute('data-leaving', '');
    Corn.afterAnimation(box, function () {
      Corn.emit(box, 'dismiss');
      box.remove();
    });
  });

  function boot() {
    booted = true;
    Corn.init(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
