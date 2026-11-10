# Corn UI

玉米设计语言体系：一套有识别性的设计语言 + 配套工具。

- **设计语言**：纸田青釉底色、墨绿近黑文字、玉米黄点缀；宋体标题、黑体正文、等宽数据。
- **AI 设计 Skill**：`SKILL.md` + `references/`，给 agent 用的方法论与规范。
- **组件层**：纯 CSS + HTML 片段，零构建，拷进项目即用。

## 结构

```
SKILL.md                  # agent skill 入口
references/               # 设计语言规范、工作流、评审清单
packages/
  tokens/                 # corn-tokens.css + tokens.json（单一来源）
  ui/                     # corn.css 组件层 + components/*.html 片段
demo/                     # 多页站点源：_partials 共享件 + foundations/ + components/
dist/                     # 构建产物：自包含多页站点，部署即拷贝此目录
```

## 快速开始

```sh
# 看 demo（任意静态服务器）
pnpm demo        # python3 -m http.server 4789
open http://localhost:4789/demo/

# 部署：把 demo/ 构建成自包含静态站点（CSS 内联、共享件展开、示例代码内嵌）
pnpm build:demo  # 输出 dist/ 整棵目录，丢到任意静态托管/主页即可

# 在项目里用
<link rel="stylesheet" href="corn-tokens.css">
<link rel="stylesheet" href="corn.css">
```

## 设计来源

色板提炼自 CornStudio `Theme.swift`（Hull）与玉米 AI 官网 `styles.css`，双端统一为同一组 token。SwiftUI 端按 `tokens.json` 映射（参考 `Hull` 枚举）。
