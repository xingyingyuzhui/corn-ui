"""Hand-written file size budget (see scripts/size-budget.json)."""
import json

from corn_build.paths import ROOT

BUDGET = ROOT / "scripts" / "size-budget.json"


def files(budget):
    generated = set(budget["generated"])
    seen = set()
    for pattern in budget["include"]:
        for path in sorted(ROOT.glob(pattern)):
            rel = path.relative_to(ROOT).as_posix()
            if path.is_file() and rel not in generated and rel not in seen and not rel.startswith("dist/"):
                seen.add(rel)
                yield rel, path


def check(report):
    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    default = budget["default"]
    largest = []
    for rel, path in files(budget):
        text = path.read_text(encoding="utf-8")
        lines, size = text.count("\n") + 1, len(text.encode("utf-8"))
        limit = budget["exceptions"].get(rel, default)
        if rel in budget["exceptions"] and not limit.get("reason"):
            report.fail(f"size: exception for {rel} has no reason")
        largest.append((lines, rel))
        if lines > limit["lines"] or size > limit["bytes"]:
            report.fail(f"size: {rel} has {lines} lines / {size} B (limit {limit['lines']} / {limit['bytes']})")
    largest.sort(reverse=True)
    report.info(f"size: {len(largest)} hand-written files, largest: "
                + ", ".join(f"{r} ({n})" for n, r in largest[:3]))
