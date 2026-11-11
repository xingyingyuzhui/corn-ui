"""Built site: every local href/src resolves; no template markers leaked."""
import re
from urllib.parse import urlparse

from corn_build.paths import DIST

LINK = re.compile(r'\b(?:href|src)="([^"]+)"')
MARKER = re.compile(r"\{\{[>@]?\s*[\w-]")


def check(report):
    if not (DIST / "index.html").exists():
        report.info("dist: skipped (no dist/ — run scripts/build.py)")
        return
    pages = sorted(DIST.rglob("*.html"))
    links = 0
    for page in pages:
        text = page.read_text(encoding="utf-8")
        # templates and <pre> blocks hold escaped example code, not real links
        visible = re.sub(r"<(template|pre)\b.*?</\1>", "", text, flags=re.S)
        if MARKER.search(visible):
            report.fail(f"dist: unresolved template marker in {page.relative_to(DIST)}")
        for url in LINK.findall(visible):
            parsed = urlparse(url)
            if parsed.scheme or url.startswith(("#", "//", "mailto:")) or not parsed.path:
                continue
            links += 1
            target = (page.parent / parsed.path).resolve()
            if not target.is_file():
                report.fail(f"dist: {page.relative_to(DIST)} links to missing {url}")
    report.info(f"dist: {len(pages)} pages, {links} local links resolved")
