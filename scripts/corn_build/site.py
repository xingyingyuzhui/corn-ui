"""Assemble dist/: generated bundles, static pages, one page per component."""
import json
import re
import shutil
from html import escape

from . import bundle
from . import tokens as tk
from .directives import Directives
from .paths import (CORN_CSS, CORN_JS, DEMO_ASSETS, DEMO_LAYOUTS, DEMO_PAGES, DIST,
                    TOKENS_CSS, BuildError, rel)
from .registry import load_components, load_groups, load_patterns
from .specimen import deps_text, specimen, template
from .templating import check_resolved, render

PAGE_META = re.compile(r"\A<!--\s*(\{.*?\})\s*-->[ \t]*\n", re.S)


def generated_files(data, components) -> dict:
    return {
        TOKENS_CSS: tk.render_css(data),
        CORN_CSS: bundle.render_css(components),
        CORN_JS: bundle.render_js(components),
    }


def stale(files: dict) -> list:
    return [p for p, text in files.items()
            if not p.exists() or p.read_text(encoding="utf-8") != text]


class Site:
    def __init__(self):
        self.data = tk.load()
        self.groups = load_groups()
        self.components = load_components()
        self.patterns = load_patterns()
        self.written = []

    # --- helpers ---------------------------------------------------------
    def _layout(self, name: str) -> str:
        path = DEMO_LAYOUTS / f"{name}.html"
        if not path.exists():
            raise BuildError(f"missing layout {rel(path)}")
        return path.read_text(encoding="utf-8")

    def write_page(self, out: str, ctx: dict, layout="page", current="-"):
        prefix = "../" * out.count("/")
        directives = Directives(self.data, self.components, self.patterns, self.groups,
                                prefix, current).table()
        ctx = {"ROOT": prefix, "nav": "", "current": current, **ctx}
        where = f"dist/{out}"
        ctx["content"] = render(ctx["content"], ctx, directives, where)
        html = render(self._layout(layout), ctx, directives, where)
        if ctx["nav"]:
            html = html.replace(f'data-nav="{ctx["nav"]}"', f'data-nav="{ctx["nav"]}" aria-current="page"')
        check_resolved(html, where)
        dest = DIST / out
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html, encoding="utf-8")
        self.written.append((out, len(html.encode("utf-8"))))

    # --- pages -----------------------------------------------------------
    def static_pages(self):
        for path in sorted(DEMO_PAGES.rglob("*.html")):
            text = path.read_text(encoding="utf-8")
            m = PAGE_META.match(text)
            if not m:
                raise BuildError(f'{rel(path)}: first line must be <!-- {{"title": ...}} -->')
            meta = json.loads(m.group(1))
            ctx = {"title": escape(meta["title"]), "nav": meta.get("nav", ""),
                   "content": text[m.end():]}
            self.write_page(path.relative_to(DEMO_PAGES).as_posix(), ctx,
                            meta.get("layout", "page"))

    def component_page(self, i: int):
        c = self.components[i]
        tpls = [template(f"src-{c.name}-css", c.css.read_text(encoding="utf-8"), "css"),
                template(f"deps-{c.name}", deps_text(False, c.usage), "html"),
                template(f"deps-{c.name}-js", deps_text(True, c.usage), "html")]
        if c.js:
            tpls.append(template(f"src-{c.name}-js", c.js.read_text(encoding="utf-8"), "js"))
        cards = []
        for n, ex in enumerate(c.examples):
            deps = f"deps-{c.name}-js" if ex.js else f"deps-{c.name}"
            cards.append(specimen(ex, f"{c.name}-{ex.slug}", f"{c.title} · {ex.title}",
                                  f"src-{c.name}-css", f"src-{c.name}-js" if c.js else "",
                                  deps, n))
        js_tag = (f'<span class="corn-tag corn-tag-brand corn-tag-dot">JS · {c.name}.js</span>'
                  if c.js else '<span class="corn-tag">纯 CSS</span>')
        rules = "".join(f"<li>{escape(r)}</li>" for r in c.rules)
        pager = self._pager(i)
        content = f"""<header class="doc-head" data-reveal>
  <span class="corn-eyebrow">Components / {escape(self.groups[c.group])}</span>
  <h1 class="corn-h2">{escape(c.title)}</h1>
  <p class="corn-lead">{escape(c.summary)}</p>
  <div class="doc-facts"><span class="corn-tag">{len(c.examples)} 个示例</span>
    <span class="corn-tag">components/{c.name}/{c.name}.css</span>{js_tag}</div>
</header>
{"".join(tpls)}
<div class="specimen-list">{"".join(cards)}</div>
<section class="doc-rules" data-reveal><h2 class="corn-h3">用法规则</h2><ul class="corn-list">{rules}</ul></section>
{pager}"""
        self.write_page(f"components/{c.name}.html",
                        {"title": escape(c.title), "nav": "components", "content": content},
                        layout="docs", current=c.name)

    def _pager(self, i: int) -> str:
        links = []
        for j, label, cls in ((i - 1, "上一个", "pager-prev"), (i + 1, "下一个", "pager-next")):
            if 0 <= j < len(self.components):
                c = self.components[j]
                links.append(f'<a class="pager-link {cls}" href="{{{{ROOT}}}}components/{c.name}.html">'
                             f'<span class="corn-eyebrow">{label}</span><span>{escape(c.title)}</span></a>')
        return f'<nav class="pager" aria-label="组件翻页">{"".join(links)}</nav>'

    # --- entry -----------------------------------------------------------
    def build(self):
        files = generated_files(self.data, self.components)
        for path, text in files.items():
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                path.write_text(text, encoding="utf-8")
        if DIST.exists():
            shutil.rmtree(DIST)
        shutil.copytree(DEMO_ASSETS, DIST / "assets")
        (DIST / "assets" / "corn").mkdir()
        for path in files:
            shutil.copy2(path, DIST / "assets" / "corn" / path.name)
        self.static_pages()
        for i in range(len(self.components)):
            self.component_page(i)
        return files
