# 九州美学建筑艺术融合定向精修：离线审查

日期：2026-10-19（Asia/Shanghai）。分支 `fix/jiuzhou-architectural-language`，基线提交 `5be446d5c32b43275c3013e64c9946d38f29c61d`。

本轮在新的独立九州测试副本中修订了 8 个项目设计字段，通过正式 React 网页编辑、保存草稿、确认、Node Host 标准业务编译与 Provider Adapter 离线预演。没有修改生产编译器、生产 Prompt、Provider 实现、公共宿主或依赖。全部离线检查通过；**这些结果只证明字段传递与请求表达正确，不代表实际视觉质量达标。**

本轮真实生图、收费校验、自动重试及重生成均为 0。原项目、上一轮确认副本、历史真实生成目录、四张校准图、Golden、实现完整性摘要和人工质量记录保持原样。没有合并、发布或部署。

## 视觉诊断与 P1—P4 对应关系

图1为本轮最新结果：右侧近景宽大曲面越出画框并连续延伸到顶，艺术与建筑的连续性成立；但近景大面积表面遮挡、构件尺度相近、候客椅沿边线排列、远端亮景观拱口集中收束，使主厅仍有艺术长廊倾向。前台虽可辨认，员工工作面及到达服务联系仍弱。单张图不能证明模型形成这些问题的唯一原因；以下根因属于项目表达不足的诊断。

图2用于校准建筑界面与上部艺术系统的整体联系；图3用于校准薄边、层间深度、自然透射和局部内层虹彩；图4用于校准真实候客交流、接待服务和后续转场关系。只提取这些关系，不复制具体构图、造型、家具、人物、标识或构造。四图未注册为素材，也未传入 Seedream；其角色与哈希见 [校准范围](./calibration-scope.json)。

| 问题 | 上一轮字段留下的解释空间 | 本轮项目修正 | 实际 Prompt 核查位置 |
| --- | --- | --- | --- |
| P1 体量过大、局部密实 | 强调侧向至上部连续及沿边围合，但主曲面、疏开间段和近景退让的层级不明确 | `structureLanguage`、`artisticFocus`：保留局部建筑尺度大曲面；侧向主次、过渡与透景间段相间；候客过渡处疏开、近景轻薄收束、横向通行开敞 | Architecture Language；Composition；Material System |
| P2 层片宽厚、方向单一 | 有轻薄、精密与透景目标，但缺少大中小尺度及交叠方向关系 | `artisticFocus`、`materialEntries[0].behavior`：大型主曲面—中尺度过渡层片—局部精密薄片；随建筑界面有序变向，清晰薄边、交叠和前后间距，同一珠光材质连续过渡 | Architecture Language；Material System |
| P3 服务组织弱、背景偏度假景观 | “可用前台”“成组候客”“后续入口”仍可简化为孤立家具及背景开口 | `functionalNetwork`、`functionalRelationships`、`visibleRequirements`：建筑界面整合前台，明确访客服务面、员工工作面和到达衔接；成组对坐与小桌，部分离开艺术边缘，保留绕行；可见半开放服务转场连接受屏蔽的咨询及运营入口 | Functional Network；Operational Elements；Cross-zone operational constraints |
| P4 纵深收束、横向不足 | 原构图强调前景到达到远景转场，并写“三者在纵深上相互联系”，有继续线性化的空间 | `structureLanguage`、`compositionRequirements`：接待与候客沿主厅横向舒展连接，实体局部退让与错位界面构成背景递进；中心和侧向均通行，正常建筑摄影透视 | Architecture Language；Composition & Photography |

完整前后原值见 [字段级差异](./direction-diff.json)。主厅以正向空间关系表达宽度，没有指定任意建筑尺寸。原有禁止项保持 13 条，仅替换两条，使其涵盖近景厚重艺术墙和景观拱门代替商业服务转场的问题；材料禁止项没有增加。

## 已获方向性认可内容的保护

- 第一条主艺术系统描述完整保留：竖向界面—上部边界—候客围合连续衔接，沿建筑边缘展开，不回到中央独立雕塑。
- 竖向建筑比例、上部自然采光及撤去层片后仍成立的建筑秩序原句完整保留；新增横向关系没有用单纯加高来替代。
- `spatialConcept`、`functionalProgram`、全部 `colorEntries`、`colorAvoid`、全部四组光影字段逐值相同。暖白乳白主色、浅暖灰辅助色、品牌紫仅为局部内层及少量细部，主要软装保持中性。
- 半透明珠光材料名称、建筑职责及禁止项原值相同；自然光分层透射、细腻反射、轻薄层叠深度与内层弱紫虹彩四条核心光学原句保留。暖白矿物背景材料全部字段相同。
- 保留双侧密集房门狭长走廊、普通医美模板、中央厚重团簇、重复拱券、紫色发光描边、超广角畸变等原有边界，没有新增第二套主艺术语言。

逐项哈希与正式/Provider Prompt 命中证据见 [气质及融合保真](./atmosphere-and-integration-fidelity.json)。这些证明涉及意图和表达，不能证明未来图像一定执行。

## 正式网页与标准请求证据

新隔离环境：`.codex-smoke/architectural-refinement/confirmed-browser/user-data/visual-workflow/`。项目 ID 延续副本原 ID，但数据根独立，不覆盖正式项目。只复制明确的项目输入与必要报告；凭据没有读取或迁移，测试配置仅为不可用的合成配置。

复用既有 `capture-design-direction-editor.mjs`，真实网页填写自然语言及结构化颜色、材料控件，通过正式操作保存并确认；没有直接注入 confirmation JSON。网页还验证了范围不明确的草稿无法派发、修正后可以确认，以及 Host 重启和页面重载后确认仍有效。

取证材料：

- [完整正式 Prompt](./formal-prompt.txt)、[实际 Provider Prompt](./provider-prompt.txt)、[实际 Adapter 请求](./provider-request.json)
- [确认记录](./confirmed-direction.json)、[任务契约](./task-contract.json)、[有效 Packet](./effective-packet.json)、[编译追踪](./compiler-trace.json)、[源映射](./prompt-source-map.json)
- [网页结果](./browser-result.json)、[网页保存请求](./web-input-requests.json)、[34 项字段保真](./field-fidelity.json)、[输入原文](./natural-language-input.json)、[网页确认截图](../../../../.codex-smoke/architectural-refinement/confirmed-browser/confirmed-standard-generation.png)
- [标准请求检查](./request-evidence.json)、[只读及资产证明](./readonly-proof.json)、[范围证明](./scope-proof.json)

请求保持 `generationBasis: standard`、`referenceAssetIds: []`，没有 `image` 字段。模型 `doubao-seedream-5-0-pro-260628`，2K、16:9、接待入口场景、单张。Provider 请求体只有原有 `model / prompt / size / response_format / watermark`。四图文件路径、参考 ID、图片内容均未进入该请求；原有项目资产清单不变，未新增参考注册表。既有四图参考能力及业务实现保持原样，通过原有独立工作流回归验证。

预演经过真实 Adapter，但外部传输由既有测试替换为本地合成响应，实际外部 Provider 调用为 0。一个模拟图像响应和一个模拟校验响应仅用于验证正式业务完成、字段及请求，不属于真实图像或真实质量校验。

## 编译边界、失败与处理

首次定点测试没有通过逐句保真：`functionalNetwork` 将后续咨询入口与员工绕行放在含分号的长句中，现有跨区规则将其拆分进入当前镜头边界区；含“咨询”的建筑句也会被跨区投影拆分。未删断言、未改 Golden、未改生产编译器。

本轮采用已有字段职责解决：建筑字段和可见设施只描述本镜头的半开放服务入口与界面；`functionalRelationships` 明确咨询及运营入口、隐私和其他房间不入镜。四项空间关系及全部原字段现在均进入实际 Provider Prompt，34 项保真全通过。复现原输入与拆分现象见 [编译表达边界](./compiler-expression-boundary.json)。这是既有投影行为的表达边界，不宣称本轮修复了通用编译能力，也没有需要扩大生产修改授权才能完成的遗留阻塞。

首次网页运行在填写旧空字符串字段 `materialLanguage` 时失败：当前结构化编辑器没有该旧控件。删除输入文件中的两个无实际控件的空旧字段 `materialLanguage / colorPolicy`，继续使用规范的材料及颜色数组；确认结果仍将旧字段规范化为空值，与先前确认记录一致。另有一次启动在父目录不存在时终止，尚未执行网页或业务操作。全部失败均留在本地日志，成功取证使用新的输出目录，不覆盖历史记录。

归档后补跑仓库文件政策测试，发现新复制到报告目录的网页 PNG 不符合栅格图片路径规则。已移除该新增副本，网页截图继续保留在原忽略取证目录并由本文链接；没有改动政策或增加豁免。随后重跑该政策测试通过。

## 离线工程验证

详细退出码、计数及日志摘要见 [验证报告](./gate-results.json)。

| 检查 | 结果 |
| --- | --- |
| `npm run repo:check` | PASS；含 `repo:verify`、current-flows、隔离反例守卫、根测试、CLI、Runtime、浏览器 smoke 与 Golden |
| 根公共契约 / CLI | 1701 / 40 PASS |
| Runtime 应用 / Runtime 核心 | 1294 / 14 PASS |
| 独立视觉工作流完整 `.ts` + `.js` 测试 | 106 PASS，含本轮 2 项及既有四参考图能力 |
| 医美、餐饮、酒店三个标准请求回归 | 三个实际 Adapter 请求体与原已审查基准逐值一致；[证据](./standard-industry-regression.json) |
| `npm run web-runtime:test` / `npm run web:build` | 15 PASS / 构建 PASS |
| `npm run verify:space-golden-boundary` | PASS |
| Golden | PASS；既有 NOT_APPLICABLE / NOT_READY 状态保留，未更新基准 |
| 最终 `npm run repo:verify` | PASS；归档后的文件政策专项复查亦通过 |

没有生产改动，因此没有公共宿主、路由、传输、依赖、创意策划或视觉迁移实现影响范围。跨行业实际请求比较和隔离守卫同时提供回归证据，不以实现哈希未变替代质量验证。

## 下一次单张真实生图预检与停止

[十项离线验收](./quality-goal-checklist.json)已核查。[单张真实生图预检](./generation-preflight.json)记录新测试副本、确认及请求摘要、模型路线、标准零参考图条件和后续前置条件。

下一轮只有在用户另行授权后，才可为新隔离环境显式配置模型并重新核对确认、实现及请求体摘要，执行授权的一张 Seedream 5.0 Pro 图像。收费校验不包含在本轮或未来单张生图的默认授权中；不自动重试、重生成或纠正。配置可用性、当前费率和真实模型表现均未离线验证。

仍未解决的实际质量问题：模型能否同时保留大型曲面张力、薄片精度、服务功能及横向主厅，需要未来真实输出和用户人工审核。当前仅可确认文本与业务链路表达成立，不更新人工质量状态、不标记质量恢复、不冻结最终视觉验收。

本轮停在离线审查交付，等待用户审阅修正内容及另行授权。
