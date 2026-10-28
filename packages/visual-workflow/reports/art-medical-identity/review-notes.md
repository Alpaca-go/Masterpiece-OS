# 九州美学｜珠光建筑艺术与医美服务身份定向修复

2026-10-19（Asia/Shanghai）。结论：**离线描述与请求链路通过，等待用户审核；没有真实生图或付费校验。** 本轮没有视觉质量验收结论。

分支 fix/jiuzhou-architectural-language，HEAD 7619b4bb551229ebb10cd7dfec3fe05254fcb316，与附件审查基线一致。修改只落在新隔离项目与本报告目录；没有修改生产代码、编译器、Adapter、共享模板、Golden、完整性记录或既有验收。

## 失败证据、设计分析与修复

图1可见完整前台及候客，但木格栅、木家具、单块普通曲面和后方圆桌木椅使医美专业用途难以辨识。这是本轮用户判定失败的图。图2、图3仅用于提炼连续轻薄建筑界面、实体框景、入口与接待候客服务的关系，不复制具体几何、家具和像素布局。三图未注册为项目素材，未输入模型。图片仅保留在本机 .codex-smoke/jiuzhou-art-medical/references/。

旧正式Prompt的可证实缺口：[旧Prompt](../fig2-fig3-spatial-correction/formal-prompt.txt)把建筑艺术收缩为“一至两处干净连续的建筑曲面”“局部少量轻薄分层”，缺少明确起止、方向和主辅层次；后续服务只要求“a small table and paired seats”，没有专业设备。这支持修正文案，不能证明单张图的所有变化由这些字段引起。实际几何、艺术感、医疗服务可辨度和随机性仍待未来真实画面检验。

新字段把侧向建筑—局部上部—候客/面询边缘的一组连续珠光曲面写清，包含完整主曲面、少量辅助薄层、薄边、错层深度和透景间隙。专业服务节点包含一台皮肤影像分析或面询显示设备、专业台面与面对面座位。没有添加展示龛、额外设备、人物、诊室门排、护理床、治疗器械、独立雕塑或硬性尺寸。

## 字段、正式网页与编译保真

9个字段：spatialConcept、structureLanguage、artisticFocus、functionalProgram、functionalNetwork、functionalRelationships、visibleRequirements、compositionRequirements、materialEntries。暖光4字段、全部配色、mustAvoid及后两项材质逐值不变；材质仅第1项改变名称、光学行为与空间职责，禁用表现不变。

- [逐值差异](field-differences.md) / [机器差异](direction-diff.json)
- [原始字段](initial-direction.json) / [最终确认](confirmed-direction.json) / [表单输入](natural-language-input.json)
- [网页保存确认请求](web-input-requests.json) / [确认截图](web-confirmed.png)
- [38项字段保真](field-fidelity.json) / [逐条Prompt定位映射](field-prompt-source-map.json) / [编译器来源映射](prompt-source-map.json) / [完整编译追踪](compiler-trace.json)

使用正式React网页及Node Host完成4轮人工编辑—保存草稿—确认；均走既有业务操作，没有直接写确认JSON。前期离线预演4次未通过严格保真检查，已完整披露于[草拟与失败记录](offline-drafting.json)：咨询场景词引发跨房间投影、隐私句标点分割、留白中的“白”触发颜色分类等。最终用接待主厅内“面询/advisory”准确表达同一专业服务关系，以“透景间隙”描述结构，把光学色彩保留于材质/颜色字段并删除冗余艺术句。未改校验器、未放宽断言；最终38项全部通过。上述为人工离线字段修订，不是模型自动纠错或真实重生成。

最终[正式Prompt](formal-prompt.txt)为11728字符，[Provider Prompt](provider-prompt.txt)为11831字符；Provider仅增加103字符的既有前缀，完整正式Prompt是其后缀，无截断。没有新添密集羽片正向要求，私密治疗保留在画外；未发现相互排斥的正向功能或建筑要求。

通用句“No artistic installation is required by the supplied sources.”仍存在：现有编译器把这些构件归于 Architecture Language，Composition 的独立艺术装置清单为空。该句不要求移除建筑曲面；建筑曲面同时在Architecture Language、Material System及可见设施中被明确正向要求。按本轮定义，其与建筑一体化构件没有直接逻辑冲突，因此未为消除该句而修改生产编译器。它仍有模型理解歧义风险，须由用户本次Prompt审核与未来授权画面验证判断，不能宣称画质已恢复。

## 标准零参考请求与一致性

[请求正文](provider-request.json) / [请求证据](request-evidence.json) / [任务契约](task-contract.json)。Seedream 5.0 Pro，具体model=doubao-seedream-5-0-pro-260628，2K、16:9、单张、standard、referenceAssetIds=[]，Provider无image字段。通过正式编译和Adapter，在注入的内存fetch处截获请求并返回纯白合成fixture；.invalid仅是离线地址占位，未作真实HTTP请求。合成图片不是设计成果，不展示、不作为质量证据；未执行Logo或导视合成。所有项目预演均禁止外网、Qwen和再分析，自动重试/重生成/自动纠正为0。

| 对象 | SHA256 |
|---|---|
| 确认内容 | 9a30125902f48246e0adad56259d8cee52ee324329a60a06b1e56b0e87643495 |
| 确认记录 | c519f9160182f8c13e132d6143eddc1b7cc1052d5bb0d0277e25cef82fab35c0 |
| 正式Prompt | 8f0a50fa9ddd99021757386bd81ccfa8a682b31dfc706e5eb361cdf0ee745805 |
| Provider Prompt | 103832bda3069f24609f619d13dabb280699df58302d006f8724cf557a311ec9 |
| 实际Adapter请求body | f67862d07324bb76057f51a18a945f322363e487769cb85d9ccbd499b2417269 |
| 独立业务实现 | 8e8469e022ed1e2e01bdad208e5e75b9126d35afb46e3ac96e212aaa8c6e6f81 |

Prompt哈希按UTF-8原文，body与确认内容按既有digest(JSON.stringify(value))计算。请求JSON文件包含审计外壳与格式化空白，文件哈希另见artifact-manifest.json，不与body语义哈希混淆。

## 数据保护及回归

[保护证明](readonly-proof.json)：19个已有根目录在创建新报告前逐文件SHA256一致，包含源测试副本、正式项目/历史副本、旧报告和历史图片。新副本原项目资产、原输出及project.json与源副本相同（新方向历史、离线编译产物及其会话状态只存在于副本），仍27个素材，无新增附件参考图。没有读取/复制真实密钥，没有保存Provider原始响应。新副本位置与来源见[范围证明](scope-proof.json)。本轮仅新增报告文件，未Git提交、合并、部署或发布。

[测试结果](gate-results.json)：所属工作流TS 82/82、JS 30/30；repo:verify PASS，其中current-flows 1294/1294、架构及隔离反例56/56；Golden PASS且未自动更新。Golden列出的既有人工状态不构成本轮新验收。[跨行业标准请求](standard-industry-regression.json)：医美、餐饮、酒店3组实际Adapter正文与既有基线完全相同。没有修改宿主、路由、共享设施，无额外功能影响范围。

## 附件第07节逐项验收

| 验收项 | 离线结论与证据 |
|---|---|
| 建筑一体化、局部珠光连续曲面 | 通过：Architecture Language 包含侧向连接、局部上部衔接、起止方向、完整主曲面、辅助薄层、薄边与深度；Material System 保留微弱珍珠母贝内反射。 |
| 没有恢复密集羽片或大型涡旋机制 | 通过：mustAvoid 保持原值；正向为少量错层和间隙，近景退让、大部分顶面与墙体可读。 |
| 完整前台及员工工作关系 | 通过：visibleRequirements 第1项及 functionalNetwork 第1项未削弱，含服务面、员工台面和少量办公设备。 |
| 可使用的成组候客 | 通过：visibleRequirements 第2项及 compositionRequirements 保留沙发、扶手椅、轻桌和绕行，明确不形成临窗茶席主景。 |
| 半开放专业医美服务节点 | 通过：visibleRequirements 第3项及 functionalNetwork 第4项：一处皮肤影像分析或面询显示设备、专业台面及面对面服务座位。 |
| 隐私与医疗内容边界 | 通过：显示界面仅抽象非个人皮肤分析布局，禁止可读随机字、诊断文字、指标、病历、效果承诺和个人信息；治疗活动、护理床及私密室内均不入主厅画面。 |
| 暖白米白、局部浅木、暖光和弱紫可追溯 | 通过：全部配色及4个照明字段逐值不变；弱紫仅在材料内层，曝光与阴影约束不变；仅珠光材质第1项有变更。 |
| Seedream 5.0 Pro / 2K / 16:9 / 单张 / standard / 零参考 | 通过：真实业务编译与Adapter内存拦截预演；model=doubao-seedream-5-0-pro-260628，size=2K，count=1，referenceAssetIds=[]，请求无image。 |
| 旧项目、历史图片、人工验收、Golden及跨行业请求不变 | 通过：19个受保护根目录逐文件哈希一致；生产和Golden无Git差异；医美、餐饮、酒店3组实际Adapter请求与既有基线完全相同。 |

机器清单见[acceptance-checklist.json](acceptance-checklist.json)。以上“通过”只指描述、数据与离线链路，不证明画面达到珠光建筑艺术或专业医美识别目标。本轮真实Seedream=0、Qwen=0、其他付费调用=0；停止等待用户审核，不再调用模型。

归档后复核：再次执行 npm run repo:verify，通过；完整日志位置与SHA256见 gate-results.json。
