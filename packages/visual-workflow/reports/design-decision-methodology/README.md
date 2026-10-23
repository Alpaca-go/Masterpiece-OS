# 方法论提取与跨项目离线验证结果

> 后续实现：用户明确要求模型自动补全并替代实验分支原生策略后，已完成候选实现；见 [自动设计提案实现与测试入口](automatic-proposal-implementation.md)。以下保留第一阶段的失败发现，新版独立验收已为 6/6 PASS，真实模型质量仍待验证。

2026-10-24。结论：**方法论已提取；跨项目编译验收 FAIL，暂不接入生产。**

本轮用户同意先提取规范、验证不同项目，再决定接入；要求新建分支且可随时退出。本轮完成了该离线阶段，未声称自动分析或真实生成质量已通过。

- [通用方法论、决策卡和案例](methodology.md)
- [隔离与退出](isolation-and-rollback.md)
- [独立验收程序](../../tests/methodology/acceptance.test.mjs)（有意保留真实失败，执行返回 1）

## 验证结果

| 检查 | 结果 | 含义 |
|---|---|---|
| `npm run repo:verify` | PASS | 含 current-flows、隔离与反例检查；不是视觉验收 |
| `node --test packages/visual-workflow/tests/*.test.js` | 30/30 PASS | 现有独立工作流回归 |
| `npx --no-install tsx --test packages/visual-workflow/tests/*.test.ts` | 94/94 PASS | 现有独立工作流回归 |
| `npm run golden:test` | PASS | 既有记录检查，零 Provider，未更新 Golden；NOT_READY 仍保持原状态 |
| `node --test packages/visual-workflow/tests/methodology/acceptance.test.mjs` | 4/6 PASS，2 FAIL | 新方法的表达验收未通过 |

两例为明确编写的合成 brief：社区烘焙店、户外装备体验店。九州是历史人工方向与 Prompt 摘要核对。没有真实模型分析，没有新图，没有自动确认、用户项目重分析、发布或合并。

通过项：烘焙店关键关系到达提示词；缺失证据保持空白且拒绝错项目；仅改品牌/行业不会改变建议字段；历史 P7a 正式/Provider Prompt 的 LF 文本摘要与 P7b 使用记录一致。最后一项是已有文件完整性检查，**不是本轮重新执行 P7b Adapter 的请求复现**。

## 阻断项及根因

户外案例明确要求：

> A pack fitting platform and an independent comparison worktable are readable; two accessible chairs face each other across the worktable.

分析建议投影保留该句，当前编译器却未将其传到最终 Prompt。将该句改为两把椅子同侧同向，最终 Prompt 仍完全相同。因此不能靠模型图片复核来挽回已经丢失的输入。

代码路径：

1. `src/generation-runtime/space/semantic/separate-space-semantics.js` 的 `classifyPhrase(..., 'mustBeVisible')` 没有匹配建筑/空间词，默认归入 `brand_motif`。本次诊断 `motifHits=[]`、`archHits=0`、`propertyHits=0`。
2. `src/generation-runtime/space/source-adapter.js` 的 `splitMustBeVisible` 将该句分到品牌表达，而非操作要素。
3. `src/generation-runtime/space/semantic/sanitize-brand-expression.js` 以 `creative_prose_too_long` 删除该句（超过既有 60 字符限制）。

这是跨项目词汇与字段职责的冲突，不是“户外项目需要更像九州”。本轮没有增加行业专用词或改短案例来掩盖问题，没有修改该实现或完整性摘要。

首次构造案例时还发现 `signatureSpatialMechanism` 是当前编译入口必填项。案例补入 brief 中已有的展示界面组织关系，没有制造艺术装置；缺证测试仍明确覆盖该项为空。这是测试输入适配，不是生产行为修改。

## 后续实施的明确边界

下一步候选修复应在独立工作流中解决：明确的操作/布局要求如何保留其字段职责，未知词汇如何显式标为待确认，而不是静默移入品牌修辞后丢弃。必须同时保留标识后期合成、跨场景隐私、装饰与功能分离等既有约束。不能简单把全部 `mustBeVisible` 无条件透传，也不能把九州词汇扩展成行业模板。

这个修复会触及质量敏感的语义分类/编译，需要独立变更评审、完整回归与 Golden、历史请求离线一致性复核；若摘要改变，须明确审查影响，不能自动更新完整性记录以消除失败。之后才进入两个真实项目的有预算验证和人工质量评审。

## 实验保存与退出

本次新增文件位于 `packages/visual-workflow/reports/design-decision-methodology/` 与 `packages/visual-workflow/tests/methodology/`。独立失败验收显式执行，既有回归命令不包含它；这不使实验通过，整体结论仍是 FAIL。最初将可执行验收放在 reports 下时，暂存后隔离门禁拒绝该位置；现按门禁要求移至 tests 子目录，不修改或豁免门禁。

原工作区仍是 `main @ 98bcac78943bd97a24d8f536ada833a929b31672`。没有改动原有 tracked 文件、共享宿主或 root lockfile。继续使用原工作区即可退出实验，无需回滚数据。

本地完整日志位于实验工作区根目录 `methodology-repo-verify.log`、`methodology-workflow-js.log`、`methodology-workflow-ts.log`、`methodology-golden.log`、`methodology-acceptance.log`；均为 ignored 日志，不作为生产或测试运行依赖。
