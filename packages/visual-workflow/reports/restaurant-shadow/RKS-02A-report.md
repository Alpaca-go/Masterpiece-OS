# RKS-02A · 餐饮知识与设计方向只读 Shadow 集成

日期：2026-10-24。冻结起点 `3bcac082dbf4371a0938bb20db9b1bb52f13fd01`，独立分支 `codex/rks-restaurant-direction-shadow`。本轮实现完整的结构化离线实验链路；**没有正式启用 RKS，没有实际图像质量或图 1 根因验收**。

## 实现与数据契约

新入口是 `offline/restaurant-knowledge/index.js` 追加的两个纯导出，原文件内容逐字节保留为新文件前缀，不复制旧分类器或引入模块导入边。实验没有文件/网络 I/O、Provider、生产注册、项目存储、隐式全局设置或后台同步。契约见 `offline/restaurant-knowledge/SHADOW_CONTRACT.md`。字典、原型、冲突代码、候选知识卡及旧方向草案均未改；shadow-rules 的三个新增 Tag 仅在显式传入的实验资源副本内使用。

第一阶段只绑定原始资料/确认目标 document 的确切字段，不接收 Packet。第二阶段独立读取已提供的同项目 Packet；精确别名可确定性归一化，其他自然语言只有在显式 reviewedMapping 的项目归属、原文值与证据引用都匹配时才产生提案 Tag。此映射由离线审阅者提供，不能冒充模型自动理解。任何分析 Tag 均保留 analysis_proposal / probable，不能进入初始事实或替代用户目标。

输出串联分类边界、原型、候选适用性、冲突/相容记录、修正建议、来源及未知项，最后生成 proposed_offline 的 B1 建议 envelope。已确认目标字段与历史/candidate 建议分开存放；后者从不自动写进 fields。冲突目标不采用最后写入覆盖。当前 verification 与指纹均为调用方声明，原型不认证外部证据的真伪或人员身份。

## 冯烫烫 Tag 与来源

`ftt-shadow-result.json` 和 `evidence-index.json.sourceLanes` 记录完整路径与引用。固定用户目标形成四川小吃、跷脚牛肉、社区特色小馆、临街目标、堂食为主/兼顾外带、亲民实惠/地方特色、市井烟火、四川地域等 Tag，匹配 AR01 社区地方小馆原型。

这些都是本轮明确确认的**设计目标**。本例没有独立可核实的原始物业/客群事实，因此 originalVerifiedFacts 为空，实际物业与客群保持 unknown；没有把“社区临街”目标改写成实测物业，没有生成面积、租赁条件、人口画像，也没有从四川或社区推导复古装修、红砖或暖木。

历史 Packet 用作带原文件 SHA256 的只读 fixture。其原 projectId 与离线实验别名的映射在 fixtureProvenance 中公开；没有编辑原文件，也没有用该历史 ID 代填图 1 的实际 Project/Run。

## 分析方向冲突矩阵

`direction-conflict-matrix.json` 覆盖四个审查方面：

| 方面 | 观察与判定 |
| --- | --- |
| 项目定位 | 历史“传统川菜馆 → 现代川味小吃快餐”全文通过显式精确映射成为升级提案 Tag，与确认的社区小馆目标配对产生 RKS-CF-002 / P0，要求人工审查。不是“现代风格天然冲突”的行业规则。 |
| 经营方式 | 结构化 sceneProgram 中堂食/外带支持存在性，与目标形成两项限定相容记录；不能证明主次占比、座位数或效率型视觉。 |
| 空间建议 | 历史 spatialConcept 已有温暖、开放、可见制作等文字；没有全部判错。未映射的整段空间/关系文本标 review_required，保留原文，不伪装为自动语义审核通过。 |
| 品牌气质 | 对“实惠”的显式映射与亲民目标相符，形成第三项相容记录；品牌角色与气质长文仍待审，不转成材质/风格硬规则。 |

冲突同时保留用户目标、分析原文、sourcePath 和两侧证据。修正建议是保留确认目标并审查提案，不更改原分析或已确认方向。旧八类根因矩阵未更新，图 1 实际 Run 关联保持 undetermined。

## A/B 与 B1 / P7B 离线对照

`offline-comparison.json` 同时保存：历史 Packet 的现有 B1 纯投影（非实际 UI 状态），以及一对受控合成输入的 A/B。共同输入使用通用结构化 fixture，明确标出从历史 Packet 复制的提案、spatialConcept、材质及光照字段；**不是完整的历史项目输入**，也不是图 1 请求。A/B 使用完全相同的原始输入、模型元数据、指纹、任务、Seedream 5.0 Pro、16:9、count=1、standard、零参考图。

A 是现有 B1 对共同输入的只读草案和原始纯编译结果。B 保留原输入，另建修正草案；其确定目标来自 Shadow 的用户目标字段。为了检验经营要求的编译保留，B 还**显式采用一个未确认的离线观察假设**：把项目级 historical observation 中的料理/热气/就餐关系转成可观察条目。该翻译是测试作者写出的假设，不是自动提取、人为确认记录或知识晋升。没有更改 B1 生产逻辑、P7B 策略或 Compiler。

| 评价 | A / B 结果 |
| --- | --- |
| 项目类型与目标 | A 保留既有分析/B1；B 的空间意图明确引用社区特色小馆等用户目标。原升级提案仍在原输入供审查，不被悄悄擦除。 |
| 经营行为与关系 | A 没有本次三项可观察假设；B 的显式假设由既有 owner/scope 规则编译。入口两组各保留 2/3，堂食两组各保留 3/3，正式与纯 Provider Prompt 一致。 |
| 品牌识别/地域 | B 的四川、跷脚牛肉、市井方向来自明确用户目标；没有生成新的品牌字形或额外文化符号。 |
| 材质与气氛 | A/B 编译材料与光照完全相同，保留有来源的分析提案。红砖、暖木、赤陶、暖光仅列项目级 candidate 建议；未明确 compiler-ready 材质行为，故不自动采用、不编造光学参数。 |
| 未确认信息 | B 的所有采纳是假设/草案，userConfirmedVisualDecision 仍为 null；candidate 不变 validated，物业、客群无新增事实。 |

四组分别是 lobby 默认入口/显式广角，以及 dining 默认策略/显式广角。没有把 operational_dining_view 当输入别名。顾客 dining 句在 lobby 仍合法画外；厨房跨区关系保留边界权限，不强制展示其他区域内部。比较记录完整正式 Prompt、sourceMap、逐条 owner/scope 审计、Provider 前缀及摘要，实际请求 body 除 prompt 外完全相等；没有 image 字段或真实请求。

## 六类餐饮防污染

`six-case-results.json` 沿用原六例，完整结果与专项断言验证：现代连锁快餐保留明确的现代明亮目标；社区咖啡不变四川小馆；写字楼餐厅不自动产生效率快餐 Tag；外带档口不补堂食区；所有跨项目材料候选均被隔离；资料不足时分类与草案保持 unknown/空，不虚构客群、物业、文化。示例“seed-eatery”只是 FTT 目标的合成类比，不因标签或名称相似获得 FTT 项目知识。

候选卡仍为 candidate / project_observation；跨项目未验证的行业概括也不自动执行。所有适用前提、例外与跨项目泛化仍待人工审核。

## 验证、接线提案与停止

新增专项 17/17、餐饮实验模块回归 32/32、完整独立工作流 193/193 全部通过。`repo:verify` PASS，包含 Runtime application 1294/1294、文档准备 2/2、guard 56/56 及 Node/Web typecheck；Golden 5/5 PASS，Provider calls=0、auto-updated=NO。完整结果、用例、日志路径及 SHA256 见 `validation-results.json`；受保护文件不变性见 `evidence-index.json`。原始日志位于 ignored 的 `.codex-smoke/rks-02a/`。阶段内没有更新任何完整性摘要、Golden 或历史人工验收。

保留首次门禁失败：隔离守卫拒绝新 offline 文件直接 import 同目录 classifier，原因是当前规则仅把 src/ 视为可导入实现边界。本轮没有放宽守卫或使用计算导入，而是删除该导入边，在原单一纯模块追加编排导出；原文件字节前缀核对一致，旧 API 实现未改。调整后的模块回归和完整 repo:verify 均通过。已知两项历史仓库政策冲突沿用 RKS-01G 的独立复现记录，本轮没有处理或放宽；根公共 npm test 不是本阶段要求的运行项，未将其标为本轮通过。

未来最小接口见 `future-interface-proposal.md`：只读建议 envelope，经来源认证、显式选择、现有保存/确认/stale 门禁后才可讨论生产使用。本轮不实现 UI、RPC、分析回调或知识自动应用。已知两项历史仓库政策冲突不在本轮处理范围。

真实分析 **0**、真实生图 **0**、真实模型校验 **0**、自动重试 **0**。不访问用户真实项目或凭据，不上传参考图，不更换模型，不合并、不部署、不发布。完成后停止等待人工验收；本轮不代表冯烫烫视觉质量或实际根因证明。
