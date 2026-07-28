# V6 / V18 开发完成审计

日期：2026-07-28  
分支：`feature/image-generation-deliverables`

## 结论

V6 核心生产链路、V6 Sprint 10 Quick Extraction，以及 V18 Phase 1–6 已完成代码实现和离线验证。V18 Phase 7 的三项目离线 A/B 已完成；真实 Provider 的视觉质量 A/B 仍需一次用户授权的真实 API 端到端运行，不能用 Mock 或启动测试替代。

本轮没有打包或交付 Desktop 可执行文件。

## V6 对照

| 范围 | 状态 | 实现证据 |
| --- | --- | --- |
| Creative Session | 完成 | `ac593bc`、`6565e12` |
| Style Profile | 完成 | `60e8e8b` |
| Locked Assets | 完成 | `a35c3bc` |
| Anchor Candidate、七维审核、重试 | 完成 | `3446535`、`d8e4338`、`95107c7`、`d6531fd` |
| Visual Canon | 完成 | `453da37`、`95107c7` |
| Canon Resolver、Prompt Snapshot、Provider Bridge | 完成 | `ff5be54`、`42313c4` |
| Generation Series、队列、恢复、归档 | 完成 | `8833cd9`、`db181b6` |
| Revision、变体、正式资产、Supporting Canon | 完成 | `08c8d33`、`d6531fd` |
| Session/Anchor/Canon/Series UI、Prompt 抽屉、版本对比 | 完成 | `6565e12`、`95107c7`、`db181b6`、`d6531fd` |
| Quick Extraction 进入同一生产体系 | 完成 | `21f61d4` |

Quick Extraction 没有新增平行实体：已通过的 `ReferenceStyleCapsule` 会编译成标准 `Creative Decision → Style Profile + Locked Assets`，后续继续使用既有 `Anchor Candidate → Visual Canon → Generation Series`。

## V18 对照

| Phase | 状态 | 实现证据 |
| --- | --- | --- |
| Phase 1 Creative Session Domain | 完成 | `ac593bc` |
| Phase 2 Reading | 完成 | `cc0e9d7` |
| Phase 3 Instruction Compiler | 完成 | `ff5be54`、`42313c4` |
| Phase 4 Provider Bridge | 完成 | `42313c4`、`d8e4338` |
| Phase 5 Desktop Workspace | 完成 | `6565e12`、`95107c7`、`db181b6` |
| Phase 6 Resume / Retry | 完成 | `e80063b`、`d6531fd` |
| Phase 7 Offline A/B | 完成 | `bd4fc7b` |
| Phase 7 Real-provider visual A/B | 待授权 | 需要真实 API、代表性本地项目及视觉结果人工检查 |

V18 验收点已由自动化测试覆盖：自然语言单入口、Reading 不生图、Final Prompt 仅保存在 Run Snapshot、最多三张最终参考图、旧图仅可 reading、Provider/下载/Run Store 复用、Same Instruction Retry、Regenerate Instruction、旧 Run 兼容。

## 本轮门禁

- `npm test`：203/203 通过。
- `npm run desktop:test`：170/170 通过。
- `npm run desktop:build`：通过。
- `npm run verify:current-flows`：通过，且未调用外部 API。
- `npm run verify:production-boundaries`：通过。
- `npm run verify:no-obsolete-code`：通过。
- Desktop TypeScript：通过。

## 真实 Provider 验收记录模板

执行前需用户明确授权。完成后记录：

- Provider / Model
- 代表性项目与本地输入文档
- 最终状态
- 模型调用次数
- 总耗时
- 报告路径
- 生图输出路径
- 组成结果：单图任务是否保持单一职责、身份是否保留、旧版式复刻是否下降

只有真实运行到最终报告和目标生图成功后，才能按仓库发布门禁打包并交付新的 Portable 客户端。
