"""Concatenate hand-written sources into the distributable corn.css / corn.js."""
from .paths import GENERATED_BANNER, UI_SRC, rel

CSS_BASE = ("base.css", "motion.css", "utilities.css")
JS_CORE = ("core.js",)


def _section(path) -> str:
    return f"/* --- {rel(path)} --- */\n{path.read_text(encoding='utf-8').strip()}\n"


def render_css(components) -> str:
    parts = [f"/* Corn UI component layer — {GENERATED_BANNER}\n"
             "   Load corn-tokens.css first. Sources: packages/ui/src and packages/ui/components/<name>/ */\n"]
    parts += [_section(UI_SRC / name) for name in CSS_BASE]
    parts += [_section(c.css) for c in components]
    return "\n".join(parts)


def render_js(components) -> str:
    parts = [f"/* Corn UI behaviours — {GENERATED_BANNER}\n"
             "   Optional. Auto-initialises [data-corn-*] hooks; API on window.Corn. */\n"]
    parts += [_section(UI_SRC / name) for name in JS_CORE]
    parts += [_section(c.js) for c in components if c.js]
    return "\n".join(parts)
