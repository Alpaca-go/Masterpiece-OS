## 摘要

本 PR 是 2026-08-25 项目审计的修复链路（8 个 commit）。所有改动都是**文档/标注先行 + 零后端/状态机改动**，为后续 P1/P3 工作提供诚实的 codebase。

## 改动文件分布

- `CURRENT_BASELINE.md` + `docs/baseline/runtime-reconciliation-2026-08-25.md` (新增)
- `package.json` (添加 archived-workspace-packages 索引键)
- `packages/{model-benchmark,creative-production-runtime,image-provider-dashscope}/ARCHIVED.md` (3 个新增；其中 1 个在 commit fb36136d 改为 NOT_ARCHIVED)
- `apps/web/src/features/short-chain/hooks/useShortChain{Session,Continuation}.ts` (2 个删除；commit C 先 deprecated，commit F2 真删)
- `apps/web/src/features/short-chain/hooks/useShortChainBrief.ts` + `OutputGallery.tsx` + `pages/ShortChainPage.tsx` (引用清理)
- `apps/web/src/styles/*.css` × 7 (skeleton banner 统一替换)
- `apps/web-runtime/PROTOCOL.md` (新增文档)
- `labs/README.md` (新增文档)

## Commit 列表

| SHA | 范围 | 触动文件 |
|---|---|---|
| 5b29ca24 | docs(baseline): reconcile Runtime baseline §1 | CURRENT_BASELINE.md, reconciliation note |
| df4d9b11 | docs(packages): tag 3 orphaned workspaces as ARCHIVED | 3 × ARCHIVED.md, package.json |
| 74c127b8 | docs(hooks): mark useShortChain* as @deprecated | 2 hooks header注释 |
| e573110b | docs(styles): banner 7 skeleton files NOT WIRED | 7 × styles/*.css header注释 |
| 0e65cb6d | docs(protocol): add labs README + web-runtime PROTOCOL | 2 个 README |
| 97e3a25c | refactor(hooks): delete useShortChain* | 2 hook 文件删除 + 3 处引用清理 |
| fb36136d | docs(packages): correct ARCHIVED verdict on creative-production-runtime | 1 个 ARCHIVED.md 替换 |
| 02bf2cc2 | docs(styles): align 7 skeleton banners with F3.A reality | 7 × styles/*.css header 替换 |

## 验证

- `npm run web:typecheck`: PASS
- `npm run web:build`: PASS
- `npm test`: **1714/1714 PASS**（所有 P0 测试，包括 8 个 creative-production-runtime 单元测试）

## 审计修正说明

本 PR 包含 1 个**审计结论修正**（commit fb36136d）：之前 df4d9b11 把 `@masterpiece/creative-production-runtime` 标为 ARCHIVED，但 F1 真正尝试移除时发现 `packages/runtime-core/src/application/anchor-candidate-service.ts` 强依赖这个包。审计的搜索范围（apps/、packages/runtime-core/operations/）漏了 `packages/runtime-core/src/application/`。修订 commit 把该包的 ARCHIVED.md 替换为 NOT_ARCHIVED + 完整依赖图说明。

**经验教训**：未来判断一个 package 是否为孤儿，搜索范围必须覆盖 `packages/runtime-core/src/application/`、`packages/runtime-core/src/operations/`、`packages/runtime-core/src/integration/`，以及所有 `tests/`。

## 风险评估

- **后端 / IPC / baseline 路径**：0 改动。Visual Analysis / Reference First / Space Generator / Packaging / Provider 路径完全未触。
- **运行时行为**：0 改动。删除的 2 个 hook 无任何调用方（验证过）。
- **CSS 视觉**：0 改动。Banner 是注释，不影响 CSS 解析。
- **文档一致性**：commit 02bf2cc2 与 refactor/styles-split 分支的 F3.A commit 互相引用。

## 相关 PR

- 配套 PR（refactor/styles-split → master）：本 PR 通过后，那个 PR 把 styles.css 240KB 拆成 tokens.css + theme-dark.css + styles.css 三个文件，main.tsx 按 (tokens → theme-dark → styles) 顺序 import。