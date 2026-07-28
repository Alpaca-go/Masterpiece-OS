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

## 真实 Provider 验收记录

用户于 2026-07-28 明确授权使用客户端已配置的 API 和代表性本地项目执行发布前验收。

| 项目 | 分析 |
| --- | --- |
| 代表性项目 | 冯烫烫（10 张本地视觉素材） |
| Provider / Model | qwen / qwen3.6-plus |
| 最终状态 | completed，最终报告校验通过 |
| 模型调用次数 | 1 |
| 耗时 | 151,064 ms（其中 Provider 推理与报告生成约 140,856 ms） |
| 报告路径 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\未标题-c68c6211\outputs\冯烫烫-视觉方案升级报告-qwen3.6-plus.md` |
| Runtime 报告 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\未标题-c68c6211\runtime\run-report.json` |

| 项目 | 生图 |
| --- | --- |
| Provider / Model | dashscope / wan2.7-image-pro |
| 最终状态 | succeeded，图片下载与本地校验通过 |
| 模型调用次数 | 1 |
| 耗时 | 9,891 ms |
| Run ID | `0f9d1ca8-66ee-4c86-878e-ad13308fba8c` |
| 输出路径 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\未标题-c68c6211\image-generation\0f9d1ca8-66ee-4c86-878e-ad13308fba8c\images\image-01.png` |

人工组成检查：

- 结果为单一完整餐饮室内空间，不是 VI 合集、多格拼贴或物料展示板。
- 空间透视、桌椅、后厨、灯光与真实材质关系完整，满足单图任务责任。
- 保留“冯烫烫 / 跷脚牛肉”身份语义，没有引入其他品牌身份。
- 未复刻旧版多格物料版式；升级方向表现为克制暖色、木质材料和可信商业空间。
- 中文招牌仍存在生成模型常见的字形失真，属于视觉质量问题，不影响本次 API、状态机、下载和单一职责门禁通过。

可复用命令：

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID='<project-id>'
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID='<text-profile-id>'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID='<image-profile-id>'
npm --prefix apps/desktop run smoke:real-provider
```

脚本只读取 Desktop 安全凭据存储，不打印 API Key。
