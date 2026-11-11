"""Render a live example + the hidden, escaped copies used by the code popover.

Same-source guarantee: the example file text is inserted once raw (live) and
once html-escaped inside <template>s. The popover reads textContent, so what
you copy is byte-for-byte the file that is running. Layout and .corn-dark
wrappers live in the example source itself (the stage adds only padding), so
the copied code reproduces the specimen on its own.

Popover tabs per specimen:
  HTML  the example source
  CSS   the component stylesheet (reference; needs corn.css around it)
  JS    the component script, when it has one
  引入  a page skeleton with a paste slot for the HTML tab
  整页  that skeleton with this example already inside — save and open
"""
from html import escape

CODE_ICON = ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">'
             '<path d="M5 3.5 1.5 7 5 10.5M9 3.5 12.5 7 9 10.5" stroke="currentColor" '
             'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')

PASTE = "<!-- 把 HTML 页签的代码粘到这里 -->"

NOTES = {
    "html": "与上方示例同一份源文件。需放在 class=\"corn-body\"（或 .corn-root）的页面里，见“引入”或“整页”。",
    "css": "组件源码，已包含在 corn.css 里，仅供阅读或改造。单独粘贴不完整：还依赖 corn-tokens.css 的变量"
           "和 corn.css 的 base / motion 部分（--corn-lift*、--corn-loop、keyframes）。",
    "js": "组件脚本，已包含在 corn.js 里；依赖 core.js 的 Corn.define。使用时引入 corn.js 即可。",
    "deps": "页面骨架：corn-tokens.css、corn.css（及 corn.js）放在同一目录，把 HTML 页签的代码粘到标注处。",
    "page": "完整页面，可直接另存为 .html 打开；与 corn-tokens.css、corn.css、corn.js 放在同一目录。",
}


def template(tpl_id: str, text: str, lang: str, note: str = "") -> str:
    # '{{' would look like a template marker to later passes; an entity keeps
    # textContent identical while hiding it from the template engine.
    body = escape(text, quote=False).replace("{{", "&#123;&#123;")
    note_attr = f' data-note="{escape(note)}"' if note else ""
    return f'<template id="{tpl_id}" data-lang="{lang}"{note_attr}>{body}</template>'


def _skeleton(needs_js: bool, title: str) -> list:
    lines = ["<!doctype html>", '<html lang="zh-CN">', "<head>", '  <meta charset="utf-8">',
             '  <meta name="viewport" content="width=device-width, initial-scale=1">',
             f"  <title>{escape(title, quote=False)}</title>",
             "  <!-- 样式：tokens 在前，组件层在后 -->",
             '  <link rel="stylesheet" href="corn-tokens.css">',
             '  <link rel="stylesheet" href="corn.css">']
    if needs_js:
        lines += ["  <!-- 交互：自动初始化 data-corn-* 钩子，API 在 window.Corn -->",
                  '  <script src="corn.js" defer></script>']
    lines += ["</head>",
              "<!-- corn-body 提供字体、底色、焦点环与 border-box；整页深色用 <html data-corn-theme=\"dark\"> -->",
              '<body class="corn-body">']
    return lines


def deps_text(needs_js: bool, usage: str = "") -> str:
    lines = _skeleton(needs_js, "Corn UI") + [f"  {PASTE}"]
    if usage:
        lines.append(f"  <!-- 用法：{usage.replace('--', '—')} -->")
    return "\n".join(lines + ["</body>", "</html>"]) + "\n"


def page_text(code: str, needs_js: bool, title: str) -> str:
    # inserted verbatim (no re-indent): indentation would change <pre> content
    return "\n".join(_skeleton(needs_js, title) + [code.rstrip("\n"), "</body>", "</html>"]) + "\n"


def specimen(ex, sid: str, label: str, css_tpl: str = "", js_tpl: str = "",
             deps_tpl: str = "", needs_js: bool = False) -> str:
    attrs = [f'data-code-title="{escape(label)}"', f'data-code-html="{sid}-html"']
    if css_tpl:
        attrs.append(f'data-code-css="{css_tpl}"')
    if js_tpl:
        attrs.append(f'data-code-js="{js_tpl}"')
    if deps_tpl:
        attrs.append(f'data-code-deps="{deps_tpl}"')
    attrs.append(f'data-code-page="{sid}-page"')
    note = f'<p class="specimen-note">{escape(ex.note)}</p>' if ex.note else ""
    return f"""<article class="specimen" id="{sid}" data-reveal>
  <header class="specimen-head">
    <div class="specimen-meta">
      <h2 class="specimen-title"><a class="specimen-anchor" href="#{sid}">{escape(ex.title)}</a></h2>
      {note}
    </div>
    <button type="button" class="code-trigger" aria-haspopup="dialog" aria-expanded="false" {" ".join(attrs)}>{CODE_ICON}<span>代码</span></button>
  </header>
  <div class="specimen-stage specimen-stage--{ex.stage}">
{ex.code}  </div>
  {template(sid + "-html", ex.code, "html", NOTES["html"])}
  {template(sid + "-page", page_text(ex.code, needs_js, label), "html", NOTES["page"])}
</article>"""
