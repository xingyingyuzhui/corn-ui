#!/usr/bin/env python3
"""Static checks for Corn UI. Exit 1 on any failure.

  python3 scripts/check.py

Covers: generated files up to date, token references and theme parity,
token contrast (both themes), token-only colours in the library, CSS
comment/brace balance, example hygiene, hand-written file size budget,
JS syntax, CI step order, and (if dist/ exists) local links + leaked
template markers.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corn_build.paths import BuildError, rel  # noqa: E402
from corn_build.site import Site, generated_files, stale  # noqa: E402
from corn_check import contrast, css, dist, examples, scripts, size, workflow  # noqa: E402


class Report:
    def __init__(self):
        self.failures = []

    def fail(self, msg):
        self.failures.append(msg)
        print(f"  ✗ {msg}")

    def info(self, msg):
        print(f"  · {msg}")


def main() -> int:
    report = Report()
    try:
        site = Site()  # loads + validates tokens, groups, components, patterns
    except BuildError as exc:
        print(f"  ✗ registry: {exc}")
        return 1
    bad = stale(generated_files(site.data, site.components))
    for path in bad:
        report.fail(f"generated: {rel(path)} is stale — run python3 scripts/build.py")
    if not bad:
        report.info("generated: corn-tokens.css / corn.css / corn.js up to date")
    for module in (contrast, css, examples, size, scripts, workflow, dist):
        try:
            module.check(report)
        except BuildError as exc:
            report.fail(f"{module.__name__}: {exc}")
    print(f"{'FAILED' if report.failures else 'OK'}: {len(report.failures)} problem(s)")
    return 1 if report.failures else 0


if __name__ == "__main__":
    sys.exit(main())
