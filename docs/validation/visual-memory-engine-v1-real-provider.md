# Visual Memory Engine v1 — Sprint 4 真实 Provider 验证

验证日期：2026-07-28  
Provider / 模型：DashScope / `wan2.7-image-pro`  
文本方向：复用两个项目已经确认的 Creative Direction，文本模型调用 0 次  
图片调用：每个 Run 1 次，共 8 次；其中 6 次为三类资产基线，2 次用于修复上下文稀释后的海报复验  
凭据：使用本机已配置 Profile；报告不记录 API Key

## 验证结论

- Visual Memory、Reference Pack、Generation Blueprint 已同时进入真实生图链路。
- 每个新 Run 均保存 `visual-memory.json`、`reference-pack.json`、`generation-blueprint.json` 和完整 Prompt，重试不依赖之后变化的 Active 状态。
- 九州美学从 27 张输入压缩为 8 张执行候选；冯烫烫从 10 张输入压缩为 8 张执行候选。
- Provider 任务级参考均为 0 张：两个项目当前均没有有效的已确认 Anchor/包装结构图可用；引擎没有为了凑数发送旧风格图。
- 冯烫烫现有 Canon 指向已不存在的旧 Run 图片。Reference Pack 自动排除该路径并降级，不触发 `ENOENT`，也不回退到旧方案图片。
- 首轮海报暴露了 Prompt 上下文稀释：完整 Memory 中重复问题和跨触点策略使模型生成 VI 展示板。修复后，JSON 继续保留完整记忆，执行 Prompt 改为语义去重、有数量上限，触点策略只由 Blueprint 注入。
- 修复复验的两个海报均从多物料展示板收敛为单张海报构图；`wan2.7-image-pro` 仍存在文字字形和轻微 Mockup 表现的随机性，不属于本阶段冻结范围内的自动修图/文字排版能力。

## 九州美学

Visual Memory：

- 输入候选：27
- 问题：16
- 修复后通用机会：9
- Reference Pack：8（2 locked + 6 style）
- 状态：`ready`

| 输出类型 | 新流程 Run | 状态 | 时长 | Provider 参考 | 对照旧流程 Run |
| --- | --- | --- | ---: | ---: | --- |
| 商业空间 | `b5663b87-8ef0-414a-8a3a-d9f19e01b4aa` | succeeded | 13,238 ms | 0 | `bebeb26f-2257-46c4-ac12-2ba36697329f` |
| 包装渲染 | `d5c88b86-d49e-4b72-afc7-49e353542c18` | succeeded | 15,173 ms | 0 | `50fcd5f1-5bc9-47b1-813e-b78b62d5fa1b` |
| 品牌海报（压缩复验） | `1f58ea64-8425-4a96-84f1-909d34fd7ae9` | succeeded | 11,565 ms | 0 | `b8257ae9-67cb-4fb1-af17-09b173d42e2a` |

人工检查：

- 空间、包装、海报共享低饱和紫灰、米白、细线弧形语言，跨品类一致性成立。
- 没有把 27 张旧方案作为参考送入 Provider，旧版复制风险显著降低。
- 海报复验已是单一竖版构图，但仍出现轻微纸张边缘/投影感；应作为模型输出质量风险记录，不能伪报为完全消除。

## 冯烫烫

Visual Memory：

- 输入候选：10
- 问题：38（完整记录保留于 JSON，执行 Prompt 上限 8 条）
- 修复后通用机会：10
- Reference Pack：8（1 locked + 7 style）
- 状态：`ready`

| 输出类型 | 新流程 Run | 状态 | 时长 | Provider 参考 | 对照旧流程 Run |
| --- | --- | --- | ---: | ---: | --- |
| 商业空间 | `8db174a8-bcb1-4137-860a-4ed6a5f4e5d7` | succeeded | 12,228 ms | 0 | `0339f3a2-ec64-499b-a7bc-0ae5e597d0c8` |
| 包装渲染 | `4bd3395b-ec88-4fc3-aee4-53c7b9a5b888` | succeeded | 10,751 ms | 0 | `e5e33d32-9a97-45aa-81b0-ca2893066e18` |
| 品牌海报（压缩复验） | `62e6f395-956a-417e-9cfa-081a49fe5acd` | succeeded | 12,904 ms | 0 | `58b36d03-9591-4213-84a9-6cc052050d46` |

人工检查：

- 三类资产共享米白、克制朱红、深色文字、网格与餐食品类主体，统一视觉世界成立。
- 压缩前海报 Run `610cdfcd-ef15-470c-8d4d-729eacdfe473` 错误生成多物料展示板；压缩后复验收敛为单张食物主视觉海报。
- 模型仍可能错误拼写英文或重复品牌字样；当前需求明确冻结文字排版与自动修图，因此只记录风险，不用伪造后处理掩盖问题。

## 验收映射

1. 减少原方案复制：通过。旧 style 候选保留在审计包，但未默认进入 Provider。
2. 增强新视觉语言：通过。Memory 中的新语言、问题和规则进入 Prompt；两个品牌均形成区别于旧素材合集的新输出。
3. Reference 数量降低：通过。27→8、10→8；Provider 最终参考 0，且永不超过 2。
4. 同品牌多类资产统一：通过（人工检查）。两组空间/包装/海报的主色、材质和构图机制一致。

## 已知边界

- 不存在或失效的 Canon 不会自动伪造成有效 Anchor；需要用户重新确认真实可读的 Canon 后，任务级 Anchor 才会进入 Provider。
- 文本字形精确度、自动修图和自动排版仍按需求冻结。
- 模型输出责任虽经强约束，仍可能出现随机偏差；Run 快照提供了完整可追溯证据，后续可在独立质量门阶段处理。
