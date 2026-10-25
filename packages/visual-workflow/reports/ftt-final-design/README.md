# RKS-02D 冯烫烫最终设计方向审核与生图准备

日期：2026-10-25（Asia/Shanghai）。冻结起点 `0326f608e58b11bb687c26d13bb6e412e2cc71bd`，分支 `codex/rks-ftt-final-design-review`。起点工作树干净，HEAD/分支与用户指定一致。

**dining / three_quarter_wide：离线核心输入完整，等待人工确认与模型授权。** 本结论独立于 storefront；不是模型调用许可、设计签署或视觉质量提升结论。entrance 保留局部活动/堂食通行边界待审，storefront 的玻璃营业氛围目标仍为 review_required，尚未获得完整镜头许可。

## 审阅入口

| 交付 | 文件 |
| --- | --- |
| 最终空间方向待确认稿、A–E 来源分层 | [design-direction.md](design-direction.md) |
| 材料、色彩、照明、品牌表达的保留/替换/删除/待审建议 | [materials-color-light-brand.md](materials-color-light-brand.md) |
| 三镜头离线方向及各自权限/准备状态 | [shot-directions.md](shot-directions.md) |
| A/B 正式 Prompt、离线 Provider Prompt，以及明确分开的 B* 建议稿 | [dining](prompts-dining.md)、[entrance](prompts-entrance.md)、[storefront](prompts-storefront.md) |
| 字段原值/新值、来源及逐镜头差异 | [field-diff.md](field-diff.md)、[field-deltas.json](field-deltas.json) |
| 模板措辞风险分类、只作用于实验建议稿的句级修订 | [template-risks.md](template-risks.md)、[template-advisory-patches.json](template-advisory-patches.json) |
| RKS 来源、知识选择及未来 B1 草案边界 | [sources-and-knowledge.md](sources-and-knowledge.md)、[knowledge-use.json](knowledge-use.json)、[b1-future-drafts.json](b1-future-drafts.json) |
| 人工审核与尚未解决问题 | [human-checklist.md](human-checklist.md) |
| 下一阶段真实调用前检查 | [pre-call-checklist.md](pre-call-checklist.md) |

## 对照定义与证据

读取并复核了完整历史 Packet、RKS-01 修正草案、RKS-02A 分类/冲突、RKS-02B 完整对照、RKS-02C 修复及 RKS-02C.2 审批，还有历史人工 Golden 记录。路径及 SHA256 在 [source-index.json](source-index.json)，它们均与冻结起点字节一致。历史 Golden 图片本体缺席，本轮没有重新看图验收。

**A** 是原分析的公开共同 post-composite 适配副本：原硬可见品牌文字第 0/1/3 项移到人工清单，只保留原砂锅/热气短语；原始未适配 Packet 仍被语义门禁拒绝。A 保留现代快餐、旧材料/参数等历史问题供文本诊断，不作为自动执行的生图方案。

**B** 保留当前确认目标，采用有出处的历史经营经验和暖木/赤陶/暖光定性方向；把具体位置、家具关系、英文可观察句等列为实验假设。红砖、自然光和材料工程参数未被冒充成已确认输入。A/B 同镜头任务、模型、镜头来源、16:9、2K、1 张、standard、零参考图、post_composite 完全一致；逐镜头输入变更全部列账。

**B*** 是在正式 B 输出之外，供人审的项目文字建议副本。它不是 Compiler 输出、已确认 Prompt 或获准 Provider 请求；本轮没有为 B* 格式化调用 body，不允许用它覆盖正式 payload 绕过路由/指纹。技术渲染质量与负向身份/clinic 防污染保留，没有一键删除“高端/接待”等词。

完整可重放实验 Packet 在 [experimental-inputs.json](experimental-inputs.json)，正式输出的 SHA256、sourceMap、trace、可见 owner、原始拒绝与逐镜头准备状态在 [compiled-evidence.json](compiled-evidence.json)。这些是仓库历史 fixture 的派生实验，不是当前用户真实项目输入或图 1 实际 Run。原 Packet 的分析来源元数据只描述历史来源，不表示本轮有新模型分析。

## 关键离线审核结果

- dining 的制作、热气、顾客、服务柜台、木质桌椅/通道五类源要求均在允许场景内取得唯一实际 owner，正式与离线 Provider 文本一致保留。完整网络仍为依赖，不强迫包装等全店细节同框。材料/光感是完整的定性设计输入，不以编造精确参数填空。
- entrance 只准备入口位置明确的活动和通往堂食的边界；厨房与完整堂食内景不默认显示，局部堂食视线待人工确认。
- 入口/外立面的 sceneProgram、品牌表达和差异化字段由实验作者逐镜头明确筛选，避免原全局无位置短标签进入当前画面；完整源程序与网络保留在原输入、差异账本和依赖记录中。这不是声称通用 Compiler 已能自动解决所有无位置标签。
- storefront 保留隔窗营业氛围目标，具体厨房可见源句被标 review_required，无 owner/outputText，未进入正式或 Provider Prompt。不能把该句放入请求指令绕过过滤。
- 配色不由原主/辅色排名推定面积，未新增色值或比例；原蓝绿整体禁令和默认浅石/红金属塑料/格栅/射灯等不自动继承为已确认规则。原始记录完整保留。
- RKS 仍为离线 Shadow，卡片保持 candidate/project_observation；B1 只有未来可追踪草案，无保存/确认操作。图 1 实际 Run 关联为 undetermined。

## 验证与保护范围

专项测试 **10/10**，完整 visual-workflow **259/259**，`repo:verify` 和 Golden **5/5** 通过；日志、命令、退出码、耗时和原始/规范化摘要见 [regression-results.json](regression-results.json)。repo:verify 含离线 current-flows（文档准备 2/2、Runtime 1294/1294、Node/Web typecheck）、隔离与 guard 56/56。计数存在重叠，不相加作为独立总量。

根仓库两项历史 repository-policy 仍独立失败，原有两份交付文件及五张栅格图的位置冲突未处理，没有新增栅格图、放宽政策或修改既有期待值。测试与编译文本审核不能证明视觉质量提升，也不能替代本次待签署的人审。

新增文件仅位于本实验报告目录与 `tests/restaurant-knowledge/ftt-final-design*`。生产源码、Compiler、正式 Prompt 资产、完整性摘要、Web UI、B1、P7B、模型配置、Golden、RKS 字典/规则/候选状态及历史验收记录均无修改。`verifyImplementation()` 仍为已审批摘要 `4b8ea1fa7c759bc05a42cf1ffd95e8b321f91aa9dfa63c283256250a4a8c5410`。范围和状态证明见 [scope-and-readiness.json](scope-and-readiness.json)。

真实分析、生图、模型校验、自动重试、参考图输入、网络尝试、用户真实项目读写、凭据读取、合并、部署及发布均为 **0**。未来单张 dining 也须先获得人工确认和明确模型授权；本轮提交隔离分支后停止。
