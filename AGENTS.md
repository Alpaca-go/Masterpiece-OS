# Masterpiece-OS development rules

> 给 AI coding agent 和开发者阅读的工程现实说明。
> 文档结构与产品定位以 `5.0.0-rc.1` 为准；`3.3` / `V18` / `vnext` /
> `V6` 阶段名称在用户可见文案中已不再使用。

## 工作区起点

- 修改 Masterpiece 核心链路前，所有 Agent 必须先阅读根目录的
  `CURRENT_BASELINE.md` 与 `BASELINE_LOCK.md`。

- Node.js 20 或更高；`package.json` 是 workspaces 容器。
- 工作区：`apps/cli`（v5 引擎 + Prompt 模板）、`apps/desktop`（Electron +
  React 19 + TypeScript 7）、`packages/*`（14 个内部包，命名空间统一为
  `@masterpiece/*`）、`labs/*`（两个独立实验，**不**进入 Desktop UI/IPC/
  构建/打包）、`evaluation/*`（评估资产，与生产 Runtime 隔离）。
- 单一 Lockfile：根 `package-lock.json`；`apps/desktop/package-lock.json`
  不应存在。

## 版本与发布门禁

- 唯一产品版本源：`/VERSION`（当前 `5.0.0-rc.1`）。
- 同步脚本：`scripts/sync-product-version.mjs`（写入根 `package.json`、
  `apps/desktop/package.json`、`apps/cli/src/runtime-trace.js` 的
  `DEFAULT_APP_VERSION`）。
- 校验：`npm run verify:version-consistency`。
- 版本域与命名规则：`docs/development/versioning-policy.md`；活跃代码不得新增
  `V5` / `V6` / `V18` / `vnext` 阶段式版本常量，校验命令为
  `npm run verify:version-naming`。

## 包边界

- 内部包统一命名空间 `@masterpiece/*`；每个包 `{ "private": true, "version": "0.0.0" }`。
- 包对外导出使用 `"./..."` 子路径，并补 `"./*": "./src/*"` 通配导出；
  TypeScript 导入使用 `'./*.ts'` 后缀（与 `allowImportingTsExtensions: true`
  对齐）。
- **禁止**生产代码深层 import `packages/*/src/*`；`verify:workspace-boundaries`
  会硬 FAIL。

## 产品路径

- Desktop 正式 UI 唯一保留 **Short-Chain** 视觉生成路径。
- 不再分支到 Legacy `CreativeSessionWorkspace` / vNext 选项卡。
- `vnext` / `V18` / `V6` 名称在用户可见文案中已全部清理。

## 评估资产隔离

- `evaluation/golden-cases/`、`anti-cases/`、`hidden-cases/`、
  `known-cases/`、`contracts/`、`reports/` 与生产 Runtime 严格隔离。
- `verify:golden-boundary` 是发布硬门禁，**禁止**生产代码 import
  上述目录中的任何模块。

## 验证命令（发布前必跑）

```bash
# 离线闸门（不调用真实 Provider）
npm run verify:version-consistency
npm run verify:version-naming
npm run verify:workspace-boundaries
npm run verify:no-obsolete-code
npm run verify:production-boundaries
npm run verify:no-project-specific-production-rules
npm run verify:golden-boundary
npm run verify:current-flows    # 含 apps/desktop typecheck

# 测试
npm test                         # 根 + Desktop 公共契约（node --test）
npm run cli:test                 # apps/cli 自身测试
npm run desktop:test             # apps/desktop 单元测试
npm run desktop:build            # typecheck + electron-vite build
```

## Document-related release gate

After changing document ingestion, structured analysis, checkpoint,
report compiler, or Desktop document-delivery code, run
`npm run verify:current-flows` before declaring the work complete.

Do not package or deliver a Desktop executable when this gate fails.
The gate must remain offline and must never call a real model API.

Before delivering a new Desktop executable after changing analysis
prompts, provider request shapes, schema validation, retries,
checkpoints, or report generation, also run one user-authorized
real-provider end-to-end smoke test with a representative local
document. A launch-only smoke test or mocked response is not
sufficient. Record the provider/model, terminal status, model-call
count, duration, report path, and composition result without exposing
credentials. Do not commit or deliver the executable unless the real
run reaches the final report successfully.

## Real-Provider smoke procedure

The 5.0.0 cut gates on three user-authorized runs (env-vars only,
no secret committed). Procedure lives in
`docs/releases/5.0-repository-consolidation.md §7.3`. Minimum set:

| Field | Value |
|---|---|
| Provider | e.g. `qwen` |
| Model | e.g. `qwen3.6-plus` |
| Run 1 | visual analysis (offline sample project) |
| Run 2 | image generation (spatial / non-medical) |
| Run 3 | image generation (non-medical project) |
| Random retries | 0 |

## 仓库污染物红线

- **不要**把 `node_modules/`、`coverage/`、`.runtime/`、`.codex-smoke/`
  等已 gitignore 路径重新 tracked。
- **不要**提交含 API Key / Provider 原始响应的运行产物。
- **不要**提交 `.codex-smoke/electron-polluted-backup/app.asar` 一类大
  二进制（已在 `e85c46d` 解除追踪，但磁盘数据保留供本地 replay）。
- **不要**恢复 `experiment/pre-overfitting-baseline` 到生产主线；它只
  作为只读 Benchmark 存在（`pre-overfitting-baseline-v1` tag + 后续
  `archive/pre-overfitting-baseline-20260731` tag）。
- **不要**整分支 merge `feature/reference-led-visual-direction` /
  `feature/reference-asset-selection-protocol`（已判定为 archive-only）；
  只 cherry-pick 单独有价值的 commit。

## Branch discipline

- 长期分支只保留 `main`；其它特性以 `feat/*` / `fix/*` / `chore/*` /
  `experiment/*` 短期分支运作。
- 分支治理决策表：`docs/development/repository/reference-branch-disposition.md`。
- 完成报告：`docs/releases/5.0-repository-consolidation.md`。
