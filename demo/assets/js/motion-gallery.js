/* Motion page: flip/reveal/leave handlers for the basic gallery, plus
   autoplay + hover replay. The hero field and study cards have their own
   scripts (motion-field.js / motion-studies.js); [data-manual-motion] cards
   are excluded here. Reduced-motion is checked live, not cached. */
(function () {
  // Runs before corn.js (this tag precedes it in the page), so wait for
  // DOMContentLoaded — all deferred scripts are done by then.
  function ready(fn) { document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var calm = function () { return Corn.reducedMotion(); };

    // Corn.flip: rotate the first tag to the end
    var list = document.getElementById('mfx-flip-list');
    var flipBtn = document.getElementById('mfx-flip-btn');
    if (list && flipBtn) {
      flipBtn.addEventListener('click', function () {
        Corn.flip(list, function () { list.appendChild(list.children[0]); });
      });
    }
    // data-corn-reveal: replay by re-arming is-in
    var revealBtn = document.getElementById('e-reveal-btn');
    if (revealBtn) {
      revealBtn.addEventListener('click', function () {
        document.querySelectorAll('#motion-reveal [data-corn-reveal]').forEach(function (el) {
          el.classList.remove('is-in');
          void el.offsetWidth;
          el.classList.add('is-in');
        });
      });
    }
    // corn-leave: restore the tag after its exit animation so it can replay
    var leaveTag = document.getElementById('e-leave-tag');
    if (leaveTag) {
      leaveTag.addEventListener('animationend', function (e) {
        if (e.animationName === 'corn-pop-out') e.target.classList.remove('corn-leave');
      });
    }

    // Autoplay: first time a card is ~60% in view, fire its replay once.
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
      if (calm()) return;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var btn = en.target.querySelector('.mfx-replay');
        io.unobserve(en.target);
        if (btn) btn.click();
      });
    }, { threshold: 0.6 });
    if (io) {
      document.querySelectorAll('.mfx:not([data-manual-motion])').forEach(function (card) {
        io.observe(card);
      });
    }

    // Hover replay on the stage, but never re-trigger mid-animation.
    function running(card) {
      return card.getAnimations({ subtree: true }).some(function (a) {
        return a.playState === 'running' && a.effect.getComputedTiming().iterations !== Infinity;
      });
    }
    document.querySelectorAll('.mfx:not([data-manual-motion]) .mfx-stage').forEach(function (stage) {
      stage.addEventListener('pointerenter', function () {
        if (calm()) return;
        var card = stage.closest('.mfx');
        var btn = card && card.querySelector('.mfx-replay');
        if (btn && !running(card)) btn.click();
      });
    });
  });
})();
