# Masterpiece-OS development rules

> Repository Contract 入口：修改 Current Production 前，先阅读
> `docs/repository/AGENT_REPOSITORY_RULES.md` 与
> `docs/repository/REPOSITORY_CONTRACT.md`。

> 给 AI coding agent 和开发者阅读的工程现实说明。
> 文档结构与产品定位以 `5.0.0-rc.1` 为准；`3.3` / `V18` / `vnext` /
> `V6` 阶段名称在用户可见文案中已不再使用。

## 工作区起点

- 修改 Masterpiece 核心链路前，所有 Agent 必须先阅读根目录的
  `CURRENT_BASELINE.md` 与 `BASELINE_LOCK.md`。

- Node.js 20 或更高；`package.json` 是 workspaces 容器。
- 工作区：`apps/cli`（分析引擎 + Prompt 模板）、`apps/web`（React 19 Web
  Renderer）、`apps/web-runtime`（Node Web Host）、`packages/*`（内部包
  命名空间统一为 `@masterpiece/*`）、`labs/*`（独立实验，**不**进入
  Web UI/Runtime/构建）、`evaluation/*`（评估资产，与生产 Runtime 隔离）。
- Desktop/Electron workspace 已在 S5 删除；不得重新引入。
- 单一 Lockfile：根 `package-lock.json`。

## 版本与发布门禁

- 唯一产品版本源：`/VERSION`（当前 `5.0.0-rc.1`）。
- 同步脚本：`scripts/sync-product-version.mjs`（写入根 `package.json` 与
  `apps/cli/src/runtime-trace.js` 的 `DEFAULT_APP_VERSION`）。
- 校验：`npm run verify:version-consistency`。
- 版本域与命名规则：`docs/development/versioning-policy.md`；活跃代码不得新增
  `V5` / `V6` / `V18` / `vnext` 阶段式版本常量，校验命令为
  `npm run verify:version-naming`。
- 历史阶段文档集中在 `docs/history/`，索引为 `docs/history/INDEX.md`；
  `docs/` 其他位置不得新增 `S4`、`P3`、`R10`、`M1`、`phase9` 这类编号路径，
  新文档使用语义名或日期名。校验：`npm run verify:history-naming`（已包含在
  `repo:verify`）。

## 包边界

- 内部包统一命名空间 `@masterpiece/*`；每个包 `{ "private": true, "version": "0.0.0" }`。
- 包对外导出使用 `"./..."` 子路径，并补 `"./*": "./src/*"` 通配导出；
  TypeScript 导入使用 `'./*.ts'` 后缀（与 `allowImportingTsExtensions: true`
  对齐）。
- **禁止**生产代码深层 import `packages/*/src/*`；`verify:workspace-boundaries`
  会硬 FAIL。

## 产品路径

- Web 正式 UI 唯一保留 **Short-Chain** 视觉生成路径。
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
npm run verify:history-naming
npm run verify:workspace-boundaries
npm run verify:no-obsolete-code
npm run verify:production-boundaries
npm run verify:no-project-specific-production-rules
npm run verify:golden-boundary
npm run verify:current-flows    # 含 Runtime + Node Host + Web typecheck

# 测试
npm test                         # 根公共契约（node --test）
npm run cli:test                 # apps/cli 自身测试
npm run runtime:test             # Shared Runtime 应用测试
npm run web-runtime:test         # Node Web Host 测试
npm run web:smoke                # 实际 Node Host + 浏览器 smoke
npm run web:build                # Web typecheck + Vite build
```

## Document-related release gate

After changing document ingestion, structured analysis, checkpoint,
report compiler, or Web document-delivery code, run
`npm run verify:current-flows` before declaring the work complete.

Do not publish a Web release when this gate fails.
The gate must remain offline and must never call a real model API.

Before publishing a release after changing analysis
prompts, provider request shapes, schema validation, retries,
checkpoints, or report generation, also run one user-authorized
real-provider end-to-end smoke test with a representative local
document. A launch-only smoke test or mocked response is not
sufficient. Record the provider/model, terminal status, model-call
count, duration, report path, and composition result without exposing
credentials. Do not publish the release unless the real
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

- origin 的默认分支是 `main`，发布线保持在 `main` 上。
- VM1 集成候选（CONDITIONAL PASS / NOT FROZEN）记录在
  `docs/runtime/visual-migration-vm1-integrated-baseline.md`，只作历史导航，
  不是新的产品冻结。
- 其它工作使用短期 `feat/*` / `fix/*` / `chore/*` / `experiment/*`
  分支，合并后删除；历史线用 tag 保留。
- 分支治理决策表：`docs/development/repository/reference-branch-disposition.md`。
- 完成报告：`docs/releases/5.0-repository-consolidation.md`。

## Shared Core boundaries

- New production code must use Shared Core boundaries.
- Do not reintroduce Desktop/Electron adapters.
- Do not add new direct imports to historical versioned implementations outside the owning Core module.

## 视觉工作流双向隔离（持续有效）

- 用户已明确要求：视觉分析与生图、创意策划、视觉迁移分别拥有业务实现；不得为了复用而重新合并。此约定适用于后续质量修复和功能开发。
- 修复“导入素材 → 视觉分析 → 查看报告 → 智能生图”时，只修改 `packages/visual-workflow/` 及 `apps/web/src/features/visual-workflow/` 中的业务实现。不得用修改策划/迁移所用的共享 Prompt、Compiler、Provider Adapter 来修复此功能。
- 开发创意策划或视觉迁移时，不得导入、转导出、同步或直接调用独立工作流的代码、提示词、配置与数据。不得顺带更新其 `implementation-integrity.json`。
- 独立配置与项目迁入只允许用户主动触发的一次性复制；禁止后台同步、共享存储、隐式回退到全局设置。
- 公共宿主、路由、传输层、样式基础设施、依赖及根 lockfile 仍可能影响多个功能。此类变更必须明确列出影响范围，并运行所有受影响功能的回归；不能仅凭独立模块的哈希未变就判定质量不受影响。
- 每次完成上述功能的修改前运行 `npm run repo:verify`（含双向隔离检查及其反例测试）。行为变化还须运行相关完整回归与 Golden；不得自动刷新 Prompt/Golden/完整性记录以消除失败。
- 当前完整性记录只证明拆分内容，**不是质量验收**。待用户确认生图质量恢复后，再单独记录经确认的代码/提示词摘要、模型及参数、代表素材与结果、验收结论；后续变更不得覆盖该验收记录来冒充通过。
