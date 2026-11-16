/* Homepage brand theater — page wiring. The transparent mascot PNG is the
   no-JS fallback; once the kernel stage is ready the canvas takes over
   (visually, not for AT). All motion — intro, ambient, pointer brushing — is
   governed by the existing nav 减少动效 toggle via Corn.reducedMotion(); the
   homepage adds no pause control of its own. */
import { sampleIcon } from './home-shapes.js';
import { createStage } from './home-motion.js';

document.addEventListener('DOMContentLoaded', function () {
  var stage = document.getElementById('home-theater');
  var canvas = document.getElementById('home-canvas');
  var img = document.getElementById('home-logo');
  var shapeBtns = Array.prototype.slice.call(document.querySelectorAll('[data-home-shape]'));
  if (!stage || !canvas || !img || !window.Corn) return;

  function reduced() { return Corn.reducedMotion(); }

  function fail() { // keep the real icon; controls stay inert without the stage
    shapeBtns.forEach(function (b) { b.disabled = true; });
    canvas.classList.remove('is-live');
  }

  function start(src) {
    var fontStack = getComputedStyle(document.documentElement).getPropertyValue('--corn-sans');
    var art = createStage(canvas, src, fontStack);
    if (!art) { fail(); return; }
    stage.__homeArt = art;

    function sync() {
      shapeBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-home-shape') === art.shape));
      });
    }
    art.onChange(sync);

    img.addEventListener('error', fail, { once: true });
    art.measure();
    canvas.classList.add('is-live'); // visual handoff; <img> keeps its alt for AT
    shapeBtns.forEach(function (b) { b.disabled = false; });

    shapeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        art.setShape(b.getAttribute('data-home-shape'));
      });
    });

    // pointer brushing — hover devices only; touches just scroll past
    var rect = null;
    function updatePointer(e) {
      if (e.pointerType === 'touch') return;
      if (!rect) rect = stage.getBoundingClientRect();
      art.setPointer(e.clientX - rect.left, e.clientY - rect.top,
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        ((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    stage.addEventListener('pointerenter', function (e) {
      rect = stage.getBoundingClientRect();
      updatePointer(e);
    });
    stage.addEventListener('pointermove', updatePointer);
    stage.addEventListener('pointerleave', function () { art.setPointer(null); });
    stage.addEventListener('pointercancel', function () { art.setPointer(null); });
    window.addEventListener('scroll', function () { rect = null; }, { passive: true });
    window.addEventListener('resize', function () { rect = null; });

    var lastPref = reduced();
    function onPref() {
      var now = reduced();
      if (now === lastPref) return; // attribute noise, not a real pref change
      lastPref = now;
      art.setMotion(!now);
    }
    new MutationObserver(onPref).observe(document.documentElement, { attributes: true, attributeFilter: ['data-corn-motion'] });
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', onPref);

    var inView = true; // IO + scroll + visibility all feed one gate on the renderer
    function updateActive() { art.setActive(inView && !document.hidden); }
    function checkView() { // cheap geometric fallback; IO can lag on fast scrolls
      var r = stage.getBoundingClientRect();
      inView = r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
      updateActive();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        updateActive();
      }).observe(stage);
    }
    window.addEventListener('scroll', checkView, { passive: true });
    document.addEventListener('visibilitychange', updateActive);
    updateActive();

    if ('ResizeObserver' in window) new ResizeObserver(function () { art.measure(); }).observe(stage);
    window.addEventListener('resize', function () { art.measure(); });

    art.setMotion(!reduced()); // reduced: static logo pose, no RAF
    if (!reduced()) art.startIntro();
    sync();
  }

  function boot() { // any sampling/stage failure leaves the real icon + dead controls
    try {
      var src = sampleIcon(img);
      if (!src) { fail(); return; }
      start(src);
    } catch (e) {
      fail();
    }
  }

  if (img.complete && img.naturalWidth) boot();
  else {
    img.addEventListener('load', boot, { once: true });
    img.addEventListener('error', fail, { once: true });
  }
});
