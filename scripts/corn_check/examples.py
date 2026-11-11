"""Example hygiene: no inline layout styles, ids unique per page, ARIA/label
references resolve within the page the examples share."""
import re

from corn_build.registry import load_components, load_patterns

STYLE = re.compile(r'\bstyle="([^"]*)"')
IDS = re.compile(r'\bid="([^"]+)"')
DEFINE = re.compile(r"Corn\.define\(\s*'[\w-]+'\s*,\s*'([^']+)'")
REFS = re.compile(r'\b(?:for|aria-controls|aria-describedby|aria-labelledby|data-corn-dialog-open)="([^"]+)"')


def _page_check(report, where, examples):
    ids = {}
    for ex in examples:
        for m in STYLE.finditer(ex.code):
            decls = [d.strip() for d in m.group(1).split(";") if d.strip()]
            if any(not d.startswith("--") for d in decls):
                report.fail(f"examples: {ex.path.name} in {where}: inline style '{m.group(1)}' "
                            "(only --custom-properties allowed; add a class instead)")
        for i in IDS.findall(ex.code):
            if i in ids:
                report.fail(f"examples: duplicate id '{i}' in {where} ({ids[i]} and {ex.path.name})")
            ids[i] = ex.path.name
    for ex in examples:
        for m in REFS.finditer(ex.code):
            for ref in m.group(1).split():
                if ref not in ids:
                    report.fail(f"examples: {ex.path.name} in {where} references missing id '{ref}'")


def _hooks(comps):
    """Markup patterns that need corn.js: data-corn-* attributes, Corn.* calls,
    and every selector registered with Corn.define (e.g. .corn-tooltip)."""
    pats = [r"\bdata-corn-[\w-]+", r"\bCorn\."]
    for c in comps:
        if not c.js:
            continue
        for sel in DEFINE.findall(c.js.read_text(encoding="utf-8")):
            for cls in re.findall(r"\.([\w-]+)", sel):
                pats.append(rf'class="[^"]*\b{re.escape(cls)}\b')
    return re.compile("|".join(pats))


def _js_flag(report, where, examples, hooks):
    for ex in examples:
        m = hooks.search(ex.code)
        if m and not ex.js:
            report.fail(f"examples: {ex.path.name} in {where} uses '{m.group(0)[:40]}' (needs corn.js) "
                        'but its @example lacks "js": true — the 引入/整页 tabs would omit corn.js')


def check(report):
    comps = load_components()
    hooks = _hooks(comps)
    for c in comps:
        _page_check(report, f"components/{c.name}", c.examples)
        _js_flag(report, f"components/{c.name}", c.examples, hooks)
    patterns = load_patterns()
    _page_check(report, "patterns", patterns)
    _js_flag(report, "patterns", patterns, hooks)
    total = sum(len(c.examples) for c in comps) + len(patterns)
    report.info(f"examples: {total} examples in {len(comps)} components + patterns")
