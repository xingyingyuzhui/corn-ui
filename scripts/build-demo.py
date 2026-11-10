#!/usr/bin/env python3
"""Build the Corn UI demo site into a deployable static bundle.

demo/ uses plain HTML with lightweight markers; this script produces dist/,
a directory of fully self-contained pages (all CSS inlined, partials
expanded, component snippets embedded). Deploy = copy dist/ anywhere.

Markers in demo pages:
  {{> name}}            inject _partials/name.html
  {{ROOT}}              relative path back to demo/ root ("", "../", "../../")
  <!-- @snippet name -->  embed packages/ui/components/name.html as an
                         escaped <pre> code block inside .corn-code-card
  <body data-page="x">   marks nav link data-nav="x" with aria-current

Usage: python3 scripts/build-demo.py
"""
import html as html_mod
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo"
DIST = ROOT / "dist"
PARTIALS = DEMO / "_partials"
SNIPPETS = ROOT / "packages" / "ui" / "components"
SKIP_DIRS = {"_partials", "assets"}


def page_prefix(page: Path) -> str:
    depth = len(page.parent.relative_to(DEMO).parts)
    return "../" * depth


def expand_partials(text: str, prefix: str) -> str:
    def repl(m: re.Match) -> str:
        partial = PARTIALS / f"{m.group(1)}.html"
        if not partial.exists():
            raise SystemExit(f"missing partial: {m.group(1)}")
        return partial.read_text(encoding="utf-8")
    return re.sub(r"\{\{>\s*(\w[\w-]*)\s*\}\}", repl, text)


def inline_css_links(text: str, page: Path) -> str:
    def repl(m: re.Match) -> str:
        css_path = (page.parent / m.group(1)).resolve()
        if not css_path.is_relative_to(ROOT) or not css_path.exists():
            raise SystemExit(f"cannot inline stylesheet {m.group(1)} in {page.name}")
        css = css_path.read_text(encoding="utf-8")
        rel = css_path.relative_to(ROOT)
        return f"<style>\n/* inlined from {rel} */\n{css}</style>"
    return re.sub(r'<link rel="stylesheet" href="([^"]+)">', repl, text)


def embed_snippets(text: str) -> str:
    def repl(m: re.Match) -> str:
        snippet = SNIPPETS / f"{m.group(1)}.html"
        if not snippet.exists():
            raise SystemExit(f"missing snippet: {m.group(1)}")
        code = html_mod.escape(snippet.read_text(encoding="utf-8").strip())
        return (
            '<div class="corn-code-card demo-snippet"><pre>'
            f'<span class="corn-mono">&lt;!-- packages/ui/components/{m.group(1)}.html --&gt;</span>\n'
            f"{code}</pre></div>"
        )
    return re.sub(r"<!--\s*@snippet\s+(\w[\w-]*)\s*-->", repl, text)


def mark_active_nav(text: str, page: Path) -> str:
    m = re.search(r'data-page="([\w-]+)"', text)
    if not m:
        return text
    return text.replace(
        f'data-nav="{m.group(1)}"',
        f'data-nav="{m.group(1)}" aria-current="page"',
    )


def build() -> None:
    pages = [
        p for p in DEMO.rglob("*.html")
        if not any(part in SKIP_DIRS for part in p.relative_to(DEMO).parts)
    ]
    for page in pages:
        prefix = page_prefix(page)
        out = page.read_text(encoding="utf-8")
        out = expand_partials(out, prefix)
        out = out.replace("{{ROOT}}", prefix)
        out = embed_snippets(out)
        out = inline_css_links(out, page)
        out = mark_active_nav(out, page)
        dest = DIST / page.relative_to(DEMO)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out, encoding="utf-8")
        print(f"  {dest.relative_to(ROOT)} ({len(out):,} bytes)")
    print(f"built {len(pages)} pages -> dist/")


if __name__ == "__main__":
    build()
