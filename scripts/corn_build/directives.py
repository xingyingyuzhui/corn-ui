"""{{@directive}} implementations: HTML generated from tokens and the registry.

Every number or colour shown on the site comes from here, so the demo can
never drift from tokens.json or the component folders again.
"""
from html import escape

from . import tokens as tk
from .paths import DEMO_ASSETS, BuildError
from .specimen import NOTES, deps_text, specimen, template


class Directives:
    def __init__(self, data, components, patterns, groups, prefix, current=""):
        self.data, self.components, self.patterns = data, components, patterns
        self.groups, self.prefix, self.current = groups, prefix, current

    def table(self) -> dict:
        return {
            "swatches": self.swatches,
            "theme-table": self.theme_table,
            "token-table": self.token_table,
            "component-grid": self.component_grid,
            "component-filter": self.component_filter,
            "component-nav": self.component_nav,
            "component-cob": self.component_cob,
            "palette-cob": self.palette_cob,
            "patterns": self.render_patterns,
            "stat": self.stat,
            "motion-source": self.motion_source,
        }

    # Fixed allowlist for {{@motion-source}}: motion-page code tabs embed the
    # actual asset source so the examples can never drift from the page.
    MOTION_SOURCE = {
        "motion-field.js": "js/motion-field.js",
        "motion-studies.js": "js/motion-studies.js",
        "motion-lab.css": "css/motion-lab.css",
        "motion-studies.css": "css/motion-studies.css",
    }

    def motion_source(self, name):
        if name not in self.MOTION_SOURCE:
            raise BuildError(f"@motion-source: '{name}' is not in the allowlist")
        return escape((DEMO_ASSETS / self.MOTION_SOURCE[name]).read_text(encoding="utf-8"))

    # --- foundations -----------------------------------------------------
    def swatches(self, *keys):
        cells = []
        for key in keys:
            if key not in self.data["color"]:
                raise BuildError(f"@swatches: unknown color '{key}'")
            hexv = self.data["color"][key]
            cells.append(
                f'<li class="swatch" data-reveal><span class="swatch-chip" style="background:var(--corn-{key})"></span>'
                f'<span class="swatch-name">{key}</span><span class="swatch-hex corn-mono">{hexv}</span>'
                f'<button type="button" class="swatch-copy" data-copy="var(--corn-{key})" '
                f'aria-label="复制 var(--corn-{key})">复制变量</button></li>')
        return f'<ul class="swatch-grid" role="list">{"".join(cells)}</ul>'

    # Hero cobs: kernels ARE the content (palette = copy buttons, components =
    # links). hero.js adds --row/--col, the odd-row offset and the wave/ripple.
    PALETTE_FAMILIES = [
        ("surface", ["void", "paper", "panel", "panel-hover", "paper-3", "raised"]),
        ("ink", ["ink-deep", "ink", "ink-2", "ink-3", "muted", "muted-2", "ondark-muted", "ondark-subtle"]),
        ("brand", ["maize", "maize-hover", "maize-soft", "maize-deep", "husk", "husk-deep", "sage", "celadon"]),
        ("semantic", ["danger", "alert", "control-line", "ondark-control-line"]),
    ]

    def palette_cob(self):
        rows = []
        for family, keys in self.PALETTE_FAMILIES:
            cells = []
            for key in keys:
                if key not in self.data["color"]:
                    raise BuildError(f"@palette-cob: unknown color '{key}'")
                cells.append(
                    f'<button type="button" class="cob-k" style="--k:var(--corn-{key})" '
                    f'data-copy="var(--corn-{key})" aria-label="复制 var(--corn-{key})" '
                    f'title="{key} · {self.data["color"][key]}"></button>')
            rows.append(f'<div class="cob-row" data-family="{family}">{"".join(cells)}</div>')
        return f'<div class="cob" data-cob>{"".join(rows)}</div>'

    def component_cob(self):
        links = []
        for _gid, _label, items in self._by_group():
            for c in items:
                links.append(
                    f'<a class="cob-k cob-k-label" href="{self.prefix}components/{c.name}.html" '
                    f'aria-label="{escape(c.title)}" title="{escape(c.title)}">'
                    f'<span aria-hidden="true">{escape(c.title[0])}</span></a>')
        return ('<div class="cob" data-cob data-cols="6" '
                f'style="--k-w:44px;--k-h:52px">{"".join(links)}</div>')

    def theme_table(self, *keys):
        rows = []
        for key in keys:
            if key not in self.data["theme"]["light"]:
                raise BuildError(f"@theme-table: unknown semantic token '{key}'")
            cells = "".join(
                f'<td><span class="theme-chip" style="background:{escape(tk.theme_value(self.data, key, t))}"></span>'
                f'<code class="corn-mono">{escape(self.data["theme"][t][key])}</code></td>'
                for t in tk.THEMES)
            rows.append(f'<tr><th scope="row"><code class="corn-mono">--corn-{key}</code></th>{cells}</tr>')
        return ('<table class="corn-table theme-table"><thead><tr><th scope="col">语义变量</th>'
                '<th scope="col">浅色</th><th scope="col">深色</th></tr></thead>'
                f'<tbody>{"".join(rows)}</tbody></table>')

    def token_table(self, group):
        if group not in self.data:
            raise BuildError(f"@token-table: unknown group '{group}'")
        rows = "".join(
            f'<tr><th scope="row"><code class="corn-mono">{tk.var_name(group, k)}</code></th>'
            f'<td><code class="corn-mono">{escape(v)}</code></td></tr>'
            for k, v in self.data[group].items())
        return ('<table class="corn-table"><thead><tr><th scope="col">变量</th><th scope="col">值</th>'
                f'</tr></thead><tbody>{rows}</tbody></table>')

    def stat(self, what):
        values = {
            "components": len(self.components),
            "examples": sum(len(c.examples) for c in self.components) + len(self.patterns),
            "tokens": sum(len(self.data[g]) for g in tk.FLAT + tk.SCALED)
            + len(self.data["theme"]["light"]),
            "scripted": sum(1 for c in self.components if c.js),
        }
        if what not in values:
            raise BuildError(f"@stat: unknown stat '{what}'")
        return str(values[what])

    # --- registry views --------------------------------------------------
    def _by_group(self):
        for gid, label in self.groups.items():
            items = [c for c in self.components if c.group == gid]
            if items:
                yield gid, label, items

    def component_filter(self):
        # Directory controls live in <search>; hidden until comp-filter.js
        # takes over — without JS every card stays visible and unfiltered.
        options = "".join(f'<option value="{escape(gid)}">{escape(label)}</option>'
                          for gid, label, _items in self._by_group())
        return f'''<search class="comp-filter" data-comp-filter hidden>
  <form class="comp-filter-form" data-comp-filter-form>
    <label class="comp-filter-field" for="comp-filter-q">搜索组件
      <input id="comp-filter-q" type="search" name="q" autocomplete="off"
             placeholder="中文名、英文名或描述"></label>
    <label class="comp-filter-field" for="comp-filter-group">分组
      <select id="comp-filter-group" name="group">
        <option value="">全部分组</option>{options}</select></label>
    <button type="reset" class="corn-btn corn-btn-ghost corn-btn-sm">重置</button>
  </form>
  <p class="comp-filter-status" role="status" aria-live="polite" data-comp-filter-status></p>
</search>
<div class="comp-filter-empty" data-comp-filter-empty hidden>
  <p>没有匹配的组件。</p>
  <button type="button" class="corn-btn corn-btn-soft corn-btn-sm" data-comp-filter-clear>清除筛选</button>
</div>'''

    def component_grid(self):
        blocks = []
        for gid, label, items in self._by_group():
            cards = []
            for c in items:
                badge = '<span class="corn-tag corn-tag-brand">JS</span>' if c.js else ""
                terms = escape(f'{c.title} {c.name} {c.summary}')
                cards.append(
                    f'<a class="corn-card corn-card-link comp-card" data-reveal '
                    f'data-component="{escape(c.name)}" data-group="{escape(gid)}" '
                    f'data-search="{terms}" '
                    f'href="{self.prefix}components/{c.name}.html"><span class="comp-path corn-mono">'
                    f'components/{c.name}</span><span class="comp-name">{escape(c.title)}</span>'
                    f'<span class="comp-desc">{escape(c.summary)}</span><span class="comp-foot">'
                    f'<span class="corn-tag">{len(c.examples)} 个示例</span>{badge}</span></a>')
            blocks.append(f'<section class="comp-group" data-group="{escape(gid)}">'
                          f'<h2 class="corn-eyebrow">{escape(label)}</h2>'
                          f'<div class="comp-grid">{"".join(cards)}</div></section>')
        return "".join(blocks)

    def component_nav(self, current=""):
        current = current or self.current
        out, here = [], ' aria-current="page"'
        for gid, label, items in self._by_group():
            links = "".join(
                f'<li><a href="{self.prefix}components/{c.name}.html"'
                f'{here if c.name == current else ""}>{escape(c.title)}</a></li>'
                for c in items)
            out.append(f'<p class="side-group">{escape(label)}</p><ul role="list">{links}</ul>')
        return "".join(out)

    def render_patterns(self):
        deps = (template("deps-pattern-css", deps_text(False), "html", NOTES["deps"])
                + template("deps-pattern-js", deps_text(True), "html", NOTES["deps"]))
        cards = [specimen(p, f"pattern-{p.slug}", f"场景 · {p.title}",
                          deps_tpl="deps-pattern-js" if p.js else "deps-pattern-css", needs_js=p.js)
                 for p in self.patterns]
        return deps + "\n".join(cards)
