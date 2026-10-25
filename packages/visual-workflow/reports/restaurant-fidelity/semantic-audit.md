# 餐饮语义污染与方向保真检查

审核对象是完整历史餐饮 Packet 的派生 A/B，不是图 1 实际执行。`confirmed` 只表示有离线输入或编译记录支持；不代表视觉效果通过。字段级原值、投影、sourceMap、owner 和保留情况见 [编译证据](compiled-evidence.json)，全量输入及每项方向差异见 [来源账本](fixture-provenance.json)。

| 结论 | 状态 | 原始证据与边界 |
| --- | --- | --- |
| 主样本确实具备餐饮语义 | confirmed | projectFacts.industry、brandRole、sceneProgram、functionalNetwork 直接来自完整历史 Packet；原项目 GUID 保留。没有借用咨询中心骨架。 |
| 四川小吃/跷脚牛肉的产品、点餐→制作→取餐→就餐关系已在 A 中存在 | confirmed | 产品定位、功能链和外带包装是历史输入；不能为了衬托 B 而抹去 A 已有的餐饮语义。 |
| A 的快餐商业角色与 B 的确认目标有方向差异 | confirmed | A Commercial Purpose 仍为快餐与小吃服务；B 对应字段明确社区临街特色小馆、亲民堂食为主兼外带。此差异不意味着现代连锁快餐应被禁止。 |
| B 没有新增顾客画像、物业尺寸或实际经营比例事实 | confirmed | 逐项差异可从 A 重放为 B；新增表达标为目标或实验观察，unknown 账本明确保留。品牌角色投影标为 proposed、confidence=0，未伪造确认来源。 |
| 未发现咨询/诊疗/酒店接待正向功能节点 | confirmed（限已检查字段） | 检查 sceneProgram、functionalNetwork、functionalRelationships、mustBeVisible、peopleBehavior；另外逐块审阅完整正式/Provider Prompt。并非宣称所有自然语言已被自动理解。 |
| 通用模板存在接待/隐私语境及画廊、高端气质措辞 | confirmed | Architecture Context 的 practical reception/waiting/access/privacy，Architecture DNA 的 gallery-like，Task/Rendering 的 premium/high-end。它们是语境或气质偏向，不是已生成的咨询室。 |
| 通用模板会造成实际视觉同质化 | undetermined | 只有文本风险证据；没有生成图片。不得用词频或长度替代视觉审查。 |
| 负向 clinic guard 等于跨行业经营节点 | 不成立 | negative_constraints 内的否定词是防污染规则，不能当作正向诊所功能。 |
| 入口已正确过滤 B 的三条英文室内活动 | confirmed | 明确 kitchen 上下文及 tables 行为被投为 off_frame_dependency，不渲染。它不证明入口的所有关系都正确。 |
| 入口完整中文功能网络的镜头分类有问题 | confirmed（离线分类） | 含“就餐区”的完整链条仍为 current_shot；是否因此使真实图像暴露完整室内为 undetermined。 |
| 外立面通过编译却缺少场景权威 | confirmed（离线分类） | storefront/front 的场景和程序标识缺失，三个室内活动 unresolved 仍被输出，必须先解决或取得独立受控方案。 |
| B 红砖、暖木、赤陶候选已经可执行且通过新验收 | 不成立 | 项目候选已选中作审核，但新增材料行为未知，未写入 materialSystem。历史验收不能授权新参数。 |
| 半通透格栅、3000–3500K、射灯、反射行为已获当前项目确认 | 不成立 | A/B 共有历史 AI 提案，仍需审查。未新增这些参数，也未将其标为当前用户确认。 |

原始 Packet 的品牌硬可见文字被 gate 拒绝；共同 post-composite 适配及 B 的英文经营假设都明确列账。不存在把实验修正冒充原始 Packet 已通过、把三句英文冒充原中文无损保留、把历史 Golden Prompt 冒充本次实际请求的归因。

下一阶段先审核[受保护变更提案](protected-change-proposal.md)、候选材料与完整输入。入口、外立面和堂食应分别验收；全项目依赖关系不等于当前镜头必须全部可见。图 1 的实际 Run 继续 `undetermined`。
