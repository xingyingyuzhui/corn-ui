#!/usr/bin/env python3
"""Build Corn UI.

  python3 scripts/build.py           regenerate corn-tokens.css / corn.css / corn.js
                                     and the static demo site in dist/
  python3 scripts/build.py --check   only verify the in-tree generated files are
                                     up to date (exit 1 if stale); writes nothing

Pure standard library (Python ≥ 3.10). Source layout: docs/architecture.md.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corn_build.paths import BuildError, rel  # noqa: E402
from corn_build.site import Site, generated_files, stale  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--check", action="store_true", help="verify generated files only")
    args = parser.parse_args()
    try:
        site = Site()
        if args.check:
            bad = stale(generated_files(site.data, site.components))
            for path in bad:
                print(f"stale: {rel(path)} (run python3 scripts/build.py)")
            print("generated files up to date" if not bad else f"{len(bad)} stale file(s)")
            return 1 if bad else 0
        site.build()
    except BuildError as exc:
        print(f"build error: {exc}", file=sys.stderr)
        return 1
    for out, size in site.written:
        print(f"  dist/{out} ({size:,} bytes)")
    print(f"built {len(site.written)} pages, {len(site.components)} components, "
          f"{len(site.patterns)} patterns -> dist/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
