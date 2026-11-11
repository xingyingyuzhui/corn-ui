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

  Corn.emit = function (el, name, detail) {
    el.dispatchEvent(new CustomEvent('corn:' + name, { bubbles: true, detail: detail }));
  };

  var seq = 0;
  Corn.uid = function (prefix) { return (prefix || 'corn') + '-' + ++seq; };

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
