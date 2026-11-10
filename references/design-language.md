# Corn UI 设计语言规范

> 单一来源：`packages/tokens/corn-tokens.css` 与 `tokens.json`。本文档解释用法与边界，不重复定义值。

## 色彩

### 层级规则

- **纸面阶梯**：`void → paper → panel → paper-3` 由浅入深，背景用 `void`/`paper`，面板用 `panel`，更深的纸面只用于需要沉下去的区域。`raised` 只给浮起元素（popover、hover 卡片、输入框底）。
- **墨绿阶梯**：`ink → ink-2 → ink-3` 既是文字也是深色表面。整块的深色区块（hero、页脚、代码区）用 `ink` 做底，内部层级靠 `ink-2`/`ink-3` 推进，不引入新的深色。
- **玉米黄 `maize` 是唯一的强点缀**：eyebrow 方块、selection、卡片 hover 描边、关键高亮按钮、focus 外描边（浅底用 `maize-deep`）。一页里 maize 出现次数要少——它负责"被记住"，铺多了就失效。
- **苞叶绿 `husk`/`sage`/`celadon`** 是辅助色：tag、状态点、次要图标、深色区块上的弱强调。
- **语义色**只有 `danger`（浅底）和 `alert`（深底警示/状态灯），不再加橙、蓝、紫。

### 禁止

- 不引入暖米/奶油/桃粉/橘棕的底色（除非是显式品牌色）。
- 不用纯黑 `#000` 和纯白 `#fff` 做大面积底：深底是 `ink`（带绿），亮底是 `raised`/`#fff` 仅用于 hover 末端。
- 不用彩色渐变做底；渐变只允许极低调的纸面内过渡。

## 字体

| 角色 | 字体 | 用途 |
| --- | --- | --- |
| 标题/引用/空状态标题 | serif（宋体系） | `corn-h1/h2/h3`，`corn-empty-title` |
| 正文/控件/标签 | sans（黑体系） | 默认字 |
| 数据/时间戳/eyebrow/标签 | mono | `corn-mono`、`corn-eyebrow`、`corn-tag`、`corn-label` |

- 标题字重 600，letter-spacing 收紧到 0.01em 以内；正文 16px/1.7。
- `corn-eyebrow`：mono 11px + 0.16em 字距 + 全大写 + 前置 7px maize 方块——这是签名细节，页面区块级导航标记都该用它。
- 数字默认 `tabular-nums`（mono 类已带）。

## 形状与质感

- 圆角阶梯：`xs 2px`（tab/chip）→ `sm 3px`（按钮/输入）→ `md 4px`（默认卡片内件）→ `lg 9px`（大卡片）。不用全圆角 pill，不用 12px+ 的软圆角。
- 层次靠「面 + 线」不靠投影：边框 `line`/`line-strong`，阴影只有一档轻描边式 drop shadow。
- 签名交互：hover `translateY(-1~-2px)`；卡片 hover 出现 `maize` 描边光。
- 动效统一 `ease: cubic-bezier(.22,.61,.36,1)`，常规 0.2s、大位移 0.55s。不用弹性曲线。

## 深色区块

- `.corn-dark` 容器内 token 自动重映射（line/muted 切换为 inkline/ondark-muted）。
- 深色上文字 `paper`，次要文字 `ondark-muted`，强调仍是 `maize`，focus 描边切 `maize`。
- 深色区块用于打断长页面的节奏，一个页面一到两处即可。

## 跨端映射

- 端上用 `tokens.json` 重建等价枚举/常量（参考 CornStudio `Theme.swift` 的 `Hull`）。
- 保留语义命名（void/panel/ink/maize/husk），值可以按平台色彩空间微调（Display P3 vs sRGB），但色相关系不变。
