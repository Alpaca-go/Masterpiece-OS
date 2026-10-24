# 冯烫烫证据溯源

日期：2026-10-24。结论：**部分调查完成，图 1 实际执行链缺失，端到端归因未完成**。

调查范围是当前仓库及其可见运行文件名、历史质量记录、独立工作流代码。
用户没有指定图 1 对应的本地项目副本、图片文件、projectId 或 runId，故未搜索
用户其他私人目录、读取全局凭据或调用任何 Provider。未使用外网历史链接代替本地证据。
图 2—9 的图像本体未提供，未作新的视觉验收。

基线为 `3da7d1bab58e58dc091a20a3c55b1e6cc4f65d48`，原工作树干净。
本地 `origin/HEAD` 指向 `origin/main`，本地 `origin/main` 与起点一致；未联网刷新远程状态。
这与 AGENTS.md 的较早分支说明不同，报告保留两者区别。
工作分支 `codex/rks-ftt-seed-knowledge`，未合并、未发布。

## 已查明的历史证据

所有文件相对位置、SHA256 与权属见 `evidence-manifest.json`。`ftt-direction-brief`
指用户提供并要求据此开发的方案；其 1.1 是本轮设计目标依据，不冒充原项目确认记录。

| 引用 | 观察 | 可证明范围 |
| --- | --- | --- |
| historical_packet:creativeDecision.uniqueUpgradeThesis | 有“从传统川菜馆升级为现代川味小吃快餐”的 AI 提案 | 历史提案确实存在；不能证明图 1 使用了它 |
| human_selection:golds[0] | human-r8.6-acceptance 认可开放厨房、厨师、食物、顾客、餐桌、柜台的真实运营关系 | 单项目单次历史验收 |
| human_evaluation:dimensions.materialAndLighting | 暖色木、赤陶、厨房暖光；人工分覆盖自动分 | 人工记录，不是只有自动评分；不直接证明红砖这一项 |
| historical_prompt:Architecture Context | 包含红砖、暖木、赤陶与暖光的历史先验 | 历史 Prompt 内容；不能据此宣称新图验收通过 |
| historical_prompt:Task | 标为 lobby / entrance_view | 仅历史镜头；不能代填图 1 的 shot |
| historical_run | baseline 字段为 r9-parity，时间为 2026-08-08 | 目录名、Prompt 标题与运行元数据存在阶段差异，不能直接称为此次 P7B 记录 |
| b1_projection | 只读映射 Packet 的空间字段并附 sourcePaths | B1 不会自动纠正上游审美提案；不证明此次建议/确认状态 |
| confirmation_store | 确认记录绑定分析指纹，失配要求重新确认 | 当前实现的静态事实，非图 1 执行证据 |

历史 Prompt 同时出现暖木赤陶先验、浅色材料和通用建筑表述，不能把任一摘录
选择性当作实际图 1 的完整生成输入。历史记录中的品牌/项目标识仅保留在原文件；
新增报告不用它们冒充实际 run 身份。

## 缺口与归因限制

缺少：图 1 身份关联、实际 projectId/runId、原始输入及报告、此次 Packet、B1 建议、
design-direction 状态和分析指纹、人工确认记录、Effective Packet、正式 Prompt、
Provider payload 摘要及实际 subtype/shot、功能节点、人物行为要求。
逐项未知与八种待验证假设见 `ftt-root-cause-matrix.json`，均不判为已证实根因。

补证时只需用户指定一个只读项目副本及图 1 文件/运行标识，再按文件哈希连接链路；
凭据、完整 Provider 响应和私人资产不得纳入 Git。当前不足以归因于模型不遵从、
编译丢失、B1 或用户确认。

## 单独的合成编译实验

现有纯编译接口在固定 standard、lobby / entrance_view、16:9、Seedream 模型元数据
及零参考图条件下保留了新的 spatialConcept，但三项 mustBeVisible 文本未进入
最终 Prompt。详见 `offline-compile-comparison.json` 的字段级布尔值和 sourceMap。
这是合成输入的**字段传递未通过**，不是图 1 的归因。未改 Compiler；未调用生成、
确认或 Provider 入口。语义实验在此停止，另列未来修复范围。
