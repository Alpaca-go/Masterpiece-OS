# Masterpiece-OS Roadmap

本文件只描述 Masterpiece-OS 当前 5.x 阶段的目标。历史版本演进记录
见 `docs/archive/v4.0/roadmap-history.md`。

## 5.0 Release Candidate

Masterpiece-OS 5.0 的目标是把仓库重整、产品入口单一化与评估体系隔离
三件事在同一发布候选中交付。

- [x] 产品版本统一为 `5.0.0-rc.1`，来源 `/VERSION`，由
      `scripts/sync-product-version.mjs` 同步到 `package.json`、
      `apps/desktop/package.json`、`apps/cli/package.json`、CHANGELOG
      与 Electron artifactName。
- [x] 启用 npm Workspaces，统一内部包命名空间为 `@masterpiece/*`。
- [x] 替换 175 处深层 `packages/*/src/*` 相对导入为 `@masterpiece/*`。
- [x] Desktop 正式 UI 唯一保留 Short-Chain 生图路径，移除
      `vNext / Legacy` 模式切换。
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
- [ ] `npm test`                              PASS（根 + Desktop 公共契约）
- [ ] `npm run cli:test`                      PASS
- [ ] `npm run desktop:test`                  PASS
- [ ] `npm run desktop:build`                 PASS（含 typecheck）
- [ ] 1 次真实 Provider 视觉分析（端到端到正式报告）
- [ ] 1 次真实 Provider 空间生图 + 1 次真实 Provider 非医疗项目生图
- [ ] `chore/repository-consolidation-5.0` 已合并 `main`
- [ ] `experiment/pre-overfitting-baseline` 的 archive tag 已落库
      且分支未合并
- [ ] 已合并 Feature 分支（`feature/visual-upgrade-engine-v1`、
      `feature/image-generation-deliverables`、`feature/image-generation-v1`、
      `feature/image-generation-multi-source`）已删除

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
