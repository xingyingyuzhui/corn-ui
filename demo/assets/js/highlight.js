/* Minimal highlighter for html / css / js. Builds DOM nodes with
   textContent only, so code is never parsed as HTML (no injection). */
(function (global) {
  'use strict';
  var RULES = {
    html: [
      ['c', /<!--[\s\S]*?-->/y],
      ['t', /<\/?[a-zA-Z][\w-]*|\/?>/y],
      ['s', /"[^"]*"|'[^']*'/y],
      ['a', /[a-zA-Z_:][\w:.-]*(?==)/y]
    ],
    css: [
      ['c', /\/\*[\s\S]*?\*\//y],
      ['s', /"[^"]*"|'[^']*'/y],
      ['k', /@[\w-]+/y],
      ['a', /--[\w-]+|[a-z-]+(?=\s*:[^:])/y],
      ['t', /[.#][\w-]+/y]
    ],
    js: [
      ['c', /\/\*[\s\S]*?\*\/|\/\/[^\n]*/y],
      ['s', /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y],
      ['k', /\b(?:var|let|const|function|return|if|else|for|while|new|typeof|true|false|null|this)\b/y],
      ['a', /\b[A-Za-z_$][\w$]*(?=\s*\()/y]
    ]
  };

  function highlight(target, text, lang) {
    var rules = RULES[lang] || [];
    var frag = document.createDocumentFragment();
    var plain = '';
    var i = 0;
    function flush() {
      if (plain) { frag.appendChild(document.createTextNode(plain)); plain = ''; }
    }
    while (i < text.length) {
      var hit = null;
      for (var r = 0; r < rules.length && !hit; r++) {
        rules[r][1].lastIndex = i;
        var m = rules[r][1].exec(text);
        if (m && m[0]) hit = [rules[r][0], m[0]];
      }
      if (!hit) { plain += text[i++]; continue; }
      flush();
      var span = document.createElement('span');
      span.className = 'tk-' + hit[0];
      span.textContent = hit[1];
      frag.appendChild(span);
      i += hit[1].length;
    }
    flush();
    target.replaceChildren(frag);
  }

  global.CornDemo = global.CornDemo || {};
  global.CornDemo.highlight = highlight;
})(window);
