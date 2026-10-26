# 分析成功后的 saveDraft → confirm → capture → 正式 Prompt 冻结流程

当前仅交付流程，所有步骤均未在隔离项目执行。新分析成功不会自动赋予生图权限，也不会把 RKS Shadow 变成正式自动餐饮分类。

## 1. 验证真实分析成功

同一 guard 会话账本必须有两条真实请求、合法 request ID、usage 和状态，原生 POST 不超过两次。记录配置 Provider、实际响应 model 字符串、终态、模型调用数、耗时、报告路径、composition 结果以及基于 usage 的估费/未对账状态。

重新读取正式项目，应为 `status=completed`、`visualContextVNextStatus=ready`。核对本次 Packet/上下文 projectId、sourceFingerprint、schema、空间语义/充分性以及最终正式报告。报告存在或 ledger=`closed` 单独均不足以证明整个结果有效。区分项目 ID、DCD run ID、UVU run ID 与本地 repair-run ID，不把本地 ID 当 Provider request ID。任何失败停止，不能写 completed/ready 来绕过门禁。

审计交付只存允许的脱敏字段与正式成果的摘要，不提交原始响应、凭据、Base64 或未经授权的用户数据。真实响应若被正式 Pipeline 留在 ignored runtime 文件中，不将其加入 Git。

## 2. 将新证据与 E0 用户目标逐字段对照

| E0 保留目标 | 审阅要求 |
| --- | --- |
| 社区临街四川特色小馆 | 继续作为用户目标；位置、面积、结构、开口等未知物业条件不能伪造 |
| 亲民堂食、市井烟火气 | 保留经营尺度和真实使用关系，不能因新模型提案自动转为高端餐厅 |
| 四川地域文化 | 与本项目业务相连；新增故事、纹样、文字需要依据或用户明确确认 |
| 开放明档、真实经营活动 | 保留厨师、食物/热气、柜台、顾客与餐桌之间可观察关系，未知设备规格保持未知 |
| 红砖、暖木、赤陶、浅抹灰 | 项目级候选，分别确认材质行为、载体/范围及职责，不提升为现状材质事实 |
| 温暖人工光、自然光设计假设 | 人工照明保留温暖目标；自然光必须标注设计假设，不编造已有窗位/朝向 |

新分析中的 model_proposal 和用户确认目标分别保留来源。对新增、冲突和不能无损映射的字段形成差异表，交给用户决定，不自动用 analysisSuggestion 覆盖 E0。

## 3. saveDraft

通过正式 `createProjectDesignDirectionStore(projects).get(projectId)` 读取最新 `recordSha256`、`analysisFingerprint` 和 validationIssues。缺省方向本应为 missing，不能手造 confirmed JSON。

使用现有 `saveDraft(projectId,{expectedRecordSha256,sourceStatement,fields})` 保存用户目标与已审阅字段，或提交适用的正式 confirmation 数据。`sourceStatement` 明确“用户设计目标 / 非原始品牌或物业事实”，引用 E0 和本次差异审阅范围。颜色逐项记录 paletteRole/role/surfaceApplicability/spatialUsage；材料逐项记录 material/behavior/brandRole；功能节点、连接和关系分别填写，不合并成同一句。保留自然光假设的来源说明。当前未准备一个假装已与新 Packet 绑定的草稿。

## 4. confirm

用户审阅草稿及差异后，按明确确认范围调用 `confirm(projectId,{confirmedByUser:true,expectedRecordSha256:草稿最新摘要})`。正式实现必须继续检查 completed/ready、Packet projectId、semanticIssues 和 applyUserConfirmedVisualDecision。record 冲突或分析指纹变化时停止，重读并重新确认，不直接修改 B1 或跳过门禁。

E0 的设计目标已确认，不代表用户预先批准未来分析新增/冲突字段或新的记录绑定；本次分析授权也不自动执行 confirm。

## 5. capture

调用正式 `capture(projectId)`，保存真实 `confirmation` 和 `snapshot`：projectId、recordSha256、confirmationSha256、analysisFingerprint、source、confirmedAt。核对这些值与刚确认的正式记录相同。缺失、needs_reconfirmation 或 stale 时停止。不得复制 E0 或其他项目的旧 snapshot 冒充本项目绑定。

## 6. 正式 Compiler 纯编译并冻结

经用户明确批准后，在独立 workflow 中使用现有正式 `visual-workflow:compile` / Compiler / Adapter 做纯编译，不改源码。现有 standard space 编译会自行调用相同 direction store 的 capture，并写 `project-design-direction.json` 快照；必须与上一步比对。

沿用已审阅的未来生图范围：Seedream 5.0 Pro、standard、dining / three_quarter_wide、16:9、2K、1 张、`referenceAssetIds=[]`、无 continuation、Logo/品牌文字 post_composite。具体模型/场景字段仍以现有契约校验和用户范围为准，不能因此安装新模型配置或探测模型。原始十图只用于分析，不能隐式放入 Seedream 生图请求。

从真实编译目录冻结并核对：

- 最新 ProjectRecord/输入、Packet、正式上下文和来源 fingerprint。
- `project-context/design-direction.json` 的摘要与 capture 的 confirmation/snapshot。
- `task-contract.json`、`effective-visual-decision-packet.json`、`project-design-direction.json`、`prompt-source-map.json`、`target-scene-projection.json`（若存在）。
- `compiled-prompt.json` 中的 finalPrompt、实际 Provider prompt、`compiled-prompt.md`、`model-payload.json`、`provider-payload-preview.json`、`trace.json` 和 Logo 后合成计划。
- 每个文件的实际 SHA256；finalPrompt 与 payload.prompt 的一致性；trace 的 promptHash、sourceFingerprint、recordSha256、confirmationSha256、analysisFingerprint 之间的对应。

运行现有离线门禁，保存 E0 → 新分析证据 → 用户确认 → Effective Packet → 正式 Prompt 的来源链与差异。Prompt/Golden/完整性记录不自动更新，质量验收不自动变成通过。

## 7. 停止并提交人工审阅

提交新鲜冻结清单和差异结果，**等待独立生图授权**。历史单张生图额度不能自动复用，分析成功不触发生图、模型校验、RKS 晋升、部署或发布。任何未知费用、usage 缺失、素材/身份变化、确认冲突或编译不一致均停止，禁止为成功追加调用。
