"""tokens.json → corn-tokens.css, plus literal resolution for checks."""
import json
import re

from .paths import GENERATED_BANNER, TOKENS_JSON, BuildError

FLAT = ("color", "font", "motion", "layout")   # --corn-<key>
SCALED = ("radius", "space")                   # --corn-<group>-<key>
THEMES = ("light", "dark")
REF = re.compile(r"\{([\w-]+)\.([\w-]+)\}")

THEME_SELECTORS = {
    "light": ':root,\n.corn-light,\n[data-corn-theme="light"]',
    "dark": '.corn-dark,\n[data-corn-theme="dark"]',
}


def load(path=TOKENS_JSON) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise BuildError(f"{path.name}: invalid JSON ({exc})") from exc
    for group in FLAT + SCALED + ("theme",):
        if not isinstance(data.get(group), dict):
            raise BuildError(f"{path.name}: missing token group '{group}'")
    light, dark = (set(data["theme"].get(t, {})) for t in THEMES)
    if light != dark:
        raise BuildError(f"{path.name}: light/dark themes differ in keys: {sorted(light ^ dark)}")
    for value in _all_values(data):
        _check_refs(data, value)
    return data


def _all_values(data):
    for group in FLAT + SCALED + ("alias",):
        yield from data.get(group, {}).values()
    for theme in THEMES:
        yield from data["theme"][theme].values()


def _check_refs(data, value):
    for group, key in REF.findall(value):
        table = data["theme"]["light"] if group == "theme" else data.get(group, {})
        if group == "alias" or key not in table:
            raise BuildError(f"tokens.json: unknown reference {{{group}.{key}}}")


def var_name(group: str, key: str) -> str:
    if group in SCALED:
        return f"--corn-{group}-{key}"
    return f"--corn-{key}"


def css_value(value: str) -> str:
    return REF.sub(lambda m: f"var({var_name(*m.groups())})", value)


def resolve(data: dict, value: str, theme: str = "light", depth: int = 0) -> str:
    """Resolve references to a literal value (used by the contrast check)."""
    if depth > 8:
        raise BuildError(f"tokens.json: reference cycle near {value}")

    def repl(m):
        group, key = m.groups()
        raw = data["theme"][theme][key] if group == "theme" else data[group][key]
        return resolve(data, raw, theme, depth + 1)

    return REF.sub(repl, value)


def theme_value(data: dict, key: str, theme: str) -> str:
    return resolve(data, data["theme"][theme][key], theme)


def render_css(data: dict) -> str:
    out = [f"/* {GENERATED_BANNER}\n   Source: packages/tokens/tokens.json */", "", ":root {"]
    for group in FLAT + SCALED:
        out.append(f"  /* {group} */")
        for key, value in data[group].items():
            out.append(f"  {var_name(group, key)}: {css_value(value)};")
    out.append("}")
    aliases = data.get("alias", {})
    for theme in THEMES:
        out += ["", THEME_SELECTORS[theme] + " {", f"  color-scheme: {theme};"]
        for key, value in data["theme"][theme].items():
            out.append(f"  --corn-{key}: {css_value(value)};")
        # Aliases are re-declared per theme: a var() is resolved where it is
        # declared, so a :root-only alias would freeze the light value.
        for key, value in aliases.items():
            out.append(f"  --corn-{key}: {css_value(value)};")
        out.append("}")
    return "\n".join(out) + "\n"
