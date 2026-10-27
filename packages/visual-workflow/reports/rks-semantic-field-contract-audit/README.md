# RKS 六字段语义契约与编译投影只读审计

日期：2026-10-27（Asia/Shanghai）。仓库：Alpaca-go/Masterpiece-OS。
分支：`fix/rks-semantic-scope-and-operations`。审计 HEAD：`5cd2cd1dfbd9bd5c0608b9972e780d13902a322d`。

**结论：继续 BLOCK，等待人工审核。本报告提出待批准的契约，不实施修复，不启动 E1H，不提交、合并或发布。**

根本问题不是“否定词太多”或“正则不够长”，而是把不同字段中的节点、活动、关系、约束和可见性请求压成同一种肯定命题许可，再让字符串投影改变语义单元。既有作用域修复堵住了 E1G 的真实漏洞，但新的完整命题门禁与已有字段/投影契约不兼容。不能退回来源分类兜底，也不能继续逐句添加项目白名单。

本次新增36组只读内存链路记录及10条跨六字段对照探针。未执行原测试文件；没有创建项目、读真实凭据、调用 Provider、生成图片或修改任何原跟踪文件。探针仅调用本地纯函数，网络入口预加载阻断，记录 `networkAttempts=0`、`realProviderCalls=0`，所有输入前后相同。独立输出与历史报告分开。

## 1. 证据、计数与审计边界

必读历史材料均已核对：

- [修复 README](../rks-semantic-scope-and-operations/README.md)、[FAILURES](../rks-semantic-scope-and-operations/FAILURES.md)、[逐项归因](../rks-semantic-scope-and-operations/failure-attribution.json)、[旧诊断](../rks-semantic-scope-and-operations/failure-diagnostics.json)、[全部测试条目](../rks-semantic-scope-and-operations/test-cases.json)。
- [E1G 独立审核](../rks-02e1g-independent-review/README.md)及46条 independent-probes.json。E1G 报告审核的是 `28a42491…`，修复报告比较的是 `ff3851af…`，本报告审计的是 `5cd2cd1…`；三者不能混为同一次测试。
- 实际 validator、separator、source adapter、target-scene projection、compiler、generation route、完成器接线，以及原测试和本地 fixture；未访问远程仓库或网页。

|证据口径|历史记录|本次解释|
|---|---|---|
|E1F 定向|159 → 147 PASS / 12 FAIL|5项旧契约冲突，7项真正功能回归；逐项见第3节|
|完整工作流|548：498 PASS / 50 FAIL|10项原有完整性阻断 + 5项契约冲突 + 35项回归/混合初始化失败|
|跨行业原文件组|基准69；当前展开43：36 PASS / 7 FAIL|28项未展开，增加2个文件级失败，69−28+2=43；不得记69项已验证|
|完整基准|416：383 PASS / 33 FAIL|33含10个完整性阻断与23个E1G失败；不能用50−33认定17个新增漏洞|
|完整套件数量|416+158−28+2=548|新增158项与文件初始化缺口共同改变分母|
|本次|36组纯函数链路观察；另10×6字段探针|不是重跑548项测试，不是新的通过率|

当前 E1G 原46/46、本轮新增158/158、Golden 5/5 均是**上一轮历史结果**。本报告未重新运行它们。`repo:verify` 本次离线运行仍 FAIL，详见第10节。

完整索引：[TRACE-AND-CASE-LEDGER.md](TRACE-AND-CASE-LEDGER.md)；机器索引：[case-ledger.json](case-ledger.json)。历史50项各有唯一编号；35项未按多个入口/多个发现重复计数。36组探针与50个失败不是一一计数关系，同一输入可解释多项测试；探针还包括被首个失败遮蔽的后续场景。

## 2. 六字段契约矩阵（建议，未经实施批准）

语义类型、命题模态、来源/确认、镜头权限必须是独立维度。字段许可只回答“这是什么要求”，不回答“现场事实是否成立”“用户是否确认”“当前镜头能否看见”。

符号：**主**＝本字段原生支持；**依**＝作为完整关系/约束中的组成部分或保留父来源的投影支持；**存**＝原文与证据保留，但不得作为肯定执行项；**非**＝不以该类型单独执行，应保留原来源并提示字段不匹配，不能静默删除。

|字段|空间节点|经营活动|空间关系|设计约束|可见性要求|尚未确认/未知命题|字段级要求|
|---|---|---|---|---|---|---|---|
|functionalNetwork|主|主|主|依|依|存|允许节点、明确节点链、活动与流线依赖；不是每项都必须有动作。网络不授予同框可见性。未知任一节点不能补造。|
|functionalRelationships|依|依|主|主|主|存|原生为连接、邻接、顺序、通行、服务、隐私/视线关系。裸节点通常非关系；已有投影若只留下节点，必须带原字段/父句与类型，不能要求节点伪装成动词句。|
|mustBeVisible|主（有用途/位置/场景锚定）|主（明确主体与动作对象）|主（可读空间关系）|依（限定可见范围）|主|存|菜单、接待台等合法短语无需改为完整动作命题。普通 equipment / near it 不能凭名词获得用途或位置。视线请求可语义合法但仍 review_required，无可见 owner。纯禁止条款不变成正向必见对象。|
|operationConstraints|依|依|主|主|主（可见/不可见边界）|存|支持 must not expose、remain off frame、无障碍/不交叉等处方式要求。容量、主次与用途是设计约束，不等于经营事实。独立裸活动不自动变为约束。|
|requiredSpatialElements|主|依|依|依|依|存|原生为具名功能设施/空间节点及其限定；不能为了完整谓词而添加用户未提供的操作或位置。装饰/Logo不取得功能设施权限。|
|sceneProgram|主|主（程序/用途）|主（程序内关系）|依|依|存|支持接待大厅、候客区、入口等节点，以及有明确作用域的“区域：节点”程序；项目程序不等于当前镜头，也不证明现场已有设施。|

未知命题“存”不是放行：当前正式分析 ready / 正式任务继续 fail-closed。纯 review 是否可返回不可派发的证据对象，是第8节人工裁定事项；本报告不利用该选项绕过现有 BLOCK。

### 模态必须先分清 A / B

|原句|语义判定|允许保留的含义|禁止的转化|
|---|---|---|---|
|A：员工没有操作设备|否定经营事实/观察；不是肯定可见活动|否定证据原文、来源、否定范围；必要时待审|不得变成“员工操作设备”，不得改成“员工不得操作设备”|
|B：入口不得暴露厨房|设计禁止/隐私约束|边界保护；不增加厨房内部镜头权限|不得因“不得”而当作A；不得将厨房转成必见对象|
|Storefront access must not expose kitchen or dining interiors|明确设计禁止|cross_scene_constraint / current_boundary_only|不得丢掉 must not；不得要求存在厨房镜头|
|入口可能不得暴露厨房 / 尚未确认入口不得暴露厨房|约束内容尚不确定|完整保留为未确认约束|不得仅见“不得”就判为已确认有效约束|
|service relationship remains understandable even when no people are present|对设计可读性的条件要求，否定在从句内|识别完整主句与条件从句，仍需来源审核|不能泛化成“所有包含no的句子都合法”或“经营活动未发生”|
|Only if Logo and staff operating equipment|条件覆盖整个并列命题|整句 unresolved|不能移走Logo后留下肯定动作|

当前 `propositionScope`（separate-space-semantics.js:61）先用全句关键词否决；只有少量固定 without 例外。`functionalRequirementEvidence`（validate-spatial-semantics.js:98）在进入字段约束分支前已受否决，因此扩展末尾 constraint 分支不足以修复B。反过来简单忽略 not/without 会重新打开A和E1G漏洞。

现有 `classification=functional/architectural`、`evidenceClass=system_inference`、`semanticOnly=true` 均不是确认。必须保留：源文件/Packet路径、原始索引与片段偏移、原句、父句/限定范围、`projectFacts` 的 source/status/confidence/evidenceRefs、`provenance`、`userConfirmedFields`。未提供的状态保持缺省/unknown；不得自动补 confirmed。系统目标程序应记 system-authored design program，不能变成用户现场事实。

## 3. E1F 12项历史定向失败逐项归因

下表 H 编号对应原 FAILURES.md。所有原断言保持不变；“应恢复”是方案，不是已通过。

|H|原失败用例（缩写；完整名见附录）|原始字段/字符串|实际阻断与原有预期|归因与处置|
|---|---|---|---|---|
|34|unresolved clauses outside the visible field…|sceneProgram：`Logo吸引顾客点餐`|原断言先期待原始gate pass，再期待完成器 failed/0回调；现在第一处直接block|旧断言冲突C1。最终安全预期保留，原始pass需人工迁移。不是新增正常功能回归。|
|40|source clauses retain exact ranges…|functionalNetwork：`店员在入口递交商品；点餐区 → 明档制作区 → 取餐区 → 就餐区；入口 → 未知节点`|投影仍分别得到current_shot / off_frame_dependency / review_required；低层compile通过，外层原Packet gate拒绝完整句|旧契约冲突C2。范围追踪合理；未知不得执行。是否允许review-only返回待裁定。|
|41|unsafe networks：点餐制作取餐就餐的完整关系|functionalNetwork：同左|投影review_required/空currentShotText；外层原Packet拒绝缺少可解析节点的概述|旧契约冲突C3。不可补造连接或节点。|
|42|unsafe networks：入口 → 无法确定的节点|functionalNetwork：同左|外层原Packet拒绝未知节点；原预期仍能编译出review trace|旧契约冲突C4。未知必须留存并阻断正式执行。|
|43|unsafe networks：whole project operating network|functionalNetwork：同左|缺少可解析节点/关系；外层拒绝，原期待review-only trace|旧契约冲突C5。不是合法明确网络被误识别。|
|44|kitchen relationships cannot inherit…|functionalRelationships：`入口到达；kitchen connects to dining tables`|投影删除画外厨房子句，留下`入口到达`，内层按functionalRelationships拒绝。原期待入口活动保留、厨房不渲染|真实回归：合法节点/关系类型被投影压扁。不是应该让厨房获得边界权限。另 peopleBehavior 的分句正确隔离。|
|45|interior sightline…厨师…橱窗|functionalNetwork：`厨师在厨房制作食品并透过临街橱窗玻璃可见`|投影review_required/none，无输出；低层通过，外层complete_functional_evidence_required|真实回归：完整中文活动+可见性请求未被语义识别。恢复“可审核请求”，不恢复室内可见权。|
|46|interior sightline…入口视线|functionalNetwork：`入口视线可见厨房制作活动`|同上|真实回归，与45共享可见性关系识别问题；不是两个独立镜头授权漏洞。|
|47|an exterior prohibition protects…|functionalRelationships：`Storefront access must not expose kitchen or dining interiors`|投影正确归boundary；外层因negated_scope阻断；原期待条款出现一次、厨房不渲染|真实回归：禁止约束误当否定事实。|
|48|explicit off-frame operational prohibitions…|functionalRelationships：`treatment activity and private room interiors remain off frame`|投影正确归boundary；外层complete_functional_evidence_required|真实回归：词法不覆盖off-frame设计约束。这里不是命中negated_scope；不能把47/48的拒因混写。|
|49|reference-first target program…|系统咨询目标程序，见第6节|原Packet pass；目标覆盖后4条network、6条relationship被内层拒绝|真实回归：目标程序与字段校验不兼容。原合法预期为源餐饮被替换，无owner。|
|50|continuation keeps target program…|同一咨询程序，由continuation override调用buildTargetSceneProjection|本次补充探针得到同样10条拒绝|真实回归，与49同一根因；不是continuation服务或Provider的新独立漏洞。|

补充证据：本次 `scene-logo` 的低层 compiler 也能返回，不意味着正式完成器安全通过；该测试实际先在纯validator断言处失败。不能用低层结果代替完成器或正式路由。

## 4. 35项共享根因分组与去重

|组|历史编号|项数|共同输入/入口|共享根因|
|---|---|---:|---|---|
|G1 建筑/已确认方向|2–11（排除12）、13–16、18–19、25–28，即2,3,4,5,6,7,8,9,10,11,13,14,15,16,18,19,25,26,27,28|20|7个表单；art-direction与project-design-direction共用jiuzhou-art-direction/project-input.json|长关系、用途、并列/指代、节点未覆盖；部分without/no设计条款误否决。都停在compiler.js:334，尚未测到各自的资产篡改、模型变更等断言。不能报告为20个资产/Provider漏洞。|
|G2 功能动线|17|1|design-decision-fidelity：`Flowing visitor circulation`|带用途节点误要求动作命题；原要求保留动线且不生成几何动作。|
|G3 custom预览|21,22,23|3|customInput同一`展示界面连接比较工作台，服务通道位于两侧`|中文完整关系语法不足；custom不做镜头切分，没有先前条件被丢失。|
|G4 FTT共同初始化|24,31|2|custom-compatibility的mapped-scene测试及ftt-fidelity文件均调用compareFidelity|同一次entrance/A编译投影把完整关系切成两个目的残句；不是customInput中文关系问题。|
|G5 final-design混合阻断|32|1|compileFinalDesign首个dining/B|待确认位置应阻断；同时合法厨房/餐桌/外带关系被误拒。只能称混合阻断，不能要求整个fixture无条件通过。|
|G6 B1离线对比|33|1|compareShadowDirections首个lobby/proposed|三分句投影后剩`takeaway handoff keeps a clear route`；该尾句有明确用途/动作关系，词法误拒。|
|G7 节点残留|44|1|入口/厨房关系投影|节点合法但仍装在关系字段；需保留父类型，不能补“入口连接…”|
|G8 视线请求|45,46|2|两条中文视线，外层原Packet校验|语义合法性与镜头授权混在一起；投影review行为正确。|
|G9 设计禁止|47,48|2|外层原Packet校验|否定模态与约束词法失配；boundary投影正确。|
|G10 目标程序|49,50|2|buildTargetSceneProjection，经reference-first/continuation共用|内部生成的设计程序与门禁类型失配。|
|合计||35||10个排他输入组，不等于10个独立生产漏洞。|

去重后的实现根因：

1. **字段/类型契约失配**：节点、复杂关系、活动、容量/用途都走受限肯定语法。G1/G2/G3/G6/G7/G8/G10复用同一许可实现；不同自然语言例子是覆盖证据，不逐个立漏洞。
2. **模态与作用域混用**：全句条件/否定否决没有区分事实否定、设计禁止、约束内从句。G1/G9/G10与E1G必须成对验收。
3. **投影切断语义依赖**：scopeSourceEntries按标点切句，无实体的片段默认current_shot（storefront特例除外），projectList只返回字符串。G4/G5已证实丢失主语/依附关系，G7暴露类型丢失；G6需要同时处理子句关系和词法。
4. **入口与执行证据契约不一致**：低层门禁只收三字段，外层晚些检查原Packet六字段，目标程序有覆盖，review/画外与formal ready界限没有显式统一。这解释5项旧冲突与35项的不同失败位置；不能通过关闭任一gate恢复表面通过率。

10项B0完整性阻断另列，不归入这35项：H1,12,20,29,30,35–39。它们仍未到语义/假Provider派发阶段。双请求guard时序波动、历史Golden边界告警也保留原账，本次没有清理或代修。

## 5. 28项未展开测试的共同初始化依赖

完整28项名称与文件归属见[附录](TRACE-AND-CASE-LEDGER.md)，每项明确标为 `not_executed_due_to_file_initialization`。原JSON里的 `status:pass` 是基准，不是当前。

|文件|未展开数|共同初始化链|首个失败输入|遮蔽的内容|
|---|---:|---|---|---|
|tests/restaurant-knowledge/ftt-fidelity.test.ts:6|18|顶层compareFidelity → scenes入口优先 → raw历史拒绝被catch后 → A分组compile → compileShortChainGeneration → compileSpacePrompt → adaptSpaceSource → scopeSourceEntries → functionalGate|entrance/A，合法中文关系变成`形成高效服务动线; 支持多场景消费`|11个固定test + cases循环6项 + 非四川独立案例1项；范围包括冻结字节、增量账本、三镜头控制、经营保真、来源材料、零调用、跨项目不污染。初始化在test注册之前抛出。|
|tests/restaurant-knowledge/ftt-final-design.test.ts:8|10|顶层compileFinalDesign → variants堂食优先 → A编译成功 → B编译 → 同一空间compiler门禁|dining/B：`位置与设置方式待确认`与三分句经营关系|确认状态、共同适配、镜头控制、可见owner、入口/橱窗权限、材料光线、advisory隔离、知识生命周期、不可变性；这些断言尚未执行。|

H24在一个已注册test中调用同一compareFidelity，计一个正常失败；H31是文件加载失败；二者共享根因。不能把H24或28项未展开再次叠加到35项。ftt-final-design的首个失败不是entrance/A；后续entrance/A也有相同残句问题，本次独立逐variant观察才看到，不能改写历史首个异常位置。

## 6. 原文到最终校验输入的路径与关键证据

实际有两条路径，不能画成所有入口都依次经过同一个分离器：

1. 分析路径：原分析Packet → 完成器迁移/来源和充分性 → pipeline-service.js:338 validator回调 → :347确定性分离回调 → 重校验 → ready/failed。分离只处理spatial副本，不提升projectFacts/provenance。DCD/UVU在完成器之前，本报告不把它描述为“早于所有模型请求”。
2. 用户方向/编译路径：表单按换行映射（project-design-direction.js:16、:64–82）或已有confirmation → applyUserConfirmedVisualDecision（user-confirmed-visual-decision.js:30）→ effective Packet → adaptSpaceSource清理/装饰降级及机制分类 → target/shot projection → compiler.js:326三字段gate → generation/compile.js:157原Packet六字段报告 → :283 route integrity → 返回最终任务/Provider payload。这里只构造本地文本，未execute。此路径没有调用separateSpatialFunctionalSemantics；报告的separationProbe是独立观察。

`sceneProgram`从表单functionalProgram来；`functionalNetwork`与`functionalRelationships`按行进入同名数组；visibleRequirements进入mustBeVisible。这些节点列表的原产品标签就是“功能节点”，要求改写成动作命题违反既有UI契约。

source-adapter.js:145将Packet.functionalRelationships变成bridge.operationConstraints；:251把sceneProgram交给functionalNetwork名义的降级函数；:451的projectList只保留currentShotText。compiler.js:326又把bridge.operationConstraints作为functionalRelationships检查，并未检查输出sceneProgram或crossSceneConstraints。原字段、语义角色、父子依赖在这条字符串通路不完整。trace虽保存原句，最终校验函数没有接收这些证据。

### 关键完整追踪

|案例/来源|原文|中间转换与最终校验输入|拒因/原合法预期/作用域|
|---|---|---|---|
|existing-direction，历史project-input.json functionalNetwork[0]|`Reception: a usable reception counter connects to waiting area seating through clear visitor circulation.`|cleanList/demote保留原句；reception投影仍保留原句|complete_functional_evidence_required；有场景前缀和通行用途的完整关系，应语义通过。无上下文丢失，是语法覆盖不足。|
|同源functionalRelationships[0]|`Reception and waiting share readable circulation; preserve the consultation privacy boundary while other room interiors remain off frame.`|第一句current_shot成为最终functionalRelationships：`Reception and waiting share readable circulation`；第二句进入crossSceneConstraints|第一句语法误拒；第二句应保留为隐私约束。这里有分句路由，但禁止条款没有被变成肯定活动。|
|表单sceneProgram|`接待大厅`、`候客区`；refinement等还有长节点|原字段校验拒绝；编译层仍放在_raw.sceneProgram，不属于内层三个检查键|完整节点不需动作。它们是后续外层门禁的潜在阻断，不应误称每个都是当次首个compiler异常。|
|customInput functionalNetwork[0]|`展示界面连接比较工作台，服务通道位于两侧`|custom预览不做镜头切句，原文直接到后置门禁|complete_functional_evidence_required；明确中文连接与位置关系；无上下文丢失。|
|FTT历史fixture functionalRelationships[0]|`点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费`|原始gate pass；偏移[0,14)画外、[15,23)current_shot、[24,35)画外、[36,43)current_shot；最终：`形成高效服务动线; 支持多场景消费`|complete_functional_evidence_required；**拒绝残句本身合理，制造残句的投影错误**。两个无实体目的从句失去对象；不得补“入口/员工/设备”。应保留完整父关系作为依赖证据，不要求入口渲染全店。|
|final-design B functionalNetwork[1]|`全店外带包装功能依赖；位置与设置方式待确认`|第一段review_required；第二段无实体被当current_shot，最终`位置与设置方式待确认`|conditional_or_unconfirmed_scope；此拒绝应保留。未知词未被删除，但限定对象与父依赖已失去。不得将它修成“外带包装区位于入口”。|
|B1 proposed functionalRelationships|`Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route`|lobby下前两句画外；第三句current_shot，最终`takeaway handoff keeps a clear route`|complete_functional_evidence_required；外带交接维持畅通为可接受设计关系，非证实现场经营。与FTT目的残句不同，不能因为两者都被切分而同样补主语或同样放行。|
|kitchen-mixed|`入口到达；kitchen connects to dining tables`|最终关系字段只含`入口到达`|节点类型合法、字段投影失配；原关系完整保留于审计，厨房仍画外。|
|两条中文视线|第3节H45/H46原句|投影review_required、owner none；内层无对应执行字符串；外层仍检查原句|拒绝的是语义语法，不是已有投影权限判断。恢复词法不应改变visibilityAuthority。|
|设计禁止/画外|第3节H47/H48原句|进入crossSceneConstraints，currentShotText空；外层检查原文|H47 negated_scope，H48 complete_functional_evidence_required；合法boundary不等于室内渲染权限。|
|reference-first / continuation 系统程序|下列10句|由resolveTargetFunctionalProgram/buildTargetSceneProjection生成并覆盖源程序；没有从源餐饮中推导咨询事实|内层拒绝；原Packet本可pass。系统生成文本本身必须受相同字段契约约束，不能给target路径免检。|

目标程序的实际10条失败输入（两条路径相同）：

- functionalNetwork：`清晰进入咨询单元的过渡，不经过公共等候层级`；`咨询单元内部简洁动线，不穿越公共大厅`；`半私密到私密边界`；`与公共接待 / 等候区明确区分`。
- functionalRelationships（实际来自operationConstraints）：`consultation is primary`；`seating supports 1-to-1 / 1-to-2`；`semi-private boundary supports confidential discussion`；`enter the consultation unit without a lobby hierarchy`；`information display within advisor-client reach`；`lightweight secondary equipment`。

其中 `without a lobby hierarchy` 命中negated_scope，其余complete_functional_evidence_required。主次、容量、边界节点、设备优先级应保留其程序/约束角色；不应都要求写成空间连接句。`与公共接待 / 等候区明确区分`的主体来自咨询目标程序上下文，脱离上下文仍应拒绝，不能把同一字符串在任意输入中无条件放行。

对长建筑句，`Reception:`场景前缀、`behind it`先行对象、分号后的用途约束必须整组处理。当前明确可用的局部it规则要保留；不能恢复任意`near it`许可。未证明指代、条件范围或从句独立性时保留原文并unresolved。

## 7. 最小实现方案与文件范围（本次均未修改）

### 7.1 先修字段契约，不堆叠整句特例

复用两个现有semantic模块，建立有界、确定性的typed evidence结果：node / activity / relation / constraint / visibility_request / unresolved；同时输出modality（affirmative / negative_observation / prohibition / conditional / unconfirmed）、父范围及拒因。这是已有函数内部返回证据的细化，不需要新增付费模型、NLP框架或第二套runtime。

处理顺序：验证数组/单元形状 → 标定原始span/父命题 → 区分陈述与处方式约束及条件范围 → 解析完整节点/关系/活动 → 按原字段允许类型核对 → 按来源确认与镜头权限分别决定是否可执行。任何成功子句不能授权未知尾句。中文“不得”与英文“must not”需按约束结构解释，不能只写否定词例外列表。

`separateSpatialFunctionalSemantics`仍只迁移确实独立的品牌分句；有共享条件、主语、位置、未知尾句或混合动作时不拆。不得从分类标签获得事实权限。节点和明确用途短语在允许字段直接作为节点保留；不制造完整动作句。

### 7.2 有证据才扩大投影范围

本次已有必要证据，**只改两个semantic文件不足以安全恢复G4/G5/G7**。建议最小候选范围如下；每项仍需实施授权。

|文件（均相对packages/visual-workflow/src）|必要改动|必要证据/范围边界|
|---|---|---|
|generation-runtime/space/semantic/separate-space-semantics.js|为作用域提供结构化模态与完整子句证据，扩充通用节点/关系组合，保留E1G否决|A/B无法靠同一否定词规则判断；不引入行业/项目白名单|
|generation-runtime/space/semantic/validate-spatial-semantics.js|六字段许可矩阵、完整语义单元校验；separator与validator共用证据；保留未知与原始拒因|G1/G2/G3/G8/G9/G10；不得以“字段来源正确”直接pass|
|generation-runtime/space/scene-projection/target-scene-projection.js|复用现有scopeSourceEntries，保留父句、依赖span、模态；依附子句随其来源处置，无实体不等于current_shot|FTT[15,23)/[36,43)与待确认位置已直接复现；不需要改系统目标程序文案或相机策略来迁就validator|
|generation-runtime/space/source-adapter.js|projectList/demoteFunctionalList传递原字段、原索引、父句/角色、projection disposition；最终字符串与来源映射一致|relationships→operationConstraints及节点残留类型丢失；不用复制新adapter，不改材料/光线/品牌Prompt|
|generation-runtime/space/compiler.js|用已有证据校验真实输出类型/角色，覆盖实际渲染的sceneProgram与boundary约束；保留源非法项与执行项双重结果|内层只查三键，crossSceneConstraints与sceneProgram缺席；不能直接把全部投影句一律当functionalRelationships，也不能仅扩大字段名后再误拒节点|

第五项不是宣称“已有五个独立漏洞”，而是四个共享根因在调用边界的最小接线。`generation/compile.js`只在人工批准review-only/正式任务状态区分或continuation入口一致性调整后列为条件范围；不自动移动/关闭原Packet gate。当前把continuation排除在外层六字段检查之外是入口事实（compile.js:81），需要验收覆盖，但本次两个目标程序失败在更早的内层，不能据此归因成外层漏检。

完成器、pipeline、space-generation-core、Provider adapter、UI、Prompt、Golden、配置和完整性清单均不在本轮最小修复建议内。缺少deterministic回调的旧完成器兼容风险保持E1G单独账；不以它为理由扩大本轮生产改动。策划/迁移实现禁止复用或同步。

### 7.3 明确不可采用的“修复”

- 不能为FTT残句添加“入口”、设备、操作员、位置或确认状态；也不能将残句单独加入许可词典。
- 不能把unknown/off-frame/review_required内容删除后宣称原Packet已合法；合法关系的画外投影与未知源的处理不是同一件事。
- 不能把所有否定都阻断、把所有must not都放行、把所有分号都视作独立命题，或将所有节点强制改成动作。
- 不能刷新测试期望、Prompt/Golden/完整性摘要来消除失败。最终来源类型合法也不等于图像质量验收。

## 8. 5项旧契约的人工作出决定清单

以下是逐项建议，当前原文件全部保留，无自动改断言。三个选项含义：保留旧断言＝保留完整旧控制流期待；契约迁移＝需人工批准具体新期待；暂BLOCK＝证据/产品语义不足，不选边自动实现。

|冲突|建议选择|保留什么|如批准迁移必须新增/保留的成对证据|
|---|---|---|---|
|C1 / H34|**需人工批准契约迁移**|终态failed、完成器模型回调0、原文与未确认状态不变|初始sceneProgram Logo混合句应block；另用合法节点证明六字段覆盖不会误拒正常程序。旧“初始pass”是当时gate范围的刻画，不值得作为安全要求恢复。|
|C2 / H40|**暂时保持BLOCK**|三个分句的精确范围及current/dependency/review证据，未知不进入输出|由人工决定是否提供独立不可派发review结果。正式任务默认失败；若批准review结果，必须证明不能获得ready/payload/dispatch权限。不能只删除末尾未知节点。|
|C3 / H41|**需人工批准契约迁移**|原文、review_required、空currentShotText|把“formal compile成功”与“投影审计可读”拆开；未解析网络正式路径block；成对明确箭头网络仍可作为依赖保留。|
|C4 / H42|**暂时保持BLOCK**|未知节点和原箭头，不能猜测或移除节点|待人工确认未知全店依赖是否允许独立预览；任何正式执行仍不得因保留了合法入口而pass。|
|C5 / H43|**需人工批准契约迁移**|概述原文、review_required、无可执行字符串|显式节点与边的网络为正例；缺少节点的whole project概述正式路径block。不得把“全项目”关键词变成空间权威。|

没有一项建议无条件恢复旧的“原始gate/正式编译pass”。这不等于旧投影断言无价值：其原文留存、精确范围、画外隔离、未知不输出都应继续保护。C2/C4仍待裁定；C1/C3/C5在批准前同样保持FAIL/BLOCK。

E1G提到的formal two-dispatch旧DISPATCH_LIMIT断言是另一项历史争议，不混入本表5项。A纯语义失败不应尝试第三次与B主动第三次必须被guard拦截应分别保护；本审计不修改原集成测试。

## 9. 正反例配对验收矩阵（待实施，不是新增测试结果）

所有正例的“通过”只指字段类型合法；来源未确认仍未确认，镜头权限另检。每对同时覆盖原Packet、分离后、投影后及正式纯编译入口，不能只测最终字符串。

|ID/字段|正例及期待|反例及期待|必须同时验证|
|---|---|---|---|
|A01 sceneProgram/requiredSpatialElements|接待大厅、候客区、明确用途接待台作为节点|未知区域、设备 near it 不得获得明确用途/位置|节点无需动作；不补事实|
|A02 functionalNetwork|点餐区 → 明档制作区 → 取餐区 → 就餐区，合法依赖|入口 → 未知节点，阻断正式执行|来源节点完整；合法网络不自动同框|
|A03 mustBeVisible|员工操作设备；staff operating equipment and serving customers|员工没有操作设备；staff operating equipment and enjoying cosmic essence|否定或未知并列不能留下肯定半句|
|A04 operationConstraints/relationships|入口不得暴露厨房；Storefront access must not expose…|员工没有操作设备；尚未确认入口不得暴露厨房|禁止与事实否定/未确认分别标记；边界不渲染室内|
|A05 relationships|treatment activity and private room interiors remain off frame|treatment activity remains off（残缺）|完整画外约束；未知尾部阻断|
|A06 network长关系|Reception: a usable reception counter connects to waiting area seating through clear visitor circulation.|同句追加and enjoying cosmic essence|保留前缀/用途；未知尾句不能丢弃|
|A07 依附从句|FTT完整中文关系（第6节）；作为父关系依赖保留|独立“形成高效服务动线; 支持多场景消费”|不补对象；依附片段不独立current_shot|
|A08 条件作用域|Logo; staff operating equipment 可分离品牌|Only if Logo and staff operating equipment；未确认Logo和员工操作设备|来源/确认不变；条件不丢；同义中英组合|
|A09 分号条件|两个明确独立的无条件操作可组合|如果入口连接厨房；员工操作设备（无法证明条件终止）|分号不能自动终止条件，保持unresolved|
|A10 中文关系|展示界面连接比较工作台，服务通道位于两侧|展示界面连接，服务通道位于它旁边|中文对象/关系完整；两侧为明示相对关系，不造尺寸|
|A11 视线请求|两条中文完整视线：语义合法，镜头review_required/none|“入口可见它”无可解析对象|不得通过语法通过授予橱窗/室内owner|
|A12 投影节点|入口到达；kitchen connects to dining tables，类型保留|入口到达；无法确定的节点，不能掩盖未知|厨房画外；节点不强迫新增连接动词|
|A13 目标程序|咨询主次、1-to-1/1-to-2、半私密边界按目标上下文校验|无父上下文的“与公共接待/等候区明确区分”；附加未知条件|reference-first/continuation相同类型规则；源餐饮不泄漏|
|A14 B1关系|takeaway handoff keeps a clear route|takeaway handoff keeps（残缺）或同句+unknown tail|不补对象；原来源仍为离线假设|
|A15 指代|完整已解析counter/interface限定中的局部it|equipment near it；reception equipment of it；reception counter and with it|仅合法先行对象；不能全局it兜底|
|A16 FTT混合|合法厨房/餐桌/外带关系单独识别|全店外带包装功能依赖；位置与设置方式待确认|后者保留BLOCK，即使同Packet另有合法项|
|A17 来源状态|同一合法句带user-confirmed设计意图时保留原确认|相同句带unknown/proposed或无userConfirmedFields|文本合法性一致，事实/确认不得升级；不伪造确认|
|A18 六字段形状|数组中所有合法且有类型的项|非数组、空字符串、非字符串、合法项+未知项|unknown不因另一项合法而通过|
|A19 双门禁|语义合法但画外/需审核项仍保留审计、无owner|低层仅删掉未知后pass、外层被跳过|所有可派发入口必须fail-closed；preview不产生可派发状态|
|A20 历史F4八句|员工组合动作、查看菜单、办理入住、收款、checkout付款、餐桌/取餐台位置、Menu at service counter|分别附If/Unless/未确认/事实否定/未知谓词/不独立品牌尾句|保留E1G八项恢复结果及158项原保护，不重新打开条件漏洞|

每项还须验证输入不可变、重复分离幂等、sourceStart/sourceEnd可回切、原字段索引不漂移、没有模型回调和网络调用、相机/owner保持权限。不得仅以单词出现次数或Prompt长度作为通过依据。

## 10. 本次执行、保全与下一阶段顺序

本次必要诊断命令在预加载 `network-deny.mjs` 后运行本地 `diagnose.mjs` 与 `supplement.mjs`；原样源码保存为本目录 `*-source.txt`。阻断fetch、WebSocket、HTTP(S)、TCP/TLS及DNS/UDP入口。Node v24.20.0原生加载TS，不依赖TS加载器命名管道。未调用测试中的businessFixture、create/start/execute、存储或确认API；continuation探针使用原测试已有的合成确认参数，仅在内存构造。没有写真实项目或凭据服务。

新增证据：

- [trace-evidence.json](trace-evidence.json)：34组链路，另10条跨六字段对照；输入不变。
- [trace-supplement.json](trace-supplement.json)：continuation及B1 proposed两组精确fixture构造；输入不变。
- [逐项附录](TRACE-AND-CASE-LEDGER.md)：全部50项失败的映射、28项未展开名称、36组原文/转换/最终校验字符串。
- [repo-verify.txt](repo-verify.txt)：本次 `npm run repo:verify` 退出1。Repository Contract Guard PASS，随后既有 `VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: src/analysis-decisions/analysis-completion-orchestrator.js` 阻断。后续串联门禁未运行；没有同步清单。它不是本审计新增的生产变更。
- preservation-before.json记录起始3035个原跟踪文件SHA256；preservation-after.json记录逐项复核及历史报告/测试/清单保全结论。本目录新增文档/诊断证据除外。起始工作区干净，结尾仅此新报告目录未跟踪；临时脚本在新建ignored目录，原依赖联接、worktree、日志均未清理。

文档审计不需要把生产行为回归跑成通过；本次没有重跑原测试、current-flows或Golden，也不引用历史通过来解除BLOCK。下一阶段仍需完整离线回归及Golden。

### 下一阶段实施顺序

1. **人工先审契约**：确认六字段类型/模态区别与C1–C5裁定，批准确切文件范围。未批准不修改原测试或生产。
2. 保持原断言，先建立独立正反例和原文→投影证据。先节点/设计约束/长关系，再条件/未知/指代；无网络、无Provider。
3. 最小改两个semantic模块，让validator与separator使用同一类型证据；E1G条件、否定、未知尾句继续block。
4. 根据已复现FTT证据修projection父子范围、adapter类型传递与compiler执行证据检查；不改目标程序文案以迎合正则，不加场景/项目白名单。
5. 依次重跑原E1F 159、原E1G 46、修复新增158、原跨行业69、完整工作流及Golden。35项按组核销；28项必须真实展开。C5组契约未裁定、G5待确认项尚有冲突时不能用初始化“容错”吞掉异常来虚报全绿。
6. 跑 `repo:verify`、文档相关 `verify:current-flows` 及所有受影响离线完整回归；原十项完整性阻断和历史根级/Golden问题单独报告。未经独立批准不得E1H同步清单。即使本地语义修复通过，也不授权真实分析、生图或发布。
7. 在满足并记录上述条件后，再由人工决定下一次独立审核；审核通过与是否批准E1H是后续决策，本报告不代作决定。

### 明确停止条件

任一条件出现即保持BLOCK并停止扩大实现范围：需要补造对象/位置/操作/确认；条件或否定范围丢失；未知尾句被删除；来源升级；合法节点必须改写成动作才能通过；跨镜头关系被授予可见owner；preview能进入正式派发；E1G/E1F已保护案例下降；28项仍未展开；无法区分正式执行与review-only；需要改Prompt、Provider、全局配置、策划/迁移或完整性清单才能继续；任何联网/真实模型请求；任何原历史产物或测试被改写。

**当前停止点：报告与本地证据已准备，仍为BLOCK；未提交，等待人工审核。**
