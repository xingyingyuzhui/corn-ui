"""JS syntax check via `node --check` (skipped when node is unavailable)."""
import shutil
import subprocess

from corn_build.paths import COMPONENTS, CORN_JS, DEMO_ASSETS, UI_SRC, rel


def check(report):
    node = shutil.which("node")
    if not node:
        report.info("js: skipped (node not found)")
        return
    files = sorted(UI_SRC.glob("*.js")) + sorted(COMPONENTS.glob("*/*.js")) + [CORN_JS] + sorted(DEMO_ASSETS.rglob("*.js"))
    for path in files:
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        if result.returncode != 0:
            report.fail(f"js: syntax error in {rel(path)}: {result.stderr.strip().splitlines()[-1]}")
    report.info(f"js: {len(files)} scripts pass node --check")
