"""{{@directive}} implementations: HTML generated from tokens and the registry.

Every number or colour shown on the site comes from here, so the demo can
never drift from tokens.json or the component folders again.
"""
from html import escape

from . import tokens as tk
from .paths import BuildError
from .specimen import deps_text, specimen, template


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
            "component-nav": self.component_nav,
            "patterns": self.render_patterns,
            "stat": self.stat,
        }

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

    def component_grid(self):
        blocks, i = [], 0
        for gid, label, items in self._by_group():
            cards = []
            for c in items:
                badge = '<span class="corn-tag corn-tag-brand">JS</span>' if c.js else ""
                cards.append(
                    f'<a class="corn-card corn-card-link comp-card" data-reveal style="--i:{i}" '
                    f'href="{self.prefix}components/{c.name}.html"><span class="comp-path corn-mono">'
                    f'components/{c.name}</span><span class="comp-name">{escape(c.title)}</span>'
                    f'<span class="comp-desc">{escape(c.summary)}</span><span class="comp-foot">'
                    f'<span class="corn-tag">{len(c.examples)} 个示例</span>{badge}</span></a>')
                i += 1
            blocks.append(f'<section class="comp-group"><h2 class="corn-eyebrow">{escape(label)}</h2>'
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
        deps = (template("deps-pattern-css", deps_text(False), "html")
                + template("deps-pattern-js", deps_text(True), "html"))
        cards = [specimen(p, f"pattern-{p.slug}", f"场景 · {p.title}",
                          deps_tpl="deps-pattern-js" if p.js else "deps-pattern-css", index=i)
                 for i, p in enumerate(self.patterns)]
        return deps + "\n".join(cards)
