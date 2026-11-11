# 架构

## 职责划分

| 层 | 位置 | 手写 / 生成 | 职责 |
| --- | --- | --- | --- |
| Token 源 | `packages/tokens/tokens.json` | 手写 | 原始色、字体、圆角、间距、动效，以及 `theme.light` / `theme.dark` 两套语义变量 |
| Token CSS | `packages/tokens/corn-tokens.css` | **生成** | `:root` 写原始值和浅色语义；`.corn-dark` / `[data-corn-theme=dark]` 改写语义变量 |
| 基础层 | `packages/ui/src/{base,motion,utilities}.css` | 手写 | 字体排版、焦点、链接、动效变量与减少动效开关、布局工具 |
| 运行时 | `packages/ui/src/core.js` | 手写 | `Corn.define/init` 钩子注册、`afterAnimation`、`emit`、通用关闭 |
| 组件 | `packages/ui/components/<name>/` | 手写 | 一个组件一个目录，详见 adding-a-component.md |
| 分发包 | `packages/ui/corn.css`、`corn.js` | **生成** | 按 `groups.json` 的顺序拼接 src 和各组件文件 |
| 站点 | `demo/` | 手写 | 布局、局部模板、页面、场景、站点专用 CSS/JS（不进组件层） |
| 构建 | `scripts/corn_build/` | 手写 | `tokens` → `registry` → `bundle` → `templating` / `directives` / `specimen` → `site` |
| 校验 | `scripts/corn_check/`、`tests/e2e/` | 手写 | 见下文“防线” |

生成文件也提交在仓库里，这样使用者不用跑构建就能直接拷走；但它们不能手改。`check.py` 会核对生成文件与源文件是否一致，不一致就报错。

## 关键决策

- **组件只读语义变量**，例如 `--corn-fg`、`--corn-surface`、`--corn-control-border`。深色主题只需改写语义层，组件代码不写任何深色特例。上一版的 `.corn-dark` 只重映射了 4 个变量，导致 ghost 按钮、图标按钮、箭头链接、空状态、panel、well 在深色区块里看不见，根因就在这里。
- **别名在每个主题块里重新声明**。`var()` 在声明它的元素上就被解析，只写在 `:root` 的别名会把浅色值固定住，深色区块里也拿到浅色。
- **同源示例**。`examples/*.html` 在页面上原样插入一次，作为运行中的示例；再转义后放进 `<template>` 一次。代码浮层读取模板的 textContent，所以复制到的代码就是正在运行的那份文件。
- **动效全部经过变量**：`--corn-dur*`、`--corn-lift*`、`--corn-loop`。减少动效只需改这几个变量，组件不需要单独适配。
- **border-box 只在 `.corn-root` / `.corn-body` 内生效**，`.corn-shell` 和输入控件自己也显式声明。这样拷进别的项目不会改动对方的布局。
- **依赖**：构建与静态检查只用 Python 标准库；e2e 使用环境里已有的 Playwright，不写进 package.json。

## 防线

CI（`deploy.yml`）的顺序是：`build.py --check` → `build.py` → `check.py`。第一步必须在构建之前：构建会重写 `corn.css` 等生成文件，放在后面就永远发现不了“提交的生成物已过期”。

`python3 scripts/check.py` 检查以下内容：

- 生成文件是否最新；workflow 中 `build.py --check` 是否排在 build 之前。
- token 引用是否都存在，light/dark 两套语义的键是否一致。
- 74 组语义前景/背景对比度，两种主题都查，包含 hover / 键盘聚焦行的 `surface-hover` 背景：文本 ≥ 4.5，控件边框和焦点 ≥ 3。
- 组件 CSS 中不允许出现颜色字面量。
- 所有 CSS 的注释和花括号是否配平（防止生成头注释里的 `*/` 提前结束注释、吞掉后面的规则）。
- 示例 hygiene：行内 style 只允许写自定义属性；同一页面内 id 不重复；ARIA 和 for 引用都能找到目标；用到 `data-corn-*`、`Corn.*` 或任何 `Corn.define` 选择器（如 `.corn-tooltip`）的示例必须标 `"js": true`，否则“引入 / 整页”会漏掉 `corn.js`。
- 手写文件体积门槛：默认 300 行 / 16 KB，覆盖组件、demo、脚本、测试、文档和仓库配置（含 `groups.json`、各 `package.json`、workflow），例外必须在 `scripts/size-budget.json` 写明原因。
- 所有 JS 通过 `node --check`。
- dist 中的本地链接都能解析，且没有遗留模板标记。

`node tests/e2e/run.mjs` 跑浏览器回归，套件如下：

- `pages`：每页都检查控制台错误、4xx、横向溢出（1280 / 1440）、模板是否存在。
- `codePop`：每个“代码”按钮都检查键盘打开、各 tab 内容与模板一致、剪贴板内容精确一致、浮层在视口内、Esc 关闭后焦点回到按钮、点外部关闭。
- `components`：交互组件的键盘路径。
- `theme`：全部 18 个组件页在浅色和深色下逐元素计算文字对比度（正文 ≥ 4.5，大字 ≥ 3）。
- `motion`：减少动效（系统设置 + 站内开关）以及主题开关。
- `fidelity`：每个示例按两种用户路径独立打开——“整页”页签原样打开，以及“引入”骨架里粘入 HTML 页签——与站内渲染比较正文字体、两层行结构、内容背后的底色，并要求控制台无问题。
- `regressions`：第二轮审查发现的每个缺陷各一条，均已确认在 8ccd195 上失败：`hidden` 显隐、两个场景流程、对话框内初始化的 tabs / segmented、嵌套 tabs、toast live region 预创建、菜单聚焦态对比度（双主题）、入场延迟上限、代码浮层的焦点 / tabpanel / 依赖说明 / 锚点滚走即关闭、全站标题层级、指标读屏终值、forced-colors 下选中态（Chromium 模拟）、减少动效下 toast 计时条与悬停暂停及走势线。
