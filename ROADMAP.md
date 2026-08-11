# Masterpiece-OS Roadmap

本文件只描述 Masterpiece-OS 当前 5.x 阶段的目标。历史版本演进记录
见 `docs/archive/v4.0/roadmap-history.md`。

## 5.0 Release Candidate

Masterpiece-OS 5.0 的目标是把仓库重整、产品入口单一化与评估体系隔离
三件事在同一发布候选中交付。

- [x] 产品版本统一为 `5.0.0-rc.1`，来源 `/VERSION`，由
      `scripts/sync-product-version.mjs` 同步到 `package.json`、
      `apps/cli/src/runtime-trace.js`。
- [x] 启用 npm Workspaces，统一内部包命名空间为 `@masterpiece/*`。
- [x] 替换 175 处深层 `packages/*/src/*` 相对导入为 `@masterpiece/*`。
- [x] Web 正式 UI 唯一保留 Short-Chain 生图路径，移除
      `vNext / Legacy` 模式切换。
- [x] S5 删除 Desktop/Electron workspace、IPC/preload、构建打包与 runtime
      dependency；Web Renderer + Node Web Host 成为唯一生产拓扑。
- [x] CLI 从根目录迁出到 `apps/cli/`，根 `npm run analyze` 直接调用
      `node ./apps/cli/bin/masterpiece-os.js analyze`。
- [x] 文档目录收敛到 `docs/{product,architecture,development,releases,archive}/`。
- [x] 验证资产与生产 Runtime 通过 `verify:golden-boundary` 硬门禁隔离。
- [x] 删除迁移 shim 与 README / ROADMAP 中过期的 v3.3 / v4.0 表述。

## 5.0 Release Gates

发布 `5.0.0` 之前必须保持绿色：

- [ ] `npm run verify:version-consistency`  PASS
- [ ] `npm run verify:workspace-boundaries`   PASS
- [ ] `npm run verify:current-flows`          PASS（离线，不调用真实 Provider）
- [ ] `npm run verify:no-obsolete-code`       PASS
- [ ] `npm run verify:production-boundaries`  PASS
- [ ] `npm run verify:no-project-specific-production-rules`  PASS
- [ ] `npm run verify:golden-boundary`        PASS
- [ ] `npm test`                              PASS（根公共契约）
- [ ] `npm run cli:test`                      PASS
- [ ] `npm run runtime:test`                  PASS
- [ ] `npm run web:smoke`                     PASS（Electron/Desktop Main = 0）
- [ ] `npm run web:build`                     PASS（含 typecheck）
- [ ] 1 次真实 Provider 视觉分析（端到端到正式报告）
- [ ] 1 次真实 Provider 空间生图 + 1 次真实 Provider 非医疗项目生图
- [ ] `chore/repository-consolidation-5.0` 已合并 `main`
- [ ] `experiment/pre-overfitting-baseline` 的 archive tag 已落库
      且分支未合并
- [ ] 已合并 Feature 分支（`feature/visual-upgrade-engine-v1`、
      `feature/image-generation-deliverables`、`feature/image-generation-v1`、
      `feature/image-generation-multi-source`）已删除

## r2.0 — Reference-First 跨场景生图修复 (supplement)

在 5.0.0-rc.1 之上补齐 Reference-First 跨场景生图链路上的 3 类问题：后分析上传静默丢失、Reference-First 退化为 1:1 复制、验证 / 纠偏 UI 把首图替换掉。设计文档 / 章节号单一事实源位于 `docs/development/r2.0-reference-first.md`。

- [x] A0 — post-analysis upload 不再静默丢失（`REFERENCE_ASSET_NOT_FOUND` 显式抛）
- [x] B-1 — `referenceSceneRelation` 辅助元数据（不替代 Target Scene Functional Authority）
- [x] B-2 — Adapter Capability + Product Policy 联合决定 `maxReferences`（fail-closed = 0）
- [x] B-3 — Reference Boundary 文本块（v2.0 正向表达）
- [x] B-4 — Reference-First 跨场景真实 Provider smoke runner 通过
- [x] C-1 / C-2 / C-3 — Reference Asset Resolver + 接入 `vnext-service.start` + UI preflight
- [x] D — 双门禁（Gate A compile + Gate B provider prompt）拆分
- [x] E — 5 状态 validation / correction UI + first-image preservation（r2.0 §4.13）
- [x] F-1 — 合约层 `VNextSimilarityAudit` + `VNextEvidenceCheckpoint` 类型
- [x] F-2 — Similarity Audit Service（Shared Runtime，multimodal LLM，10 类 typed error code）
- [x] F-3 — Audit 接入 `vnext-service.startValidated`（advisory / fail-soft / `similarityAudit=unavailable` marker）
- [x] F-4 — Evidence Checkpoint 两层（Runtime scanner + validator，r2.0 §8）
- [x] UI — 终验收阻塞 banner（`similarityAudit=unavailable` 时只标记 incomplete，不改判生成失败）
- [x] B-5 — 保持关闭：B-4 视觉已被人工审阅为 cross-scene 正确表达，未触发 Near-copy 降级路径

全程未触碰的不变量：

- `Reference-First = high_fidelity_visual_reference` / `Continuation = world_consistency` 不变
- `referenceSceneRelation` 是辅助元数据，不替代 Target Scene Functional Authority
- Standard / Continuation 路径输出完全不变
- `maxReferences = min(ProductPolicy, AdapterCapability)`；adapter 缺能力时 fail-closed (0)
- `r8_6_golden` 编译器未修改

验证状态：root 649 → 694、desktop 310 → 342；8/8 verify gates + `verify:current-flows` + `architecture-boundaries` + tsc strict 全部 PASS。详细 phase 表 / commit hash / 累计 delta 见 `CHANGELOG.md`（5.0.0-rc.1 supplement 段）。

## 5.1 Planned

- [ ] 视觉升级与文档上下文的可视化报告（一页 HTML）
- [ ] Provider Adapter 失败时的标准化降级策略
- [ ] 评估资产更细粒度的隐藏用例发布流程
- [ ] `apps/cli` 的子命令扩展面（`validate`、`doctor`、`fixture`）
- [ ] Desktop 的 `dev` 模式直接复用 `apps/cli` 的 Prompt 模板

## Backlog

- [ ] JPEG / WebP 像素级主色抽样
- [ ] 旧版 `.ppt` 解析（当前仅 `.pptx`）
- [ ] 可插拔搜索提供商 + 案例人工审阅状态
- [ ] Creative Brief 协作批注与版本比较
- [ ] Benchmark 来源可信度与定位相似度辅助审阅
- [ ] `.codex-smoke/` 转为 GitHub Actions Artifact + 脱敏 JSON 摘要
