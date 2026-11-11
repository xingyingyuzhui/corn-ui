"""Example hygiene: no inline layout styles, ids unique per page, ARIA/label
references resolve within the page the examples share."""
import re

from corn_build.registry import load_components, load_patterns

STYLE = re.compile(r'\bstyle="([^"]*)"')
IDS = re.compile(r'\bid="([^"]+)"')
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


def check(report):
    comps = load_components()
    for c in comps:
        _page_check(report, f"components/{c.name}", c.examples)
    patterns = load_patterns()
    _page_check(report, "patterns", patterns)
    total = sum(len(c.examples) for c in comps) + len(patterns)
    report.info(f"examples: {total} examples in {len(comps)} components + patterns")
