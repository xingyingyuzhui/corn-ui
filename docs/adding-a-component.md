# 新增组件

只需要新建一个目录，不用改构建脚本、导航、索引页或打包配置。

```
packages/ui/components/<name>/
  component.json      {"title", "summary", "group", "order", "rules": [...], "usage"}
  <name>.css          样式：只能用 token 变量（check.py 会拦截颜色字面量）
  <name>.js           可选：Corn.define('<name>', '<selector>', setup)
  examples/01-xxx.html
```

1. `group` 必须是 `packages/ui/components/groups.json` 里已有的键。分组之间的先后由该文件决定，组内顺序由 `order` 决定。
2. 每个示例文件的第一行必须是元数据注释：
   `<!-- @example {"title": "…", "note": "…", "stage": "light|dark|plain", "layout": "row|stack|grid|center|wide", "js": false} -->`
   - `stage: "dark"` 会把示例放进 `.corn-dark` 舞台。
   - `js: true` 表示这个示例的功能依赖 `corn.js`：本组件 `<name>.js` 的 `data-corn-*` 钩子、`core.js` 的通用钩子（如 `data-corn-dismiss`）、或内联脚本调用 `Corn.*`。此时“引入”页签会带上 `corn.js`；纯 CSS 示例和自包含内联脚本不用标。
3. 示例里可以写内联 `<script>`：它在页面上运行，也会原样出现在复制的代码里。同一组件下所有示例共享一个页面，所以 id 要加前缀，避免重复。
4. 运行 `python3 scripts/build.py && python3 scripts/check.py`，然后跑 `node tests/e2e/run.mjs`。新示例的代码按钮会自动纳入 `codePop` 套件，组件页会自动纳入 `pages` 套件。如果组件有新的交互，再到 `tests/e2e/specs/components.mjs` 加对应断言。

构建会拦截以下错误：元数据缺失或 JSON 写错、group 未登记、缺少 `<name>.css`、没有示例、示例里出现 `{{`。
