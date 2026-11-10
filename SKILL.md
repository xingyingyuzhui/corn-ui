---
name: corn-ui
description: "用 Corn UI 设计语言构建、改进和评审界面：纸田青釉底色、墨绿文字、玉米黄点缀、宋体标题的识别性风格。提供统一 design tokens（CSS 变量 + JSON）、零构建 CSS 组件层与 HTML 片段，覆盖网页、后台、App 界面与组件级打磨；同时沉淀设计规范并执行截图评审。不用于纯业务逻辑或与界面无关的代码整理。"
metadata:
  version: "0.0.1"
  compatibility: "核心是 CSS 变量与 HTML 片段，不依赖构建工具或框架；demo 只需现代浏览器。视觉验收需要看图能力。"
---

# corn-ui

Corn UI 是一套有明确识别性的设计语言：纸田青釉的暖底、墨绿近黑的文字、一抹玉米黄做点缀；宋体标题、黑体正文、等宽体数据。克制是删掉没有贡献的元素，不是把风格磨成中庸。

## 文件地图

- `packages/tokens/corn-tokens.css`：全部设计 token，CSS 变量形式，唯一的颜色/字体/圆角/动效来源
- `packages/tokens/tokens.json`：同一组 token 的机器可读版本，用于跨端（SwiftUI 等）与工具链
- `packages/ui/corn.css`：组件层，`.corn-` 前缀纯 CSS，零依赖零构建
- `packages/ui/components/*.html`：可直接拷进项目的组件片段
- `demo/`：多页站点源（`foundations/` 色板与字体、`components/` 组件页、`_partials/` 共享件）；`dist/` 是 `scripts/build-demo.py` 产出的自包含部署版
- `references/design-language.md`：语言规范——什么时候用哪个色、字体分工、什么不能做
- `references/workflow.md`：从需求到交付的设计流程
- `references/review.md`：视觉/交互评审清单

## 使用方式

- **新项目界面**：先引 `corn-tokens.css` 再引 `corn.css`，用 token 和 `.corn-` 类搭建；不要绕过 token 自造颜色。
- **已有项目**：把 token 映射进项目现有变量体系；组件片段按需拷贝改造，不整体替换项目样式。
- **SwiftUI 等非 Web 端**：读 `tokens.json`，按 `references/design-language.md` 的规则映射到目标框架（参考 CornStudio 的 `Hull` 枚举）。
- **评审界面**：按 `references/review.md` 清单执行，交付证据与建议，不直接改文件。

## 语言三句话

1. 颜色从田里来：纸、青釉、墨、玉米黄、苞叶绿，不引入第七种色相。
2. 字体有分工：serif 标题、sans 正文、mono 数据与标签，eyebrow 是签名细节。
3. 形状要克制：2–4px 圆角为主、细边框、浅阴影；hover 浮起 1–2px + maize 描边是签名交互。

详细规则见 `references/design-language.md`。
