"""Render a live example + the hidden, escaped copy of the same source.

Same-source guarantee: the example file text is inserted once raw (live) and
once html-escaped inside a <template>. The code popover reads the template's
textContent, so what you copy is byte-for-byte the file that is running.
"""
from html import escape

CODE_ICON = ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">'
             '<path d="M5 3.5 1.5 7 5 10.5M9 3.5 12.5 7 9 10.5" stroke="currentColor" '
             'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def template(tpl_id: str, text: str, lang: str) -> str:
    # '{{' would look like a template marker to later passes; an entity keeps
    # textContent identical while hiding it from the template engine.
    body = escape(text, quote=False).replace("{{", "&#123;&#123;")
    return f'<template id="{tpl_id}" data-lang="{lang}">{body}</template>'


def deps_text(needs_js: bool, usage: str = "") -> str:
    lines = ["<!-- 1. 样式：tokens 在前，组件层在后 -->",
             '<link rel="stylesheet" href="corn-tokens.css">',
             '<link rel="stylesheet" href="corn.css">']
    if needs_js:
        lines += ["", "<!-- 2. 交互：corn.js 自动初始化 data-corn-* 钩子，API 在 window.Corn -->",
                  '<script src="corn.js" defer></script>']
    if usage:
        safe = usage.replace("--", "—")
        lines += ["", f"<!-- 用法：{safe} -->"]
    lines += ["", "<!-- 主题：任意容器加 .corn-dark（或 <html data-corn-theme=\"dark\">）即切深色 -->"]
    return "\n".join(lines) + "\n"


def specimen(ex, sid: str, label: str, css_tpl: str = "", js_tpl: str = "",
             deps_tpl: str = "", index: int = 0) -> str:
    attrs = [f'data-code-title="{escape(label)}"', f'data-code-html="{sid}-html"']
    if css_tpl:
        attrs.append(f'data-code-css="{css_tpl}"')
    if js_tpl:
        attrs.append(f'data-code-js="{js_tpl}"')
    if deps_tpl:
        attrs.append(f'data-code-deps="{deps_tpl}"')
    stage_cls = f"specimen-stage specimen-stage--{ex.stage} specimen-layout--{ex.layout}"
    if ex.stage == "dark":
        stage_cls += " corn-dark"
    note = f'<p class="specimen-note">{escape(ex.note)}</p>' if ex.note else ""
    return f"""<article class="specimen" id="{sid}" data-reveal style="--i:{index}">
  <header class="specimen-head">
    <div class="specimen-meta">
      <h3 class="specimen-title"><a class="specimen-anchor" href="#{sid}">{escape(ex.title)}</a></h3>
      {note}
    </div>
    <button type="button" class="code-trigger" aria-haspopup="dialog" aria-expanded="false" {" ".join(attrs)}>{CODE_ICON}<span>代码</span></button>
  </header>
  <div class="{stage_cls}">
{ex.code}  </div>
  {template(sid + "-html", ex.code, "html")}
</article>"""
