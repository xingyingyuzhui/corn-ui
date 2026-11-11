"""A deliberately tiny template language for the demo site.

  {{> name}}          include demo/partials/name.html (recursive, depth-limited)
  {{@name arg ...}}   call a directive registered by site.py (returns HTML)
  {{key}}             substitute ctx[key] (already-safe HTML)
Anything left that still looks like a marker is a build error, so typos fail
loudly instead of shipping literal braces (the bug in the old raw /demo/).
"""
import re

from .paths import DEMO_PARTIALS, BuildError

PARTIAL = re.compile(r"\{\{>\s*([\w-]+)\s*\}\}")
DIRECTIVE = re.compile(r"\{\{@([\w-]+)((?:\s+[\w.-]+)*)\s*\}\}")
VAR = re.compile(r"\{\{\s*([\w-]+)\s*\}\}")


def expand_partials(text: str, where: str, depth: int = 0) -> str:
    if depth > 5:
        raise BuildError(f"{where}: partials nested too deeply")

    def repl(m):
        path = DEMO_PARTIALS / f"{m.group(1)}.html"
        if not path.exists():
            raise BuildError(f"{where}: missing partial '{m.group(1)}'")
        return expand_partials(path.read_text(encoding="utf-8"), where, depth + 1)

    return PARTIAL.sub(repl, text)


def render(text: str, ctx: dict, directives: dict, where: str) -> str:
    text = expand_partials(text, where)

    def call(m):
        name, args = m.group(1), m.group(2).split()
        if name not in directives:
            raise BuildError(f"{where}: unknown directive '@{name}'")
        return directives[name](*args)

    def sub(m):
        if m.group(1) not in ctx:
            raise BuildError(f"{where}: unknown variable '{m.group(1)}'")
        return str(ctx[m.group(1)])

    # re.sub never rescans its own replacements, so ctx values are inserted
    # verbatim. Directive output is seen by the VAR pass, which is safe
    # because registry.parse_example rejects '{{' in example code.
    return VAR.sub(sub, DIRECTIVE.sub(call, text))


def check_resolved(text: str, where: str) -> None:
    for pattern in (PARTIAL, DIRECTIVE, VAR):
        m = pattern.search(text)
        if m:
            raise BuildError(f"{where}: unresolved marker {m.group(0)!r}")
