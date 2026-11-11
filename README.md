# Corn UI

玉米设计语言体系：一套有识别性的设计语言 + 配套工具。

- **设计语言**：纸田青釉底色、墨绿近黑文字、玉米黄点缀；宋体标题、黑体正文、等宽数据。
- **Token**：`packages/tokens/tokens.json` 是唯一来源，包括原始色和浅/深两套语义变量；`corn-tokens.css` 由它生成。
- **组件层**：18 个组件，纯 CSS（`corn.css`）。标签页、菜单、对话框、通知等交互放在可选的 `corn.js`（约 17 KB 未压缩，无依赖）。
- **AI 设计 Skill**：`SKILL.md` + `references/`，是给 agent 用的方法论与规范。

## 快速开始

```sh
pnpm preview      # 构建并在 http://127.0.0.1:4789/ 预览（等价：python3 scripts/build.py && python3 -m http.server 4789 --bind 127.0.0.1 --directory dist）
pnpm build        # 重新生成 corn-tokens.css / corn.css / corn.js 和 dist/ 站点
pnpm check        # 静态检查：生成物是否最新、对比度、颜色只用 token、文件体积门槛、链接
pnpm test:e2e     # 浏览器回归（需要环境里有 Playwright；见 tests/e2e/run.mjs）
```

只需要 Python ≥ 3.10。Node 只用于可选的 JS 语法检查和 e2e。

> 别直接打开 `demo/` 下的源文件：那是模板，必须先构建。预览请看 `dist/`。

## 在项目里用

```html
<link rel="stylesheet" href="corn-tokens.css">
<link rel="stylesheet" href="corn.css">
<script src="corn.js" defer></script>   <!-- 可选：交互组件 -->

<body class="corn-body">                 <!-- 或局部 .corn-root -->
  <button class="corn-btn corn-btn-maize">保存</button>
</body>
```

- 切深色：整页用 `<html data-corn-theme="dark">`，局部用 `.corn-dark`。
- 减少动效：跟随系统设置，也可以手动设 `<html data-corn-motion="reduce">`。
- 每个组件的示例和可复制代码见站点“组件”页，示例右上角有“代码”按钮：
  - **HTML**：示例源文件本身（布局容器、深色包装都在里面）。
  - **CSS / JS**：组件源码，已包含在 `corn.css` / `corn.js` 中，仅供阅读和改造；单独粘贴不完整。
  - **引入**：页面骨架（含 `class="corn-body"`），把 HTML 粘到标注处即可。
  - **整页**：骨架加上该示例的完整页面，另存为 `.html` 并与三个文件放在同一目录即可打开。
- 组件元素上可以直接用 `hidden` 属性切换显隐（`corn.css` 已保证它压过组件自身的 `display`）。

## 结构

```
packages/tokens/tokens.json          token 源（手写）
packages/tokens/corn-tokens.css      生成
packages/ui/src/                     base / motion / utilities / core.js（手写）
packages/ui/components/<name>/       每个组件一个目录：<name>.css、可选 <name>.js、component.json、examples/*.html
packages/ui/corn.css, corn.js        生成的分发包
demo/                                站点模板：layouts / partials / pages / patterns / assets
scripts/build.py, scripts/check.py   构建与校验（标准库）
scripts/size-budget.json             手写文件体积门槛（300 行 / 16 KB）
tests/e2e/                           浏览器回归
dist/                                构建产物（gitignore），部署即拷贝此目录
```

架构说明见 [docs/architecture.md](docs/architecture.md)，新增组件见 [docs/adding-a-component.md](docs/adding-a-component.md)。

## 已知限制

- **移动宽度未专项适配**：基础盒模型已修，但 docs 侧栏与首页 hero 双栏在窄屏会拥挤。
- **浏览器覆盖**：e2e 只跑 Chromium（headless）；Safari / Firefox、读屏器、真实 Windows 高对比度未测。详见 [docs/compatibility.md](docs/compatibility.md)。
- **折叠面板高度动画**依赖 `interpolate-size`（Chromium 131+）；其他浏览器直接展开，无动画。
- **CI 不跑 e2e**：Playwright 不是项目依赖；`deploy.yml` 依次执行 `build.py --check`（拦截提交的生成物过期）、build、`check.py`。
- **tooltip / menu 无碰撞检测与自动翻转**（tooltip 可手动 `data-placement="bottom"`）。
- **代码高亮**是最小实现，只区分注释、标签、属性、字符串、关键字。

## 设计来源

色板提炼自 CornStudio `Theme.swift`（Hull）与玉米 AI 官网 `styles.css`，两端统一为同一组 token。SwiftUI 端按 `tokens.json` 映射（参考 `Hull` 枚举）。
