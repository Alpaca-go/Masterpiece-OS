# Spatial Intent Presets Playground

Phase v1.0 Design Intent Controller 的可视化页面。
text-level only,无 Provider 调用,无 production UI 改动。

## 目的

让用户在浏览器里查看 4 个 Spatial Intent Preset(`brand_driven` / `architecture_driven` / `reference_driven` / `balanced`)的差异,以及它们在 5 个 brand DNA 上的实际效果。

不接 production 生图 UI(per 用户 2026-08-02 决定)。

## 跑法

```bash
# 在根目录
npm run dev:spatial-intent-presets-playground
```

打开 http://127.0.0.1:5275

## 端口

- 默认 5275(避免跟其他 dev server 冲突)
- 覆盖: `SPATIAL_INTENT_PRESETS_PLAYGROUND_PORT=8080 npm run dev:spatial-intent-presets-playground`

## 页面布局

| 区域 | 作用 |
| --- | --- |
| 1. Brand | 5 个 brand DNA 选择(九州美学 / 冯烫烫 / 一剂良方 / 蛙耶 / 锦绣) |
| 2. Spatial Intent Preset | 4 个 preset 按钮(品牌驱动 / 建筑驱动 / 参考驱动 / 均衡) |
| 3. Intent (4 维) | 当前 preset 的 4 维 intent expression(brandExpression / architectureExpression / referenceInfluence / industryConstraint) |
| 4. Runtime Tendency | 当前 preset 的 enhance / maintain / balance / learn / forbiddenCopy 列表 |
| Preset Emphasis Block | 当前 preset 生成的 markdown emphasis block(完整 prompt 文本) |
| Full compileSpaceRuntime Prompt | 完整 prompt(17 blocks),点击 block id 展开/折叠 |
| 4-Preset 对比 (同 brand) | 同一 brand 4 preset 的差异 + vs balanced preset 的 byte-equal 检查 |

## API

- `GET /api/presets` — 4 preset details
- `GET /api/brands` — 5 brand DNA summary
- `GET /api/preset-block?brand=<key>&preset=<p>` — 单个 preset emphasis block
- `GET /api/compile?brand=<key>&preset=<p>` — 完整 compileSpaceRuntime prompt

## 约束

- 不接 production UI(用户 2026-08-02 决定)
- 不调真实 Provider
- 不修改 baseline 行为
- 不污染生产代码(`apps/cli` / `apps/desktop` / `packages` 不动)
- 5.0 verify gates 全过(workspace-boundaries / no-obsolete-code / production-boundaries / no-project-specific-production-rules / golden-boundary / current-flows)

## 文件

- `playground/server.mjs` — Node.js static server + REST API
- `playground/index.html` — 入口 HTML
- `playground/main.mjs` — 浏览器侧 JS
- `playground/style.css` — 样式
- `playground/.gitignore` — placeholder for future image/smoke artifacts
