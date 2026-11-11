"""WCAG contrast of semantic token pairs, in both themes."""
from corn_build import tokens as tk

TEXT = 4.5
NON_TEXT = 3.0
# (foreground, [backgrounds], minimum)
PAIRS = [
    ("fg", ["bg", "surface", "surface-raised", "surface-hover"], TEXT),
    ("fg-muted", ["bg", "surface", "surface-raised"], TEXT),
    ("fg-subtle", ["bg", "surface", "surface-raised"], TEXT),
    ("solid-fg", ["solid-bg", "solid-hover"], TEXT),
    ("accent-fg", ["accent", "accent-hover"], TEXT),
    ("accent-text", ["bg", "surface-raised", "accent-soft"], TEXT),
    ("brand-fg", ["brand", "brand-hover"], TEXT),
    ("brand-text", ["bg", "surface-raised", "brand-soft"], TEXT),
    ("danger-text", ["bg", "surface-raised", "danger-soft"], TEXT),
    ("code-fg", ["code-bg"], TEXT),
    ("control-border", ["bg", "surface", "surface-raised"], NON_TEXT),
    ("focus", ["bg", "surface-raised"], NON_TEXT),
]


def _rgba(value):
    value = value.strip()
    if value.startswith("#"):
        h = value[1:]
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [1.0]
    nums = [float(x) for x in value[value.index("(") + 1:value.index(")")].split(",")]
    return nums[:3] + [nums[3] if len(nums) > 3 else 1.0]


def _over(fg, bg):
    a = fg[3]
    return [fg[i] * a + bg[i] * (1 - a) for i in range(3)] + [1.0]


def _lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def ratio(a, b):
    hi, lo = sorted((_lum(a), _lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def check(report, data=None):
    data = data or tk.load()
    count = 0
    for theme in tk.THEMES:
        page = _rgba(tk.theme_value(data, "bg", theme))
        for fg_key, bgs, need in PAIRS:
            for bg_key in bgs:
                bg = _over(_rgba(tk.theme_value(data, bg_key, theme)), page)
                fg = _over(_rgba(tk.theme_value(data, fg_key, theme)), bg)
                r = ratio(fg, bg)
                count += 1
                if r < need:
                    report.fail(f"contrast[{theme}]: --corn-{fg_key} on --corn-{bg_key} = {r:.2f} (< {need})")
    report.info(f"contrast: {count} token pairs checked across {len(tk.THEMES)} themes")
