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
   `<!-- @example {"title": "…", "note": "…", "stage": "light|plain", "js": false} -->`
   - 只允许这四个键。**布局和深色包装必须写在示例源码里**：多个元素并排用 `<div class="corn-cluster">`，纵向用 `corn-stack`（表单类加 `corn-narrow`），网格用 `corn-grid`（可写 `style="--corn-min: 240px"`），深色变体整体包进 `<section class="corn-dark corn-block">`。舞台只负责留白，这样复制出去的代码和站内看到的完全一致。旧的 `layout` 键和 `stage: "dark"` 会让构建直接报错。
   - `stage: "plain"`：舞台不加底色和留白，适合示例自带表面（如深色区块）的情况。
   - `js: true` 表示这个示例的功能依赖 `corn.js`：本组件 `<name>.js` 的 `data-corn-*` 钩子、`core.js` 的通用钩子（如 `data-corn-dismiss`）、或内联脚本调用 `Corn.*`。此时“引入 / 整页”页签会带上 `corn.js`。`check.py` 会自动检查：示例里出现 `data-corn-*`、`Corn.` 或任一 `Corn.define` 选择器却没标 `js: true` 时报错。
3. 示例里可以写内联 `<script>`：它在页面上运行，也会原样出现在复制的代码里。同一组件下所有示例共享一个页面，所以 id 要加前缀，避免重复。
4. 运行 `python3 scripts/build.py && python3 scripts/check.py`，然后跑 `node tests/e2e/run.mjs`。新示例的代码按钮会自动纳入 `codePop` 套件，复制复现会自动纳入 `fidelity` 套件，组件页会自动纳入 `pages` 套件。如果组件有新的交互，再到 `tests/e2e/specs/components.mjs` 加对应断言。

构建会拦截以下错误：元数据缺失或 JSON 写错、group 未登记、缺少 `<name>.css`、没有示例、示例里出现 `{{`。
