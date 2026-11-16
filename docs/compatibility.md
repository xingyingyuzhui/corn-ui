# 兼容性与运行依赖

## 运行依赖

| 用途 | 需要 | 说明 |
| --- | --- | --- |
| 使用组件 | 现代浏览器 | 拷 `corn-tokens.css` + `corn.css`（交互再加 `corn.js`）即可，无框架、无构建 |
| 构建 / 静态检查 | Python ≥ 3.10 | 只用标准库。本地实跑过 3.13，CI 用 ubuntu-latest 自带版本；3.10 / 3.11 未单独实跑 |
| JS 语法检查 | Node（可选） | 缺 Node 时 `check.py` 跳过这一项 |
| 浏览器回归 | Node + pnpm | Playwright 是固定开发依赖 `playwright@1.64.0`（仅测试用）；`CORN_BROWSER` 选引擎：chromium（默认）/ firefox / webkit |

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
| `<search>` 元素 | 组件目录筛选容器 | 语义退化为普通分组，筛选功能不受影响 |
| Popover + CSS anchor positioning | 菜单定位 | 支持 popover 但无锚定时由 JS 计算视口内位置（下→上翻转、限高内滚、随触发器跟随）；连 popover 都不支持时退回 `hidden` + 绝对定位 |
| `<dialog>` 焦点恢复 | 关闭对话框后焦点回到打开按钮 | 浏览器原生恢复时我们的显式 `focus()` 是无操作；不恢复的引擎（如 WebKit）由组件补上 |

## 实际验证范围（截至本轮）

- **已测**（Playwright 1.64.0，本地 headless）：
  - Chromium：全套件（pages / home / codePop / components / theme / motion / motionLab / fidelity / edges / regressions / workbench），桌面与窄屏 320 / 390 / 768。
  - Firefox、WebKit：edges / components / workbench 子集。菜单按实际特性检测选择定位分支；JS 回退路径另经强制降级（关闭 anchor 检测）单独测试。
- **未测**：正式发布版 Safari（Playwright WebKit 只是引擎级近似）、真实手机功耗与每秒帧成本、读屏器（NVDA / VoiceOver）、真实 Windows 高对比度（现有 forced-colors 断言是 Chromium 模拟）。
- forced-colors 下，不确定进度条在“减少动效”时只显示轨道，没有移动段；spinner 只有完整圆环，没有缺口弧线。状态仍由 `aria-busy` / `role=status` 表达。

## 待真机手工核对

以下项目无法在 headless 中伪造，需要真机走一遍：

- 手机（iOS / Android 各一）：首页玉米粒场景滚动的实际功耗与掉帧情况；toast 悬停暂停在触摸设备上的等价行为（点住 toast 应暂停）。
- VoiceOver（Mac + iOS）：菜单开关播报、对话框进出、toast live region 播报、组件目录筛选结果计数播报。
- Windows 高对比度实机：radio / switch / segmented 选中态，progress 与 spinner 的可见性。
- Safari 正式版：菜单实际走哪条定位分支（由特性检测决定）、对话框关闭后焦点回到触发按钮。
