# Masterpiece-OS 项目简报（用于团队讨论）

> **用途**：拿这份简报去另一个 chat 商量怎么搭一套合适的 agent 团队。
> **写于**：本地仓库 `codex/visual-migration-product-integration-p1`（HEAD `004290d3`），本机 Node v24.20.0 / npm 11.19.0 / Git 2.55.0 均可用。
> **作者立场**：下面**不**预判 agent 团队该怎么拆，只把项目事实摆出来。

---

## 目录

1. 一句话定位
2. 当前阶段与冻结基线
3. 仓库拓扑（生产面）
4. 架构与能力边界
5. 开发纪律（项目最硬的部分）
6. 已知活跃战线
7. 已知历史包袱
8. 用户工作流
9. 当前健康度
10. 按职能切片
11. 拿这份去 chat 时建议带的讨论点

---

## 1. 一句话定位

**Masterpiece-OS 5.0.0-rc.1** 是一个「以 Web Renderer + Node Web Host 为唯一生产运行时」的视觉分析 + Reference-First 受控生图系统。它把一个品牌/项目资料（图片 + 文字 Brief + 历史素材）跑成一条 6 阶段管道（Assets → Original Intent → Industry Benchmark → Creative Decision → Analysis → Creative Brief Compiler → Design Review），输出**单文件** `视觉方案升级报告.md`，并在需要时按 "Reference First" 或 "Continuation" 路线落到 Seedream 等生图 Provider 上做受控生图。

它**不是**一个数字版游戏模拟器、不是 SaaS、不是分布式系统、不是纯图像生成 SaaS；它是一个**离线可跑、契约可被审计、Golden 可被回归**的本地工程师级工具。

---

## 2. 当前阶段与冻结基线

- **产品版本**：`5.0.0-rc.1`（唯一来源 `/VERSION`，由 `scripts/sync-product-version.mjs` 同步到根 `package.json` 和 `apps/cli/src/runtime-trace.js`）。
- **冻结基线 tag**：`masterpiece-reference-first-stable-2026-08`（commit `deb1cba8b40b...`，Freeze Status = FROZEN）。P0 baseline-critical 路径（Visual Analysis / Reference First / Space Generator / Packaging / Provider）受 `BASELINE_LOCK.md` 保护，**任何修改前必须先跑 `scripts/audit/check-baseline-drift.mjs`**。
- **当前活跃主线（git log 最近 30 条）**：
  - `codex/visual-migration-product-integration-p1` → `p2` → `p2r`（2026-09-07~08，HEAD `bebac999`）
  - `codex/visual-migration-vm6-audit-corrective-retry`（2026-09-03，FROZEN）
  - `codex/visual-migration-vm5-generation-evidence-snapshot`（2026-09-03，FROZEN）
  - 往前：vm0-vm1-foundation / vm1-integration-freeze / vm2-canon / vm2.1-canon-purity-lifecycle / vm3-task-aware-reference-policy / vm4-capability-materialization / vm5 / vm6-audit-corrective-retry
- **最近一段 commit 主题**：「Visual Migration」是一连串基线冻结——把 Reference Policy、Capability 物质化、生图证据快照、双面 audit、纠正重试一层层冻成 baseline；现在进到 PI-1 / PI-2 / PI-2R 的「产品门面纵向切片 + 真实 Provider 验收」。`bebac999` 是最近的修复（参考品牌词去品牌化改写不再误杀锚定）。

---

## 3. 仓库拓扑（生产面）

```text
apps/
  web/                 ← Vite + React 19 渲染层，**唯一生产 UI**
  web-runtime/         ← Node 启动入口，local RPC (ws 4317)，凭据 & native ops
  cli/                 ← Visual Analysis 引擎 + prompt 模板（v5）
packages/  (15 个，命名空间统一为 @masterpiece/*，private:true, version:0.0.0)
  runtime-core/          ← application / operations / shared / browser  5.0 Shared Runtime + 136 个业务 op + 11 个 Node-native op
  analysis-runtime/      ← Visual Analysis Core (.ts)
  image-generation-runtime/ ← generation / space / prompt / quality / reference-engine / scene-projection / continuation
  image-generation-contracts/ / image-generation-adapter/  ← 合约与适配
  image-provider-dashscope/ / model-registry/ / model-runtime/ / model-benchmark/  ← Provider 边界
  document-ingestion/ / project-contracts/ / creative-intelligence/ / creative-production-runtime/ / reference-asset-inspector/ / evaluation-loop-contracts/
labs/                  ← reference-style-conversion / infinite-canvas（**不进** Web UI/Runtime/构建，独立实验）
evaluation/            ← golden-cases / anti-cases / hidden-cases / known-cases / contracts / reports（**严格隔离**生产 Runtime）
docs/                  ← 24 个子目录：architecture / baseline / core / development / releases / repository / runtime / visual-analysis / handoff / incoming / pr-descriptions / product / ...
```

历史阶段（V6 / V18 / vnext / v5 / R8.6 / Phase9B / R10 / R11）的内部实现名还在，但都被显式标记为「历史/兼容」。**用户可见文案**已清掉（`vnext` / `V18` / `V6` 字样禁用），`verify:version-naming` 是硬门禁。

---

## 4. 架构与能力边界

主权威映射（`CURRENT_ARCHITECTURE.md` + `docs/core/RUNTIME_OWNERSHIP.md`）：

| 能力 | Current Authority |
|---|---|
| Visual Analysis | `@masterpiece/analysis-runtime/core/visual-analysis-core.ts` |
| Reference Engine | `@masterpiece/image-generation-runtime/reference-engine/*` |
| Space Generation | `@masterpiece/image-generation-runtime/core/space-generation-core.js` |
| Packaging Generation | `@masterpiece/image-generation-runtime/core/packaging-generation-core.js` |
| Application orchestration / persistence | `@masterpiece/runtime-core/application/*` |
| Credentials / native paths / local transport | `apps/web-runtime` |
| Product UI | `apps/web` |

**硬边界**（5.0 + S5 删 Electron 之后）：

- 当前生产**禁止** import Desktop/Electron、`archive/`、`labs/`、`evaluation/*`。
- Web Renderer **禁止** import host implementation modules。
- Shared Runtime + operation registry 必须 host-neutral（**禁止** fs / Electron / 进程 API 直接落进 `packages/*`）。
- Provider 抽象 = external boundary，凭据**绝不**进代码、绝不进 baseline。

数据流（用户可见路径）：

```
Browser renderer → web-api.ts (RPC proxy) → ws:4317 → node-runtime-host.ts
  → local-rpc-server → current-operation-graph → node-native-operations
  → runtime-core operation registry (147 个) → @masterpiece/* 能力包 → provider 适配
```

Reference First 链路（`CURRENT_BASELINE.md §3`）：显式 reference only、`high_fidelity_visual_reference` role、visual world 跟 reference、功能 program 跟 target scene、无 implicit project-asset fallback、target-scene authority fail-closed、Logo 走 `post_composite`。

Space Generator 模式（`MASTERPIECE_SPACE_COMPILER_MODE`）：`r8_6_golden`（默认）=`phase9b_quality`（alias）；`vnext_legacy` 仍保留为兼容依赖。

---

## 5. 开发纪律（项目最硬的部分）

### 5.1 离线闸门（每次提交前）

```bash
# 离线、不调真实 Provider
npm run verify:version-consistency
npm run verify:version-naming
npm run verify:workspace-boundaries
npm run verify:no-obsolete-code
npm run verify:production-boundaries
npm run verify:no-project-specific-production-rules
npm run verify:golden-boundary
npm run verify:current-flows    # Runtime + Node Host + Web typecheck

# 测试
npm test                         # 根公共契约
npm run cli:test                 # apps/cli
npm run runtime:test             # Shared Runtime
npm run web-runtime:test         # Node Host
npm run web:smoke                # 浏览器 smoke，**0 Provider calls, 0 business writes**
npm run web:build                # typecheck + Vite build
```

`web:smoke` 的硬要求：Node Host boot + 真实浏览器 UI + 147-op graph + provider/config resolution + 0 Electron/Desktop Main + 0 Provider call + 0 business write。

`docs/repository/REPOSITORY_CONTRACT.md` 还定义了一套**RC 失败码**（RC001~RC010），每个都有明确的 rule / path / expected action。

### 5.2 修改类与最小验证

| Class | 范围 | 最小验证 |
|---|---|---|
| A | 文档 only | `repo:verify` |
| B | 内部非行为代码 | `repo:verify` + 受影响测试 |
| C | Runtime / architecture | `repo:verify` + 全回归 |
| D | Prompt / compiler / reference / generator | C + Golden |
| E | Golden baseline | 显式 baseline review + 全回归 |
| F | 兼容性 / schema / 持久化合约 | 兼容性 review + 全回归 + Golden |

`repo:verify` 是快、确定性、离线的合约检查；`repo:check` 是本地全回归。**两者都不调真实 Provider**。

### 5.3 Behavior-sensitive 名单（不能「为整洁而动」）

Prompt 顺序、约束、Reference First / Continuation 路由、anchor / Locked Asset 行为、analysis / generation schema、模型/Provider 路由、图像预处理、响应解析、重试/降级/fail-closed 闸门——**全部是 behavior-sensitive**。修改需走 dedicated behavior evaluation + Golden verification + 显式 digest 更新。

### 5.4 Prompt / Golden 完整性

- 冻结的 production-critical prompt 在 `config/repository-contract/prompt-integrity.json`，digest 失配报 `RC007 PROMPT_DIGEST_CHANGED`（**无自动更新模式**）。
- Golden baseline 改动 = `RC008 GOLDEN_BASELINE_CHANGED` review event，**禁止**为了让 fail 变 pass 而改 fixture。

### 5.5 真实 Provider smoke（5.0 cut 前）

仅 3 次用户授权（env-vars only，无 secret 入库）：

1. 视觉分析（offline sample project）
2. 空间生图（spatial / 非医疗）
3. 非医疗项目生图

每次都要记录 provider / model / 终止状态 / 模型调用次数 / 耗时 / 报告路径 / composition 结果（**凭据绝不入记录**）。

### 5.6 命名与版本域

- 产品版本 = `/VERSION` 的 SemVer
- `schemaVersion` = 各自数字版（如 image-gen task 3.0、run 1.0、source context 2.0，Creative Production `6.0` 是**独立 schema 域**不是产品 v6）
- `componentVersion` = `<component>@<semver>`（如 `short-chain-compiler@4.3.0`）
- `promptVersion` = `<prompt>@<semver>`（如 `creative-reading@1.0.0`）
- 阶段式标签（V5 / V6 / V18 / vnext / r12 / latest / new / final / backup）**禁止**作为新代码命名。

### 5.7 仓库污染物红线

不重跟踪 `node_modules/`、`coverage/`、`.runtime/`、`.codex-smoke/`；不提交 API Key / 原始 Provider 响应；不恢复 `experiment/pre-overfitting-baseline` 到主线（只作 Benchmark 存在）；不整分支 merge `feature/reference-led-visual-direction` / `feature/reference-asset-selection-protocol`（archive-only）。

### 5.8 项目内失败分类（公共代码升级纪律）

`docs/development/project-quality-recovery-loop.md` 定下硬约束：单项目失败默认改项目数据 / Creative Direction / Media Translation / 当前任务 Prompt，**不允许**为一个项目失败改公共代码。改公共代码要满足以下之一：

- 两个以上无关项目同型失败（**不是**完全一样，是同型不同形）
- 明确工程错误（字段路径错、Logo Gate 不一致、Packet 迁移失败等）

每次公共模块改动 PR 必须引用至少一个 `ProjectCase`（`caseId` + `failureType`），否则 Code Review 拒绝。失败类型枚举：

```
input_evidence | analysis_missing | analysis_conflict
| media_translation_shallow | compiler_bug | image_execution_fail
```

每种类型对应一个明确的修复器，不允许「看着像就升」。这意味着 review/audit 类工作要高度依赖结构化的 failure 登记和跨项目命中率 Dashboard。

---

## 6. 已知活跃战线

最近一段都在 `codex/visual-migration-*` 系列：

- **VM0–VM1**（foundation / integration-freeze）：能力 / 集成冻结
- **VM2 / VM2.1**（canon / canon-purity-lifecycle）：参考 canon 契约与纯度
- **VM3**（task-aware-reference-policy）：任务感知的 reference 策略基线
- **VM4**（capability-materialization）：能力物质化
- **VM5**（generation-evidence-snapshot）：生图证据快照——生成结果 + 选中的 source/reference 证据 + 决定规则做字节不可变、指纹校验
- **VM6**（audit-corrective-retry）：**双面 audit + 限定范围 corrective retry**，在 image-generation service 暴露**一个可选**的 pre-submit guard，无 hook 时保持原行为
- **PI-1**（product-integration-p1）：**产品门面纵向切片**——已有 profile 复用、re-anchor recovery
- **PI-2 / PI-2R**：人工 PI-2 验收 + 真实 Provider 端到端（Gate A-C 证据），最近修了 `bebac999`（参考品牌词去品牌化改写不再误杀锚定流程）

当前主战场总结：「**把 Reference-First 的能力冻结成 baseline、做出可产品化的门面、并用真实 Provider 跑通端到端**」。

---

## 7. 已知历史包袱

`docs/handoff/2026-08-25-audit.md` 列了下一次接手的人/Agent 要避免的坑：

- **F5**：`App.tsx` 854 行 + 15+ useState + 10+ handlers 拆分——HIGH 风险（hook-rules 顺序已注释「MUST be called on every render BEFORE any early return」）
- **F6**：Short-Chain 收敛——`ShortChainGenerationWorkspace.tsx` 1443 行仍被 legacy 引用；两套并行的 state machine（brief / generation / session / continuation / reference）需要先选 canonical、删另一套，再谈简化
- **F7**：`styles.css` 6530 行继续按 BEM prefix 拆——CSS 顺序敏感，bundle 大小不能涨
- **Orphan detection 6 区域 grep**：删 workspace 包前必须 grep `apps/*`、`apps/cli/`、`apps/web-runtime/`、`packages/*`（含 `packages/runtime-core/src/application/`、`integration/`、`operations/`）、`tests/*`、`docs/*`——上次误判 `@masterpiece/creative-production-runtime` 为 orphan，因为 `anchor-candidate-service.ts` 在 `packages/runtime-core/src/application/` 里 import 它而 `apps/*` 看不到
- **工具副作用提醒**：`patch` 工具会重写行尾（CRLF/LF/BOM），commit 前要 `git diff --cached --stat` 复核
- **CJK 文件**不要用 PowerShell `Set-Content -Encoding UTF8`（GBK 系统会破坏）——用 write_file 工具或 `[System.IO.File]::WriteAllText(..., [System.Text.UTF8Encoding]::new($false))`

---

## 8. 用户工作流

- 按 Phase dev doc 推进，每 Phase 有独立开发文档（这一支 `visual-migration-*` 不属于外部桌游原型那条线——是 Masterpiece-OS 自身的 visual migration 系列）
- 工作流：dev doc → 跑 `repo:verify` / 合适 gate → 写代码 → Final Report
- 「严格不偷工」「不自动进入下一阶段」「重要交付时输出 Final Report」——意味着 **agent 必须能识别 Phase 边界、不会越界**
- 中文为主，简明扼要；项目内大量文档、commit、PR 描述、CHANGELOG 都以中英混排为主，commit 走 conventional commits

---

## 9. 当前健康度

刚在本机跑过的基线校验：

| 闸门 | 结果 |
|---|---|
| `sync:version` | ok，根 + runtime-trace.js 都在 `5.0.0-rc.1` |
| `verify:version-consistency` | PASS（15 个 `@masterpiece/*` + 1 个 lab，private + 0.0.0） |
| `verify:version-naming` | PASS（无 V5/V6/V18/vnext/phase 命名） |
| `verify:workspace-boundaries` | PASS（0 failure / 0 warning） |

Node v24.20.0 / npm 11.19.0 / Git 2.55.0 都在本机 PATH 可用（`C:\Program Files\nodejs` + `C:\Program Files\Git\cmd`），但**新开 shell 不会自动有**，需手动前置到 `$env:Path` 或加进系统 PATH。

---

## 10. 按职能切片

- **Web 前端（apps/web）**：Vite + React 19 + TS 7，UI 唯一生产面，short-chain workspace
- **Web Host（apps/web-runtime）**：Node 进程，ws RPC (4317)，凭据、native ops、配置、profile 持久化
- **CLI 分析引擎（apps/cli）**：Visual Analysis 引擎 + `prompts/v5/`，从仓库根迁出但仍可独立 `npm run analyze -- --project "X"`
- **Shared Runtime（packages/runtime-core）**：application services（reference-first / short-chain / deliverable-validator / similarity-audit / evidence-scanner / creative-research / packaging / runtime / asset-selection / model-schema）+ 147 operations
- **Visual Analysis Core（packages/analysis-runtime）**：决策包、字段修复策略、项目 contract
- **Image Generation Runtime（packages/image-generation-runtime）**：core（space-generation / packaging-generation）+ generation（orchestration / prompt / quality / reference-engine / scene-projection / gates / continuation）+ prompt-contracts / prompt-templates / deliverables
- **Provider 边界（packages/image-provider-dashscope, model-registry, model-runtime, model-benchmark）**：qwen / openai-compatible + Seedream 协议；当前活跃 baseline = Qwen（`qwen3.6-plus`）+ Seedream（`seedream-5.0-pro`）
- **Contracts & Ingestion（image-generation-contracts, image-generation-adapter, document-ingestion, project-contracts, reference-asset-inspector, evaluation-loop-contracts, creative-intelligence, creative-production-runtime）**：每个对应一个明确的领域边界
- **评估隔离（evaluation/ + labs/）**：**不**进生产 Runtime
- **治理 / 配置（config/repository-contract/）**：JSON 是**治理元数据**（不是第二运行时），`current-authorities.json` / `compatibility-registry.json` / `prompt-integrity.json` / `runtime-static-assets.json` / `version-namespace-allowlist.json`
- **历史考古（archive/, docs/archive/, space-generator archaeology, experiments/pre-overfitting-baseline）**：只读，**禁止**生产 import

---

## 11. 拿这份去 chat 时建议带的讨论点

1. **这个项目不是「一个代码库 = 一个 agent 就够了」**——它同时有**契约治理 / 离线闸门 / 真实 Provider 验证 / Reference-First 视觉语义 / 项目失败分类 / 跨项目复现追踪**等多条横切关注点。
2. **很可能需要一个专做审计 / ProjectCase 登记 / 跨项目命中率追踪**的角色，而不是纯写代码——大量工作流是「结构化 failure 登记 + 跨项目复现 → 公共能力升级候选」。
3. **改动类 agent 必须能区分「项目内修复」与「公共代码升级」**，否则会触犯 `repo:verify` 或 `RC003` / `RC007`。
4. **VM/PI 系列冻结基线说明现在主战场是「把能力冻结成 baseline + 真实 Provider 端到端验收」**——如果 agent 团队要服务这条主线，**跑真实 Provider 烟测（人工授权下）的能力 + 维护 frozen baseline 的纪律**都是必备的。
5. **用户对「严格按 dev doc / 不偷工 / Phase 边界 / Final Report」的偏好很强**——agent 团队的成员如果倾向于「自动化推进 / 跨 Phase 越界」会出戏。
