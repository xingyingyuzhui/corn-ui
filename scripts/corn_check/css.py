"""CSS hygiene: token-only colours in the library, balanced comments/braces."""
import re

from corn_build.paths import COMPONENTS, CORN_CSS, DEMO_ASSETS, TOKENS_CSS, UI_SRC, rel

COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab)\(|(?<![\w-])(?:white|black)(?![\w-])")


def strip_comments(text):
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def balanced(text):
    """Return an error string if comments or braces are unbalanced."""
    depth, i = 0, 0
    while i < len(text):
        if text.startswith("/*", i):
            end = text.find("*/", i + 2)
            if end < 0:
                return "unterminated comment"
            i = end + 2
            continue
        if text.startswith("*/", i):
            return f"stray '*/' at offset {i} (comment closed early?)"
        ch = text[i]
        if ch in "\"'":
            end = text.find(ch, i + 1)
            i = (end if end >= 0 else len(text)) + 1
            continue
        depth += {"{": 1, "}": -1}.get(ch, 0)
        if depth < 0:
            return f"unexpected '}}' at offset {i}"
        i += 1
    return None if depth == 0 else f"{depth} unclosed '{{'"


def library_css():
    yield from sorted(UI_SRC.glob("*.css"))
    yield from sorted(COMPONENTS.glob("*/*.css"))


def check(report):
    for path in library_css():
        body = strip_comments(path.read_text(encoding="utf-8"))
        for n, line in enumerate(body.splitlines(), 1):
            if COLOR.search(line):
                report.fail(f"css: literal colour in {rel(path)}:{n}: {line.strip()} (use a token)")
    every = list(library_css()) + [CORN_CSS, TOKENS_CSS] + sorted(DEMO_ASSETS.rglob("*.css"))
    for path in every:
        err = balanced(path.read_text(encoding="utf-8"))
        if err:
            report.fail(f"css: {rel(path)}: {err}")
    report.info(f"css: {len(every)} stylesheets parsed, library colours token-only")
