# Lab: document-visual-directions

实验性「文档→视觉方向」生成能力（原 `src/v5/visual-translation` v1/v2，execution-oriented v2 协议 `visual-translation-v2-execution`）。

## 状态

- **实验功能**：不进入正式产品（Electron UI / IPC / 构建 / 打包）。
- 入口：`src/visual-translation/v2/runtime/run-visual-translation-v2.js` 的 `runVisualTranslationV2(input)`。
- 共享能力（模型适配、响应解析、checkpoint、契约校验、文档准备）来自根 `packages/`，经 `src/shared/`、`src/adapters/` 下的本地 re-export 引入。

## 运行

```bash
# 根目录执行
npm run lab:document-directions -- --input <input.json>
# 或
node labs/document-visual-directions/bin/run.mjs --input <input.json>
```

产物输出到仓库根 `.lab-data/document-visual-directions/`。

## 测试

```bash
node --test labs/document-visual-directions/tests/*.test.js
```

## fixtures 约定

- `fixtures/visual-direction-v2/jiuzhou-meixue/v2-directions.json`：v2.1 好集合（3 方向真实差异，整体 ready/allowed）。
- `v2-directions-homogeneous.json`：合法但同质退化的负面回归用例。
- 快照在 `snapshots/visual-direction-v2/`。
