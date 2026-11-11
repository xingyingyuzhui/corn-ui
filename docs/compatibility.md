# 兼容性与运行依赖

## 运行依赖

| 用途 | 需要 | 说明 |
| --- | --- | --- |
| 使用组件 | 现代浏览器 | 拷 `corn-tokens.css` + `corn.css`（交互再加 `corn.js`）即可，无框架、无构建 |
| 构建 / 静态检查 | Python ≥ 3.10 | 只用标准库。本地实跑过 3.13，CI 用 ubuntu-latest 自带版本；3.10 / 3.11 未单独实跑 |
| JS 语法检查 | Node（可选） | 缺 Node 时 `check.py` 跳过这一项 |
| 浏览器回归 | Node + Playwright（可选） | Playwright 不是项目依赖：从环境解析，或设置 `CORN_PLAYWRIGHT=/abs/path/node_modules/playwright` |

## 用到的较新特性及降级方式

| 特性 | 用在哪里 | 不支持时 |
| --- | --- | --- |
| `color-mix()` | 代码卡页眉分隔线、站点导航半透明底 | 分隔线 / 半透明效果消失，内容不受影响 |
| `:has()` | 选择控件禁用态整行变淡；示例卡展开代码时描边 | 少了整行变淡效果，控件本身的 disabled 样式仍在 |
| `interpolate-size`、`::details-content` | 折叠面板高度动画 | 直接展开、无动画 |
| `<details name>` 互斥 | FAQ 示例一次只开一个 | 可以同时展开多个 |
| `ResizeObserver` | tabs / segmented 指示块测量 | 退回到 window resize；选中项在测量前保持原生填充样式，始终可见 |
| `text-wrap: balance` | 标题换行 | 普通换行 |
| `<dialog>.showModal()` | 对话框 | 控制台警告，不打开 |

## 实际验证范围（截至本轮）

- **已测**：Chromium headless（Playwright 1.63）。覆盖桌面宽度 1280 / 1440 的全部页面、代码浮层、复制复现、组件键盘路径、浅色 / 深色对比度、减少动效（系统偏好 + 站内开关），以及 **模拟的** forced-colors（Windows 高对比度）下 radio、switch、segmented 的选中态。
- **未测**：Safari、Firefox、真实 Windows 高对比度、读屏器（NVDA / VoiceOver）、移动设备与窄屏。
- forced-colors 下，不确定进度条在“减少动效”时只显示轨道，没有移动段；spinner 只有完整圆环，没有缺口弧线。状态仍由 `aria-busy` / `role=status` 表达。
