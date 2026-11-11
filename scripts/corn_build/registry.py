"""Discover components and patterns from the filesystem.

A component is a folder packages/ui/components/<name>/ containing:
  component.json   meta (title, summary, group, order, rules, usage)
  <name>.css       styles (bundled into corn.css)
  <name>.js        optional behaviour (bundled into corn.js)
  examples/*.html  live examples; each is also the copyable code
Adding a folder is the whole integration: bundles, nav, index and the
component page are generated from this registry.
"""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .paths import COMPONENTS, GROUPS_JSON, PATTERNS, BuildError, rel

FRONT = re.compile(r"\A<!--\s*@example\s+(\{.*?\})\s*-->[ \t]*\n", re.S)
STAGES = {"light", "dark", "plain"}
LAYOUTS = {"row", "stack", "grid", "center", "wide"}
NAME = re.compile(r"^[a-z][a-z0-9-]*$")
META_KEYS = {"title", "summary", "group", "order", "rules", "usage"}


@dataclass
class Example:
    slug: str
    title: str
    note: str
    stage: str
    layout: str
    code: str
    path: Path
    js: bool = False


@dataclass
class Component:
    name: str
    title: str
    summary: str
    group: str
    order: int
    rules: list
    usage: str
    css: Path
    js: Path | None
    examples: list = field(default_factory=list)


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise BuildError(f"missing {rel(path)}") from exc
    except json.JSONDecodeError as exc:
        raise BuildError(f"{rel(path)}: invalid JSON ({exc})") from exc


def parse_example(path: Path) -> Example:
    text = path.read_text(encoding="utf-8")
    m = FRONT.match(text)
    if not m:
        raise BuildError(f'{rel(path)}: first line must be <!-- @example {{"title": ...}} -->')
    try:
        meta = json.loads(m.group(1))
    except json.JSONDecodeError as exc:
        raise BuildError(f"{rel(path)}: bad @example JSON ({exc})") from exc
    stage, layout = meta.get("stage", "light"), meta.get("layout", "row")
    if not meta.get("title"):
        raise BuildError(f"{rel(path)}: @example needs a title")
    if stage not in STAGES or layout not in LAYOUTS:
        raise BuildError(f"{rel(path)}: stage must be {sorted(STAGES)}, layout {sorted(LAYOUTS)}")
    code = text[m.end():].strip() + "\n"
    if "{{" in code:
        raise BuildError(f"{rel(path)}: '{{{{' is reserved for templates")
    slug = re.sub(r"^\d+-", "", path.stem)
    return Example(slug, meta["title"], meta.get("note", ""), stage, layout, code, path,
                   js=bool(meta.get("js")))


def load_groups() -> dict:
    groups = _read_json(GROUPS_JSON)
    if not isinstance(groups, dict) or not groups:
        raise BuildError(f"{rel(GROUPS_JSON)}: expected an object of group-id → label")
    return groups


def load_component(folder: Path, groups: dict) -> Component:
    name = folder.name
    if not NAME.match(name):
        raise BuildError(f"{rel(folder)}: component folder must be kebab-case")
    meta = _read_json(folder / "component.json")
    unknown = set(meta) - META_KEYS
    if unknown:
        raise BuildError(f"{rel(folder)}/component.json: unknown keys {sorted(unknown)}")
    for key in ("title", "summary", "group"):
        if not meta.get(key):
            raise BuildError(f"{rel(folder)}/component.json: '{key}' is required")
    if meta["group"] not in groups:
        raise BuildError(f"{rel(folder)}: group '{meta['group']}' not in {sorted(groups)}")
    css = folder / f"{name}.css"
    if not css.exists():
        raise BuildError(f"{rel(folder)}: missing {name}.css")
    js = folder / f"{name}.js"
    examples = sorted((folder / "examples").glob("*.html"))
    if not examples:
        raise BuildError(f"{rel(folder)}: needs at least one examples/*.html")
    comp = Component(name, meta["title"], meta["summary"], meta["group"],
                     int(meta.get("order", 100)), list(meta.get("rules", [])),
                     meta.get("usage", ""), css, js if js.exists() else None)
    comp.examples = [parse_example(p) for p in examples]
    return comp


def load_components() -> list:
    groups = load_groups()
    folders = [p for p in sorted(COMPONENTS.iterdir()) if p.is_dir()]
    comps = [load_component(p, groups) for p in folders]
    order = list(groups)
    comps.sort(key=lambda c: (order.index(c.group), c.order, c.name))
    return comps


def load_patterns() -> list:
    return [parse_example(p) for p in sorted(PATTERNS.glob("*.html"))]
