/* Clipboard helper shared by the code popover and swatches.
   Resolves true on success; never throws. Falls back to execCommand for
   non-secure contexts (e.g. opening the site over a LAN IP). */
(function (global) {
  'use strict';
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function copy(text) {
    if (global.navigator.clipboard && global.isSecureContext) {
      return global.navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }
  global.CornDemo = global.CornDemo || {};
  global.CornDemo.copy = copy;
})(window);
