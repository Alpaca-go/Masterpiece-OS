# 版本命名整理与维护指南

审计日期：2026-10-15。范围：根仓库 Git 跟踪的 1813 个路径（修改前索引）；不包含未跟踪的 masterpiece-os/ 副本、AGENT_TEAM_BRIEF.md 和忽略产物。

## 结论

以路径段、连字符、下划线或点为边界检索 v数字、vnext、r数字、phase数字、s数字、vm数字以及点分版本号，共命中 239 个路径。此统计包含父目录版本号，不把普通日期或所有数字都当版本。生产 apps/ 与 packages/ 中没有命中这类路径；此前 S6 已完成主要生产模块的语义改名。本次不需要重新搬动核心链路。

| 分类 | 数量 | 处理 |
|---|---:|---|
| 保留：归档入口 | 6 | 保留，原因见下文 |
| 保留：历史与版本文档 | 154 | 保留，原因见下文 |
| 保留：隔离评估证据 | 62 | 保留，原因见下文 |
| 保留：数据 Schema | 4 | 保留，原因见下文 |
| 保留：兼容 Fixture | 2 | 保留，原因见下文 |
| 已改名的活跃测试 | 11 | 改成能力名称，同步文档引用 |

## 已完成的改名

以下均位于 tests/runtime-application/，测试入口仍由 package.json 的 *.test.ts 通配符发现。历史报告中指向这些测试的 3 处路径已同步；历史报告标题、阶段验收内容保持原样。测试断言和数据契约没有改写。

| 原文件 | 当前文件 |
|---|---|
| creative-research-r2-analysis.test.ts | [creative-research-design-brief-analysis.test.ts](../../tests/runtime-application/creative-research-design-brief-analysis.test.ts) |
| creative-research-r2-document-adapter.test.ts | [creative-research-document-adapter.test.ts](../../tests/runtime-application/creative-research-document-adapter.test.ts) |
| creative-research-r2-service-store.test.ts | [creative-research-design-brief-service-store.test.ts](../../tests/runtime-application/creative-research-design-brief-service-store.test.ts) |
| creative-research-r3-baidu-contract.test.ts | [creative-research-baidu-contract.test.ts](../../tests/runtime-application/creative-research-baidu-contract.test.ts) |
| creative-research-r3-reference-search.test.ts | [creative-research-reference-search.test.ts](../../tests/runtime-application/creative-research-reference-search.test.ts) |
| creative-research-r4-operations.test.ts | [creative-research-operations.test.ts](../../tests/runtime-application/creative-research-operations.test.ts) |
| creative-research-r5-preferences.test.ts | [creative-research-preferences.test.ts](../../tests/runtime-application/creative-research-preferences.test.ts) |
| creative-research-r5-selection.test.ts | [creative-research-selection.test.ts](../../tests/runtime-application/creative-research-selection.test.ts) |
| creative-research-r6-correction.test.ts | [creative-research-correction.test.ts](../../tests/runtime-application/creative-research-correction.test.ts) |
| creative-research-r7-direction.test.ts | [creative-research-direction.test.ts](../../tests/runtime-application/creative-research-direction.test.ts) |
| creative-research-visual-search-v2.test.ts | [creative-research-visual-search.test.ts](../../tests/runtime-application/creative-research-visual-search.test.ts) |

另外：清除根 package.json 描述中的产品阶段 v5；去除 Design Brief 两条错误文案中的 R2；将视觉证据模块的私有 VnextShape 类型及参数改为 ProjectVisualContextShape、visualContext、assetInventoryPath，函数签名位置和输出字段不变。

## 必须保留的版本与消费者

| 对象 | 实际消费者 / 用途 | 为什么不能直接改 |
|---|---|---|
| VERSION / productVersion | scripts/sync-product-version.mjs、CLI runtime-trace | 唯一产品发布版本，与需求文档修订号独立 |
| 四个带 v2/v3 的 Schema 文件 | tests/image-generation/contracts-schema.test.js；Schema 内部 $id / $ref；task-builder.js 的 1.0/2.0/3.0 分流 | 真实数据格式代际，不是重复实现；不能合成一份并让旧数据失去定义 |
| tests/fixtures/image-generation-v1/ | tests/image-generation/legacy-fixtures.test.js | 用于证明旧数据仍能读取，不能重命名成 current 或改预期 |
| masterpiece-os-v5.json | analysis-engine/bootstrap.js、runtime-core/application/pipeline-service.ts | 现有用户项目的配置发现契约 |
| project-visual-context.vnext.json、visualContextVNext* | project-context-service.ts、project-store.ts、application-contracts.ts | 磁盘文件和持久化字段，必须配套双读及迁移后才能移除 |
| vnext-1.0、pipelineMode=vnext、image-generation-vnext | image-generation/short-chain-service.ts 及已有运行记录 | 恢复、重试、历史产物路径兼容 |
| r8_6_golden、phase9b_quality、vnext_legacy、Phase9B trace | generation/compile.js、space/compiler.js、门禁及 Golden | 配置选择与可追溯输出契约，改名会影响回放 |
| ImageGeneration*V2/V3、PackagingTranslationV2、VisualDiagnosisV2 等类型 | packages/*-contracts、对应读写器及迁移器 | 类型确实区分数据结构，不按需求文档修订号批量去后缀 |
| vnextSchemaVersion / vnextVersion | VisualEvidenceContribution 输出 | 本次仅改内部变量，不修改可被下游持久化的输出形状 |
| 模型名、API URL 版本、依赖版本、组件/Prompt 版本 | Provider、包管理器、trace | 外部协议或独立版本域，不属于阶段污染 |
| docs/ 的 S*/R*/VM* 与发布文档 | 历史验收、迁移记录、基线引用 | 是证据坐标，不能把历史 PASS 改写成当前结论 |
| archive/ 和 evaluation/ 的版本路径 | 归档脚本、评估资产、历史证据 | 已与生产隔离；保留原名称便于复现 |

兼容权威仍是 [compatibility-registry.json](../../config/repository-contract/compatibility-registry.json)，本页是导航和决策说明，不新建运行时注册表。冻结 Prompt 和 Golden 未改动。

## 后续开发文档如何交接

1. 需求文档的修订号只放文档标题或修订记录；不要直接生成同名 v数字 / R数字实现。
2. 每份开发文档列出能力名、现有权威文件、行为差异、是否改持久化协议、对应验证命令。先沿用现有能力模块。
3. 内部文件改名必须同时查 import/export、动态 import、脚本、package.json、测试、文档链接与治理路径。旧路径只可留在明确标记的历史映射中。
4. 触及 Schema、磁盘文件、配置项、RPC 或 trace 时先设计兼容读写与迁移；不要用全文替换实现迁移。
5. 历史实现用 Git 保留，不复制 compiler-v2、compiler-final 等当前实现。

现有 verify:repository-contract 之前跳过文件名，本次补上阶段式文件名检查；显式 API、Schema、migration 目录和已登记路径例外仍可使用版本。增加针对文件名误放与合法版本目录的测试。完整版本策略见 [versioning-policy.md](../development/versioning-policy.md)。

## 验证

- npm run verify:current-flows：PASS（离线，含 Runtime、Node Host 与 Web typecheck）。
- npm run runtime-application:test：1277 / 1277 PASS。
- npm run repo:guard:test：42 / 42 PASS，包含新增文件名防回归测试。
- npm test：1682 PASS / 1 FAIL，共 1683 项。唯一失败为 tracked-runtime-assets-guard 中冻结 Prompt SHA-256 校验。
- npm run repo:verify：FAIL，停在 verify:repository-contract 的 4 个 RC004 Prompt 摘要漂移。
- 独立补跑后续检查：version-naming、workspace-boundaries、no-obsolete-code、production-boundaries、tracked-runtime-assets、no-project-specific-production-rules、golden-boundary，以及 analysis-provider-authority、analysis-prompt-integrity、analysis-namespace、runtime-isolation、analysis-golden-integrity、secret-safety 全部 PASS。
- verify:version-consistency：FAIL，唯一原因是预先存在的未跟踪 masterpiece-os/package-lock.json 违反单 Lockfile 规则；根 VERSION、package.json、package-lock.json 和 runtime-trace 版本相符。
- git diff --check：PASS。

Prompt 漂移核实：四个文件磁盘字节均与 Git HEAD 完全相同，HEAD 的摘要也不匹配登记值；换行归一化仍不匹配。因此是原有基线登记问题，不是本次重命名造成。未更新冻结摘要，未修改 Prompt 或 Golden。需要单独评审实际 Prompt 与冻结证据，不能自动接受当前内容。

嵌套副本是任务开始前已存在的用户未跟踪文件，本次没有删除、移动或忽略它以规避门禁。后续应确认其用途后移出根仓库或单独管理。此工作没有发布，也未调用真实 Provider；以上结果不构成发布全绿声明。

## 命中路径明细（修改前）

下面保留原路径作为审计映射。已改名测试以本页上方当前路径为准，其余路径保持原样。

### 保留：归档入口

- `archive/legacy-entrypoints/space/r10-r11/README.md`
- `archive/legacy-entrypoints/space/r10-r11/archive-r10-final.mjs`
- `archive/legacy-entrypoints/space/r10-r11/bind-r10.4.1-artifacts.mjs`
- `archive/legacy-entrypoints/space/r10-r11/bind-r11.1-v12-artifacts.mjs`
- `archive/legacy-entrypoints/space/r10-r11/r11.1-closeout.mjs`
- `archive/manifests/S3-D-01-r10-r11-legacy-entrypoints.md`

### 保留：历史与版本文档

- `docs/archive/S3-archive-candidates.md`
- `docs/archive/S3-before-after-map.md`
- `docs/archive/S3-final-report.md`
- `docs/archive/v3.3/document-analysis-protocol-v3.1.docx`
- `docs/archive/v4.0/examples/cultural-creative-demo/assets/demo-logo.svg`
- `docs/archive/v4.0/examples/cultural-creative-demo/assets/demo-mascot.svg`
- `docs/archive/v4.0/examples/cultural-creative-demo/masterpiece-os.json`
- `docs/archive/v4.0/examples/food-brand-demo/assets/demo-logo.svg`
- `docs/archive/v4.0/examples/food-brand-demo/assets/demo-package-front.svg`
- `docs/archive/v4.0/examples/food-brand-demo/masterpiece-os.json`
- `docs/archive/v4.0/examples/travel-brand-demo/assets/demo-logo.svg`
- `docs/archive/v4.0/examples/travel-brand-demo/assets/demo-pattern.svg`
- `docs/archive/v4.0/examples/travel-brand-demo/masterpiece-os.json`
- `docs/archive/v4.0/knowledge/benchmark-method.md`
- `docs/archive/v4.0/knowledge/thinking/brand.md`
- `docs/archive/v4.0/knowledge/thinking/emotion.md`
- `docs/archive/v4.0/knowledge/thinking/identity.md`
- `docs/archive/v4.0/knowledge/thinking/portfolio.md`
- `docs/archive/v4.0/knowledge/thinking/visual.md`
- `docs/archive/v4.0/phase1-generalization-and-first-delivery-reliability.md`
- `docs/archive/v4.0/phase1.5-contract-decay-audit.md`
- `docs/archive/v4.0/phase1.5-repo-cleanup-stage0.md`
- `docs/archive/v4.0/phase4-context-integration-report.md`
- `docs/archive/v4.0/project-context.md`
- `docs/archive/v4.0/roadmap-history.md`
- `docs/archive/v4.0/rules/creative-brief-boundary.md`
- `docs/archive/v4.0/skills/SKILL.md`
- `docs/archive/v4.0/standards/README.md`
- `docs/baseline/S1-final-report.md`
- `docs/baseline/S1.1-final-report.md`
- `docs/core/S4-compatibility-adapters.md`
- `docs/core/S4-current-dependency-map.md`
- `docs/core/S4-extraction-candidates.md`
- `docs/core/S4-final-report.md`
- `docs/core/S4-space-capability-map.md`
- `docs/core/S4-target-dependency-map.md`
- `docs/core/manifests/S4-C-01-reference-engine.md`
- `docs/core/manifests/S4-D-01-visual-analysis-core-boundary.md`
- `docs/core/manifests/S4-E-01-space-core-facade.md`
- `docs/core/manifests/S4-E-02-space-consumer-containment.md`
- `docs/core/manifests/S4-F-01-packaging-core-facade.md`
- `docs/creative-intelligence/rebuild/ci-r0/ci-r1-readiness.md`
- `docs/creative-intelligence/rebuild/ci-r0/data-model-gap.md`
- `docs/creative-intelligence/rebuild/ci-r0/integration-boundary.md`
- `docs/creative-intelligence/rebuild/ci-r0/legacy-capability-audit.md`
- `docs/creative-intelligence/rebuild/ci-r0/reuse-matrix.md`
- `docs/creative-intelligence/rebuild/ci-r1/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r2/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r3/final-reconciliation.md`
- `docs/creative-intelligence/rebuild/ci-r3/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r4/final-reconciliation.md`
- `docs/creative-intelligence/rebuild/ci-r4/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r5/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r6/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r7/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r8/acceptance-matrix.md`
- `docs/creative-intelligence/rebuild/ci-r8/final-report.md`
- `docs/creative-intelligence/rebuild/ci-r8/freeze-manifest.md`
- `docs/creative-intelligence/rebuild/ci-r8/migration-readiness.md`
- `docs/creative-intelligence/rebuild/ci-r8/rollback-plan.md`
- `docs/golden/S2-final-report.md`
- `docs/releases/5.0-repository-consolidation.md`
- `docs/releases/5.0.0-real-provider-smoke.md`
- `docs/repository-stabilization/S0-final-report.md`
- `docs/repository-stabilization/history/S0-version-registry-2026-08-11.md`
- `docs/repository/S6-current-authority-map.md`
- `docs/repository/S6-dead-namespace-sweep.md`
- `docs/repository/S6-final-report.md`
- `docs/repository/S6-semantic-naming-plan.md`
- `docs/repository/S6-version-namespace-inventory.md`
- `docs/repository/S6-version-topology-map.md`
- `docs/repository/S7-contract-baseline.md`
- `docs/repository/S7-existing-guard-inventory.md`
- `docs/repository/S7-final-report.md`
- `docs/repository/manifests/S6-A-version-namespace-inventory.md`
- `docs/repository/manifests/S6-B-current-authority-map.md`
- `docs/repository/manifests/S6-C-semantic-naming-plan.md`
- `docs/repository/manifests/S6-D-space-generator.md`
- `docs/repository/manifests/S6-E-generation-context-packaging.md`
- `docs/repository/manifests/S6-F-cli.md`
- `docs/repository/manifests/S6-G-prompts.md`
- `docs/repository/manifests/S6-H-compatibility-aliases.md`
- `docs/repository/manifests/S6-I-historical-isolation.md`
- `docs/repository/manifests/S6-J-scripts-tests-config.md`
- `docs/repository/manifests/S6-K-dead-namespace-sweep.md`
- `docs/repository/manifests/S6-L-final-verification.md`
- `docs/repository/manifests/S7-A-repository-contract.md`
- `docs/repository/manifests/S7-B-existing-guard-inventory.md`
- `docs/repository/manifests/S7-C-namespace-guard.md`
- `docs/repository/manifests/S7-D-runtime-boundary-guard.md`
- `docs/repository/manifests/S7-E-authority-guard.md`
- `docs/repository/manifests/S7-F-prompt-golden-integrity.md`
- `docs/repository/manifests/S7-G-compatibility-guard.md`
- `docs/repository/manifests/S7-H-agent-rules.md`
- `docs/repository/manifests/S7-I-unified-verification.md`
- `docs/repository/manifests/S7-J-guard-self-tests.md`
- `docs/repository/manifests/S7-K-ci-integration.md`
- `docs/repository/manifests/S7-L-clean-environment.md`
- `docs/repository/manifests/S7-M-contract-freeze.md`
- `docs/runtime/S4.1-desktop-off-verification.md`
- `docs/runtime/S4.1-final-report.md`
- `docs/runtime/S4.1-host-dependency-map.md`
- `docs/runtime/S4.1-host-responsibility-audit.md`
- `docs/runtime/S4.1-target-runtime-map.md`
- `docs/runtime/S4.1R-credential-compatibility.md`
- `docs/runtime/S4.1R-desktop-off-verification.md`
- `docs/runtime/S4.1R-final-report.md`
- `docs/runtime/S4.1R-host-dependency-audit.md`
- `docs/runtime/S4.1R-process-evidence.md`
- `docs/runtime/S4.1R-rpc-contract-audit.md`
- `docs/runtime/S4.1R-target-runtime-map.md`
- `docs/runtime/S4.2-final-report.md`
- `docs/runtime/S4.2-migration-ledger.md`
- `docs/runtime/S4.2-operation-registry-audit.md`
- `docs/runtime/S4.2-runtime-service-inventory.md`
- `docs/runtime/S4.2-target-runtime-map.md`
- `docs/runtime/S5-desktop-dependency-closure-audit.md`
- `docs/runtime/S5-feature-delta.md`
- `docs/runtime/S5-final-report.md`
- `docs/runtime/S5-post-removal-topology.md`
- `docs/runtime/S5-removal-manifest.md`
- `docs/runtime/S5-test-coverage-delta.md`
- `docs/runtime/manifests/S4.1-A-host-audit.md`
- `docs/runtime/manifests/S4.1-H-desktop-off-blocked.md`
- `docs/runtime/manifests/S4.1R-A-host-and-rpc-audit.md`
- `docs/runtime/manifests/S4.1R-B-node-config-and-paths.md`
- `docs/runtime/manifests/S4.1R-C-node-credential-adapter.md`
- `docs/runtime/manifests/S4.1R-D-node-runtime-host.md`
- `docs/runtime/manifests/S4.1R-E-node-rpc-and-events.md`
- `docs/runtime/manifests/S4.1R-F-web-primary-start.md`
- `docs/runtime/manifests/S4.1R-G-node-web-smoke.md`
- `docs/runtime/manifests/S4.1R-H-desktop-off.md`
- `docs/runtime/manifests/S4.1R-I-final-architecture.md`
- `docs/runtime/manifests/S4.2-A-inventory.md`
- `docs/runtime/manifests/S4.2-B-registry-skeleton.md`
- `docs/runtime/manifests/S4.2-C-application-contracts.md`
- `docs/runtime/manifests/S4.2-D-project-runtime.md`
- `docs/runtime/manifests/S4.2-E-analysis-runtime.md`
- `docs/runtime/manifests/S4.2-F-document-context-reference-runtime.md`
- `docs/runtime/manifests/S4.2-G-image-packaging-runtime.md`
- `docs/runtime/manifests/S4.2-H-creative-production-runtime.md`
- `docs/runtime/manifests/S4.2-I-remaining-registry-and-composition.md`
- `docs/runtime/manifests/S5-A-test-relocation-manifest.md`
- `docs/runtime/manifests/S5-B-desktop-renderer-manifest.md`
- `docs/runtime/manifests/S5-C-native-adapters-manifest.md`
- `docs/runtime/manifests/S5-D-electron-ipc-host-manifest.md`
- `docs/runtime/manifests/S5-E-electron-main-manifest.md`
- `docs/runtime/manifests/S5-F-desktop-build-system-manifest.md`
- `docs/runtime/manifests/S5-G-electron-dependencies-manifest.md`
- `docs/runtime/manifests/S5-H-desktop-compatibility-paths-manifest.md`
- `docs/runtime/manifests/S5-I-dead-reference-sweep-manifest.md`
- `docs/runtime/manifests/S5-J-final-verification-manifest.md`
- `docs/runtime/visual-migration-reference-pack-v1.md`
- `docs/runtime/visual-migration-vm1-integrated-baseline.md`

### 保留：隔离评估证据

- `evaluation/reports/creative-director-v18.1-real-provider.md`
- `evaluation/reports/creative-session-v18-offline-ab.md`
- `evaluation/reports/image-generation-deliverables-v17.md`
- `evaluation/reports/jiuzhou-space-feedback-v1.1/baseline-b-pass-with-residual-risk.json`
- `evaluation/reports/jiuzhou-space-feedback-v1.1/production-baseline.json`
- `evaluation/reports/jiuzhou-space-feedback-v1.1/production-pass.md`
- `evaluation/reports/jiuzhou-space-feedback-v1/abc-comparison.md`
- `evaluation/reports/jiuzhou-space-feedback-v1/baseline-a-partial-pass.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/final-prompt.md`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/generation-blueprint.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/packaging-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/preflight-report.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/project-specific-generation-contract.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/prompt-source-map.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/provider-payload-preview.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/spatial-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/visual-decision-packet.json`
- `evaluation/reports/phase1-project-specificity-regression/after/packaging/visual-understanding-core.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/final-prompt.md`
- `evaluation/reports/phase1-project-specificity-regression/after/space/generation-blueprint.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/packaging-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/preflight-report.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/project-specific-generation-contract.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/prompt-source-map.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/provider-payload-preview.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/spatial-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/visual-decision-packet.json`
- `evaluation/reports/phase1-project-specificity-regression/after/space/visual-understanding-core.json`
- `evaluation/reports/phase1-project-specificity-regression/artifact-diff.json`
- `evaluation/reports/phase1-project-specificity-regression/atomic-decision-backtrace.json`
- `evaluation/reports/phase1-project-specificity-regression/audit-config.json`
- `evaluation/reports/phase1-project-specificity-regression/audit-report.md`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/final-prompt.md`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/generation-blueprint.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/packaging-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/preflight-report.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/project-specific-generation-contract.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/prompt-source-map.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/provider-payload-preview.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/spatial-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/visual-decision-packet.json`
- `evaluation/reports/phase1-project-specificity-regression/before/packaging/visual-understanding-core.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/final-prompt.md`
- `evaluation/reports/phase1-project-specificity-regression/before/space/generation-blueprint.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/packaging-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/preflight-report.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/project-specific-generation-contract.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/prompt-source-map.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/provider-payload-preview.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/spatial-translation.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/visual-decision-packet.json`
- `evaluation/reports/phase1-project-specificity-regression/before/space/visual-understanding-core.json`
- `evaluation/reports/phase1-project-specificity-regression/packaging-prompt.diff`
- `evaluation/reports/phase1-project-specificity-regression/regression-fail-cases.json`
- `evaluation/reports/phase1-project-specificity-regression/regression-results.json`
- `evaluation/reports/phase1-project-specificity-regression/space-prompt.diff`
- `evaluation/reports/prompt-compiler-decoupling-v1/jiuzhou-real-provider-impact.md`
- `evaluation/reports/prompt-compiler-decoupling-v1/verification.md`
- `evaluation/reports/v6-v18-development-completion-audit.md`
- `evaluation/reports/visual-decision-v1-real-provider.md`
- `evaluation/reports/visual-memory-engine-v1-real-provider.md`
- `evaluation/reports/visual-upgrade-engine-v1-real-provider.md`

### 保留：数据 Schema

- `schemas/image-generation/image-generation-source-bundle-v3.schema.json`
- `schemas/image-generation/image-generation-task-v2.schema.json`
- `schemas/image-generation/image-generation-task-v3.schema.json`
- `schemas/image-generation/source-context-snapshot-v2.schema.json`

### 保留：兼容 Fixture

- `tests/fixtures/image-generation-v1/run.json`
- `tests/fixtures/image-generation-v1/task.json`

### 已改名的活跃测试

- `tests/runtime-application/creative-research-r2-analysis.test.ts`
- `tests/runtime-application/creative-research-r2-document-adapter.test.ts`
- `tests/runtime-application/creative-research-r2-service-store.test.ts`
- `tests/runtime-application/creative-research-r3-baidu-contract.test.ts`
- `tests/runtime-application/creative-research-r3-reference-search.test.ts`
- `tests/runtime-application/creative-research-r4-operations.test.ts`
- `tests/runtime-application/creative-research-r5-preferences.test.ts`
- `tests/runtime-application/creative-research-r5-selection.test.ts`
- `tests/runtime-application/creative-research-r6-correction.test.ts`
- `tests/runtime-application/creative-research-r7-direction.test.ts`
- `tests/runtime-application/creative-research-visual-search-v2.test.ts`
