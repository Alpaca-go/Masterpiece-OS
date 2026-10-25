# RKS-02B 冯烫烫完整方向对照

B 的项目定位与用户目标一致性有离线字段证据，但 A、B 均未达到真实生图前输入验收条件。编译成功不等于场景正确或视觉质量通过。本次没有新图、没有质量分数。

## 输入与控制

冻结起点：`3b02af4859eecb189b593b11bc81ab27cf6c3228`。全量历史 Packet 的字节副本、SHA256、A/B 输入和每项差异见 [来源与输入账本](fixture-provenance.json)。主样本不使用 Example Brand、咨询接待 Fixture 或 RKS-02A 的通用编译样本。

原始 Packet 在三个镜头均被现有语义门禁拒绝：`ANALYSIS_SPATIAL_SEMANTICS_INVALID`。为了比较方向，A/B 共同将原 mustBeVisible 的第 0、1、3 项品牌文字转至后期合成人工清单，仅保留第 2 项“明档内的砂锅/热气”。这是一项公开的共同实验适配，不能称为原始 Packet 可直接生成。B 的经营行为英文句是另行登记的项目观察假设，不是假称原中文字段已被无损保留。

每个镜头内 A/B 的完整任务逐字相同：Seedream 5.0 Pro、standard、16:9、2K、1 张、零参考图、post_composite；相同 subtype、shot、shotSource 和指令。三个镜头之间只采用预先登记的视角表达；没有按组改镜头、提供参考图或改测试项目。

- [entrance / entrance_view](prompts-entrance.md)
- [storefront / front](prompts-storefront.md)
- [dining / three_quarter_wide](prompts-dining.md)

## 设计方向审核矩阵

| 审核维度 | A：保留历史分析 | B：离线方向副本 | 结论与证据边界 |
| --- | --- | --- | --- |
| 产品与业态 | 行业字段确为川菜小吃/跷脚牛肉，但 Commercial Purpose 仍为“快餐与小吃服务” | Commercial Purpose 明示社区临街特色小馆，亲民、堂食为主兼外带 | B 定位对齐；不是现有经营比例的事实确认 |
| 制作、服务、顾客、餐桌 | 原 Packet 已有点餐→明档制作→取餐→就餐、外带包装，绝非咨询中心结构 | 保留相同功能节点与网络，另显式选用历史经营观察的制作/热气/桌边就餐假设 | 合理关系的目标存在；物业与开放厨房条件仍 unknown |
| 空间气质 | 原分析本来已有温暖、开放、热气、烟火气；不能把 A 描绘为完全冷淡 | 强化社区、温暖、亲切、市井日常；不再强制灯笼/入口厨房/环绕台 | B 方向更清楚，未证明图像更好 |
| 品牌与文化 | 冯烫烫、跷脚牛肉与四川小吃来自历史资料；灯笼是分析提案 | 品牌/地域目标来自用户，保留产品识别；文字后期合成待审 | 未授权虚构非遗、老字号、地域装饰符号或消费者故事 |
| 材料、光、色 | 浅木、红金属/塑料、浅石材/瓷砖；3000–3500K/射灯等均是历史分析提案 | 材料名称及行为、光照参数、色彩体系与 A 相同；只登记去除材料品牌用途中的招牌/灯笼强制关系 | 红砖/暖木/赤陶候选独立审核，缺少新材质行为不能执行 |
| 镜头作用域 | 原中文砂锅/热气无可执行 owner；入口仍把含就餐区的完整网络投为当前镜头 | 堂食经营行为可执行；入口三条经营行为均因 off-frame 过滤；外立面未解析却保留室内活动 | 场景级阻塞，不允许以保留数量宣称 B 优胜 |
| 跨行业污染 | 正向功能节点未见咨询/酒店接待；通用模板有 reception/waiting/privacy 语境 | 同样存在通用语境、可选 gallery-like 与 premium/high-end 气质 | 区分正向功能污染、通用措辞偏向、negative clinic guard；后者不是临床功能 |
| 未确认推断 | 明档、材质光学、格栅和厨房关系均是历史提案，非已验证物业事实 | 新增内容是目标/显式实验假设；没有新增客群、尺寸、物业事实或材质技术参数 | 实际布局、客群、开放厨房许可、材质行为仍 unknown/review_required |

## 经营行为字段

以下只验证文本归属和镜头投影，不评分视觉质量。完整 sourceMap、投影、owner 与最终保留状态见 [编译证据](compiled-evidence.json)。A 的“明档内的砂锅/热气”三次均为 unresolved_visible_requirement，未进入正式 Prompt。B 的三句使用项目级历史观察的明确英文表达。

| 镜头 | B 源值 | 场景投影 | 正式及 Provider Prompt | 原因 |
| --- | --- | --- | --- | --- |
| entrance | chef preparing food in kitchen | off_frame_dependency | 不渲染 | foreign_scene_entity |
| entrance | steam above dishes in kitchen | off_frame_dependency | 不渲染 | foreign_scene_entity |
| entrance | customers dining at tables | off_frame_dependency | 不渲染 | foreign_scene_entity |
| storefront | chef preparing food in kitchen | unresolved | 保留 | current_executable_owner |
| storefront | steam above dishes in kitchen | unresolved | 保留 | current_executable_owner |
| storefront | customers dining at tables | unresolved | 保留 | current_executable_owner |
| dining | chef preparing food in kitchen | current_shot | 保留 | current_executable_owner |
| dining | steam above dishes in kitchen | current_shot | 保留 | current_executable_owner |
| dining | customers dining at tables | current_shot | 保留 | current_executable_owner |

## 仍存在的错误方向和阻塞

A 仍有快餐升级的 Commercial Purpose、强制灯笼和明档文字贴图方向；共同后期适配并未清除 A 的其他文字载体提案。B 没有把这些提案当作餐饮必备要素，但正式模板仍有 reception/waiting/privacy、gallery-like、premium/high-end 等措辞，需要独立审核其风格影响。它们不构成已证明的咨询室或酒店功能节点。

storefront 的 targetScene/targetProgramId 缺失、viewStrategy 为 null，用户显式 front 被 trace 记为 legacy_project_default，门禁却 pass；三个室内行为全部以 unresolved 投影进入最终 Prompt。入口已正确过滤英文人物行为，但历史“点餐区 -> 明档制作区 -> 取餐区 -> 就餐区”仍被视作 current_shot。不能仅验证 subtype/shot 或三句英文就宣称场景保真。详见 [独立变更提案](protected-change-proposal.md)。

B 沿用的半通透木格栅、金属高反射、塑料哑光、3000–3500K、射灯等来源是 AI 历史分析，并未得到本轮材料验收。暖木/赤陶的历史验收也不能替它们确认参数。候选红砖/赤陶未写入材料系统。

## 未使用知识与同质化风险

rks-observation-3 仅显式选中作项目审核，缺可执行材质行为，材料应用保持 withheld。rks-observation-5 只在 B 中作为待审经营观察假设选用，未晋升。其余知识没有被本轮新增应用；RKS-02A 分类/冲突规则和知识状态不变。

不要由川菜/亲民/社区/高效出餐推定红砖、灯笼、复古或极简；不要把历史单图材料验收扩大为行业规则；通用 gallery/high-end 模板也可能将不同品牌推向同一空间气质。现代连锁川味快餐保留现代高效方向，外带档口无需完整堂食区。六类反例含显式跨项目知识注入拒绝结果见 [跨项目记录](cross-project-results.json)。

当前结论：B 的定位字段对齐已得到离线验证，完整生成输入仍需解决场景边界、模板措辞和未审核材料参数；真实生图前验收为未通过，等待设计师审核。
