# Lab: reference-style-conversion

实验性「参考风格转译」能力（原 `src/reference-translation`）：从视觉分析结果与项目上下文合成参考视觉 DNA、可迁移性分类与项目转译矩阵。

## 状态

- **实验功能**：不进入正式产品（Electron UI / IPC / 构建 / 打包）。
- 入口：`src/run-reference-translation.js` 的 `runReferenceTranslation({ visualAnalysisPath, projectContextPath, outputPath, preference, force, now })`。
- 零外部依赖（仅 node 内置模块），不依赖根 `packages/`。

## 运行

```bash
# 根目录执行
npm run lab:reference-conversion -- \
  --visual-analysis <visual-analysis.json> \
  --project-context <project-context.json> \
  --output <profile.json> [--preference <text>] [--force]
```

## 测试

```bash
node --test labs/reference-style-conversion/tests/*.test.js
```
