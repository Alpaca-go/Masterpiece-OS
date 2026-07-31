# Migration Plan — repository-slimming-v2

按《项目精简与实验功能隔离开发文档 v2.0》执行，Phase 0–6。每阶段独立提交。

## 与文档的已确认偏差

1. **`style-carrier-ranking.ts` / `task-reference-selection.ts` 不删除**（文档 6.4 列入删除）：静态分析证实二者经 `asset-selection-protocol` 被生产 `pipeline-service` 使用。删除会破坏正式视觉分析。保留在裁剪后的 `reference-first/protocol/`。
2. **`src/v5` 生产引擎保留在原位**（文档 §2 结构图中无 src/）：`bootstrap.js` + creative-director/preparation/telemetry/config + 4 个根工具文件是正式视觉分析引擎，本轮不迁移目录（迁移到 packages 的只有 adapters/response-parser/document-preparation 等通用层），避免高风险大搬迁。文档核心诉求（删除多代实现、Labs 隔离、门禁）不受影响。
3. **Labs 用 JS 而非 TS**：迁移的 71+7 个源文件均为 ESM JS，Lab 保持 .js（重写为 TS 风险高、无收益）。README/CLI/tests 按文档要求配齐。

## Phase 1 — packages（提交：`refactor: extract shared production packages`）

| 包 | 内容来源 | 消费方 |
|---|---|---|
| packages/model-runtime | qwen-reasoner、openai-compatible-text-reasoner、model-capabilities、response-parser | pipeline-service、document-context-service、v5 bootstrap、Labs |
| packages/document-ingestion | document-preparation | document-context-service、Lab A |
| packages/runtime-core | checkpoint-store、runtime-contracts | Lab A（生产 runtime/ 已有独立实现，不动） |
| packages/project-contracts | 正式共享类型（从 desktop shared 类型中提取） | desktop |
| packages/reference-asset-inspector | apps/desktop/src/main/reference-asset-inspector.ts 的核心检查逻辑 | reference-anchor、Lab B |

原 `src/v5/adapters/*`、`src/v5/shared/analysis/*` 改为 re-export packages（过渡），Phase 4 删除遗留后 desktop 直接 import packages。

## Phase 2 — Labs（提交：`feat(labs): preserve experimental document and reference workflows`）

- Lab A `labs/document-visual-directions`：复制 71 文件闭包，v1 依赖折叠为 `src/legacy-schemas/`；CLI `bin/run.mjs`；输出 `.lab-data/document-visual-directions/`；fixtures 用 jiuzhou-meixue v2-directions.json；tests 迁移关键 v2 测试子集
- Lab B `labs/reference-style-conversion`：复制 7 文件；CLI `bin/run.mjs`；输出 `.lab-data/reference-style-conversion/`；tests 迁 reference-translation.test.js
- 根 scripts 增加 `lab:document-directions`、`lab:reference-conversion`

## Phase 3 — Desktop 切断（提交：`refactor(desktop): remove legacy and lab workflows from production`）

1. `deriveVisualTranslationProjectName` 搬入 document-context-service（或独立 helper）
2. index.ts 删 242–260、305–309、375–390 及 service 实例化；preload 删两个 API 块；删 LegacyHistoryWorkspace 及 App.tsx 引用
3. 删 7 个遗留 main 文件 + 2 个死 Workspace + 对应 desktop 测试
4. reference-first/index.ts 裁剪为仅 5 个 protocol re-export；删 21 个遗留文件及其测试
5. `npm --prefix apps/desktop run typecheck` + desktop test 通过

## Phase 4 — 物理删除（提交：`remove: delete migrated legacy pipelines and obsolete tests`）

- `src/v5/visual-translation/`（v1+v2 整树）、`src/reference-translation/`
- v4：`src/v4-bootstrap.js`、`src/analysis.js`、`src/pipeline.js`、根 `adapters/ orchestrators/ reviews/ validators/ storage/ metrics/`、`bin/`、`src/cli.js`、`run-visual-analysis.mjs` 及 v4-era 根 src 支撑文件（以反向引用分析为准，保留生产闭包 19 文件）
- 遗留测试 / fixtures / snapshots / 12 个遗留脚本

## Phase 5 — 脚本与类型（提交：`chore: clean scripts tests and type boundaries`）

- 根 scripts 收敛为文档 §10-Phase5 集合；`verify:document-flows` 重写为 `verify:current-flows`
- desktop package.json 清理 verify:reference-first-protocol 等遗留脚本

## Phase 6 — 门禁（提交：`chore: enforce obsolete-code and production-boundary gates`）

- `scripts/verify-no-obsolete-code.mjs`：扫描禁止关键字（文档 §10-Phase6 列表，扣除偏差 1 的两个保留文件名）
- `scripts/verify-production-boundaries.mjs`：desktop 不 import labs/、打包配置不含 labs、preload 无遗留 API
- 全量验证 + portable 打包 + `docs/development/repository/cleanup/repository-slimming-v2-validation.md`

## 风险与回滚

- 每 Phase 一个提交，出问题 `git revert` 单提交回滚
- 门禁 `verify:current-flows` 全程离线
- AGENTS.md 要求：改动 provider/schema/report 相关后打包前需真实 provider 冒烟——本轮不改分析 prompt 与 provider 请求形状，仅移动文件与删除遗留；若 typecheck/测试全绿且 import 路径等价，视为无行为变更
