# Legacy Import Graph — repository-slimming-v2

基于 `b8bea75`（tag: `archive/pre-repository-slimming-v2`）的静态导入分析。

## 1. Desktop 生产依赖（必须保留）

```text
apps/desktop/src/main/pipeline-service.ts
  ├─ src/v5/adapters/qwen-reasoner.js                （静态 import，零内部依赖）
  ├─ src/v5/shared/analysis/response-parser.js       （静态 import，零内部依赖）
  └─ src/v5/bootstrap.js                             （运行时动态 import runV5Pipeline）
       ├─ src/v5/config/{defaults,schema}.js
       ├─ src/v5/creative-director/{deep-creative-director,output-writer,prompt-builder,session-guard}.js
       ├─ src/v5/preparation/{benchmark-preparation,reasoning-cache,visual-preparation}.js
       ├─ src/v5/telemetry/run-logger.js
       └─ src/{inventory,parsers,runtime-trace,utils}.js   ← 根 src 工具，同为生产依赖

apps/desktop/src/main/document-context-service.ts
  ├─ src/v5/adapters/openai-compatible-text-reasoner.js （零内部依赖）
  ├─ src/v5/shared/analysis/document-preparation.js     （零内部依赖，仅用 node 内置 + sharp）
  └─ visual-translation-service.ts 的 deriveVisualTranslationProjectName（helper，需搬出后再删旧 service）

apps/desktop/src/main/pipeline-service.ts
  └─ asset-selection-protocol/index.ts
       └─ reference-first/index.ts（barrel）
            ├─ protocol/reference-master-set.ts
            ├─ protocol/style-carrier-ranking.ts      ← 文档 6.4 要求删除，实际生产在用（保留，偏差记录）
            ├─ protocol/reference-identity-filter.ts
            ├─ protocol/task-reference-selection.ts   ← 同上（保留，偏差记录）
            └─ protocol/graphic-reconstruction.ts
```

生产闭包合计：19 个 src/ 文件 + reference-first 6 个文件。

## 2. Lab A：visual-translation v2 管线闭包（71 文件）

入口 `src/v5/visual-translation/v2/runtime/run-visual-translation-v2.js`：

- `v2/` 自身 56 文件（config×3、prompts×1、report×1、retrieval-first×1、runtime×34、schemas×2、visual-fact-first×14）
- 跨子树依赖：
  - `src/v5/shared/analysis/{checkpoint-store,document-preparation,response-parser,runtime-contracts}.js`
  - `src/v5/adapters/model-capabilities.js`
  - `src/v5/visual-translation/v1/` 10 文件（prompts×2、protocol/stage-registry、runtime/visual-translation-checkpoint-store、schemas×6）——迁 Lab 时折叠进 Lab 内部
- **不**依赖 creative-director / preparation / telemetry / bootstrap（与生产引擎完全解耦，可安全分离）

未进入闭包而将被删除的 v2 文件：freeze-test×3、ab-runner、run-step4-stable 等 A/B 专属（文档 4.1 明确不保留）。

## 3. Lab B：reference-translation 闭包（7 文件）

完全自包含，仅依赖 node:crypto / node:fs/promises / node:path。零 src/v5、零 adapters、零根 src 依赖。

## 4. v4 引擎（纯删除）

```text
bin/masterpiece-os.js → src/cli.js → src/v4-bootstrap.js → src/{analysis,pipeline}.js
                                   → adapters/ orchestrators/ reviews/ validators/ storage/ metrics/（根目录）
```
Desktop 无任何路径到达 v4。仅根 CLI 与旧根测试引用。

## 5. Desktop 遗留接线

- `main/index.ts`：242–260 `visual-translation:*` IPC；305–309 `reference-translation:*` IPC；375–390 `--visual-translation-smoke-*` CLI 标志
- `preload/index.ts`：50–64 visualTranslation API；90–106 referenceTranslation API
- renderer：`VisualTranslationWorkspace.tsx`、`ReferenceTranslationWorkspace.tsx` 无人 import（死代码）；`LegacyHistoryWorkspace.tsx` 被 App.tsx 使用但只调用两个遗留 API → 与遗留 IPC 一起删除
- 遗留-only main 文件：`visual-translation-service.ts`、`reference-translation-service.ts`、`reference-translation-report.ts`、`reference-style-reconstruction.ts`、`reference-reconstruction-prompts.ts`、`reference-first-beta-closure.ts`、`reference-first-reconstruction.ts`

## 6. 门禁与脚本风险

`scripts/verify-document-flows.mjs`（离线门禁）当前执行：
1. `tests/v5/visual-translation-v1.test.js`（遗留 V1）
2. `tests/v5/visual-fact-first-pipeline.test.js`（遗留 V2）
3. `apps/desktop/tests/visual-translation-document-processing.test.ts`（保留：测 document-processing.ts）+ `visual-translation-service.test.ts`（遗留）
4. `tsc --noEmit -p apps/desktop/tsconfig.json`（保留）

→ Phase 5 重写为 `verify:current-flows`：document-processing 测试 + 正式功能 desktop 测试 + typecheck + Labs 测试改由 lab 各自 npm test 覆盖。

## 7. 测试影响面

- 根 `npm test`（`node --test` 全递归）：约 22 个 tests/v5 遗留测试 + 根 v4 测试将随删除移除
- Desktop：`visual-translation-service`、`reference-translation-service`、`orphaned-run-reconciliation`、`architecture-boundary`（重写）、`reference-first-*`（readiness/validators 相关删除；`task-scoped-style-carrier`、`requested-task-coverage` 保留并适配）
