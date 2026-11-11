"""CI guard: the deploy workflow must verify committed generated files
*before* it rebuilds them, otherwise a stale corn.css / corn.js can never fail
CI (the build step overwrites them in the runner first)."""
import re

from corn_build.paths import ROOT

WORKFLOWS = ROOT / ".github" / "workflows"
CHECK = re.compile(r"run:\s*python3 scripts/build\.py --check\s*$")
BUILD = re.compile(r"run:\s*python3 scripts/build\.py\s*$")


def check(report):
    files = sorted(WORKFLOWS.glob("*.y*ml"))
    building = 0
    for path in files:
        lines = path.read_text(encoding="utf-8").splitlines()
        builds = [i for i, line in enumerate(lines) if BUILD.search(line)]
        if not builds:
            continue
        building += 1
        checks = [i for i, line in enumerate(lines) if CHECK.search(line)]
        if not checks or min(checks) > min(builds):
            report.fail(f"workflow: {path.name} runs scripts/build.py without a prior "
                        "`python3 scripts/build.py --check` step (stale generated files would pass CI)")
    report.info(f"workflow: {building} workflow(s) build; generated-file check runs before build")
