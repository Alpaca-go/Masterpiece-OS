# 字段化语义契约第一阶段：停止报告

日期：2026-10-28（Asia/Shanghai）。
基准：`6bea8e9d0300c227043192d70fca763b6231afac`。
分支：`fix/rks-semantic-scope-and-operations`。

**状态：STOPPED_DIRECT_SEMANTIC_REGRESSION / BLOCK。本阶段未完成验收，不可进入下一阶段或E1H。**

按用户“任何原本通过的直接语义测试如新增失败，立即停止”的要求，在原E1F定向测试发现新增回归后，停止了生产修改和所有后续测试。停止后仅读取已生成日志、保存diff、归因和文件保全记录。没有继续修补该回归，没有修改原断言，也没有将局部测试通过当作修复合格。

## 1. 触发停止的缺陷

原用例：`complete positive units reject unrecognized tails, negation, wishes, identity and color`。
原文件：`tests/restaurant-knowledge/spatial-semantics/evidence-boundaries.test.ts:55`。

输入：`mustBeVisible: ["equipment", "staff operating equipment"]`。原断言要求分离后仍block；当前返回pass。同一用例在本次修改前的完整工作流中PASS，修改后FAIL，属于**新增直接语义回归**，不能归入旧Projection/Compiler残留。

根因：`validate-spatial-semantics.js:145` 的通用NODE_EN允许没有修饰语的equipment；`:201`将其识别为node；FIELD_TYPES为mustBeVisible允许node，但`:252`只检查类型许可，没有检查该字段要求的用途、位置或明确场景锚定。恢复合法节点的改动把“节点类型成立”错误地等同于“可作为必见功能要求”。已有的 `explicitVisibleCarrier` 较严格，而新typedNode旁路了它。

`staff operating equipment`不能为同数组的裸`equipment`提供缺失证据。也不能把该设备名词改写成“员工操作设备”或自动推定位置。这个断言不能迁移或放宽；它不是C1–C5之一。

原测试在第一个equipment断言处抛错，不能声称该用例后续table等输入已执行并通过。静态阅读显示通用名词存在同类风险，但本报告不追加执行探针，也不将推断扩展为已测结论。

## 2. 本次实现范围与diff

仅修改两个获准生产文件：

- `src/generation-runtime/space/semantic/separate-space-semantics.js`：新增propositionModality，区分affirmative、negative_observation、prohibition、conditional、unconfirmed；条件/未确认优先于禁止候选。原classifyPhrase行为保持。
- `src/generation-runtime/space/semantic/validate-spatial-semantics.js`：增加FIELD_TYPES、节点/完整关系/约束/视线请求识别、spatialSemanticEvidence；validator与separator统一使用该证据；增加source、parent、原索引、片段范围和输出索引记录。

生产diff共182行新增、42行删除：[production-diff.patch](production-diff.patch)。新增独立离线测试：`tests/restaurant-knowledge/spatial-semantics/field-contract.test.ts`（101项）。没有修改source-adapter、target-scene-projection、compiler、完成器、pipeline、Prompt、Golden、Seedream、完整性清单或任何原测试/历史报告。

代码与报告保持未提交状态，供人工查看失败快照；没有自动回滚、覆盖历史或清理依赖联接/worktree/日志。此报告不是修复完成声明，也不授权使用当前候选作正式生成。

## 3. 六字段测试矩阵与结果边界

下表是新增矩阵中代表句的实际测试期待及结果，不能代替完整契约。机器条目见[six-field-test-matrix.json](six-field-test-matrix.json)。

|字段|具名节点：接待大厅|明确活动：staff operating equipment|完整关系：展示界面连接比较工作台，服务通道位于两侧|禁止：Storefront access must not expose kitchen or dining interiors|视线：入口视线可见厨房制作活动|
|---|---|---|---|---|---|
|functionalNetwork|pass|pass|pass|pass|pass（无镜头授权）|
|functionalRelationships|block：裸节点非关系|block：裸活动非关系|pass|pass|pass（无镜头授权）|
|mustBeVisible|pass|pass|pass|block：纯禁止不是必见对象|pass（无镜头授权）|
|operationConstraints|block|block|pass|pass|pass（无镜头授权）|
|requiredSpatialElements|pass|block：无设施关系的裸活动|pass|pass|pass（无镜头授权）|
|sceneProgram|pass|pass|pass|pass|pass（无镜头授权）|

matrix覆盖30项类型/字段组合；36项跨六字段的否定、条件、未确认、未知尾句；10项关系/约束正反例；5项具名节点；15项残句/无先行词指代；5项来源、范围、幂等、非法形状、完成器状态与零网络检查，共101项。

已通过的配对包括：

- A“员工没有操作设备”记录为activity + negative_observation并block；B“入口不得暴露厨房”作为constraint + prohibition在适用字段pass。尚未确认/Only if前缀仍block。
- `Reception: a usable reception counter connects to waiting area seating through clear visitor circulation.`作为完整relation；附未知谓词、未知尾句或愿景仍block。
- 合法中文连接、位置、视线；无对象、残缺关系、it/this/that无先行词继续block。
- `形成高效服务动线; 支持多场景消费`仍block，不补造父句对象；`位置与设置方式待确认`仍block。
- Logo独立分句可迁移；跨句条件和未确认不能在分离后消失。

**新增矩阵存在覆盖缺口：只用了明确的“接待大厅”作node代表，没有覆盖mustBeVisible里的裸equipment。101/101通过不构成安全验收。原E1F测试发现该缺口后即停止，未事后改矩阵隐藏遗漏。**

## 4. 已执行的验证及未执行项目

所有执行均在本地离线环境：子进程移除凭据相关环境变量，预加载fetch/HTTP(S)/TCP/TLS/DNS/UDP阻断模块，只允许TS加载器本地Windows命名管道。原测试中的模型/HTTP回调为既有注入假实现；未读取真实Provider凭据、未真实分析、生图或付费调用。

|执行顺序|结果|说明|
|---|---|---|
|修改前完整工作流|548：498 PASS / 50 FAIL|精确复现基准；含E1G46、旧158及原定向覆盖。是在生产修改之前执行。|
|新增配对首次|101：98 PASS / 3 FAIL|两项缺preparation通用节点名词；一项新fixture错误地保留具体industry值。全部首轮记录保留。|
|新增配对第二次|101/101|加通用preparation名词；把新增fixture的industry.value也设为unknown，保留requires_confirmation期待。未改任何原测试。|
|E1G原独立审核|46/46|原断言未改。|
|原scope-and-operations|158/158|原断言未改。|
|E1E原探针|19/19|unsafeCompletion=failed，模型回调0，原Packet不变。|
|E1F原定向|159：150 PASS / 9 FAIL|触发停止：1项新增直接语义回归；8项原有失败；4项原有失败转PASS。|
|修改后跨行业组|NOT_RUN_STOP_TRIGGER|没有用修改前完整工作流冒充本轮跨行业复验。|
|修改后完整工作流|NOT_RUN_STOP_TRIGGER|停止条件优先于继续运行全套；当前全工作流总数/通过率未知。|
|Golden、repo:verify、current-flows|NOT_RUN_STOP_TRIGGER|没有宣称这些门禁通过，也没有同步完整性清单。待重新授权后必补。|

完整命令、时长、退出码、日志SHA256见[test-results.json](test-results.json)。`after-targeted`命令内部按原159项运行，工具返回时发现新增失败；发现后未启动任何后续套件。初次新增测试的3项失败不属于“原本通过的直接语义测试”，处理发生在停止触发前。

## 5. 全部失败归因与G1–G10映射

[FAILURES.md](FAILURES.md)逐项列出原50项与当前证据；[failure-attribution.json](failure-attribution.json)保留完整失败诊断。未运行的旧失败明确标为not_run_after_stop，不臆测已修复或仍失败。

### 当前定向9项失败

|项目|类别|处置|
|---|---|---|
|裸equipment必见要求被放行|新增语义层回归|立即停止；不能归因到旧投影|
|H34 / C1：sceneProgram Logo混合句初始gate期待pass|原契约冲突|仍FAIL；保留原断言，不按安全迁移设计自动改测试|
|H40 / C2：混合局部/依赖/未知分句|原契约冲突|仍BLOCK；无review-only派发旁路|
|H41 / C3：点餐制作取餐就餐的完整关系|原契约冲突|仍FAIL；不补造网络节点|
|H42 / C4：入口→无法确定的节点|原契约冲突|仍BLOCK|
|H43 / C5：whole project operating network|原契约冲突|仍FAIL；不以概述赋权|
|H44 / G7：厨房关系投影后仅余入口到达|原跨模块失败|现有投影丢失字段类型上下文；不能强迫节点补动作|
|H49 / G10：reference-first目标程序|原跨模块失败|目标程序仍与门禁契约不完全匹配，可能含语义覆盖及上下文缺失；未追加探针，不能全部归为投影缺陷|
|H50 / G10：continuation目标程序|原跨模块失败|与H49共享目标程序来源；不重复计独立漏洞|

H45/H46（G8，两条中文视线）与H47/H48（G9，两条设计禁止/画外约束）原断言本次通过，仍保留review_required、boundary-only等原权限期待。4项恢复不抵消新增equipment漏洞。

|既有组|项数|当前证据|
|---|---:|---|
|G1 建筑/方向共用编译入口|20|修改后完整路径未运行；新增局部关系例通过不证明这20项恢复|
|G2 功能动线|1|Flowing visitor circulation局部node例通过；原完整用例未运行|
|G3 custom预览中文关系|3|局部中文关系例通过；三个完整预览用例未运行|
|G4 compareFidelity共同初始化|2|未运行；不批准无对象目的残句，保留下一阶段父句投影问题|
|G5 final-design混合初始化|1|未运行；未确认位置依旧必须block，不能要求fixture无条件通过|
|G6 B1 shadow关系|1|takeaway关系局部通过；完整比较未运行|
|G7 到达节点残留|1|原定向仍FAIL，投影类型上下文尚未修复|
|G8 中文视线|2|原定向均PASS|
|G9 设计禁止|2|原定向均PASS|
|G10 系统目标程序|2|原定向均FAIL|
|合计|35|4项当前PASS，3项当前仍FAIL，28项修改后未运行|

原10项完整性入口失败只在修改前工作流复现，修改后未运行；不借此豁免当前新增语义漏洞。原28项文件初始化未展开测试也未在修改后重新展开；依赖和名称仍见已提交六字段审计，不宣称验收完成。

## 6. 来源、作用域与模态保留的证据及限制

新增测试实际验证：

- source对象中的status=unknown/proposed、evidenceRefs、userConfirmedFields原样复制；结果只注明sourceConfirmation=unchanged，无自动confirmed。
- 每个语义结果包含original、field、index、path、parent范围、source、type/types、modality、validation、reason；失败原因不依赖词法classification兜底。
- 完整分号关系的每个子句start/end可从原文切回，父句与索引保持；前后空白不影响原文保存。
- 品牌迁移后保留原输入index和outputIndex、原句、sourceRange与共享前缀证据；移除前面纯品牌项不会把后续原索引悄悄前移。
- 输入spatial/Packet不变；再次分离spatial幂等；unknown事实完成器保持requires_confirmation，模型回调0。
- 条件、未确认、否定观察在六字段均不能因混入合法项或品牌分离而pass；完整未知尾句保留。

这些是被测样本的保留证明，不是全部Unicode范围、递归子句、共享指代和投影链路的通用证明。新增证据API允许显式传入来源，但生产调用者本阶段未改；未传的来源只记录source_field/unspecified，不能描述为运行时已接通完整外部provenance。

本次分离后的类型证据增加了parent/sourceFragments，但递归组合与输出子句的偏移坐标体系仍需独立审查。没有声称仅靠新数据结构就完全解决父句追踪，更不能因有trace而接受新增equipment误放行。

## 7. 重新授权后的修复与下一阶段边界

**首先应重新授权处理当前语义层回归，不能直接进入Projection阶段。** 最小候选方向是在mustBeVisible的node许可上保留用途/位置/明确场景证据要求，与functionalNetwork/sceneProgram的具名节点区别；复用已有carrier证据，不将所有equipment/table改成动作，不恢复任意子串或来源分类兜底。需要增加裸equipment/table、修饰但仍无用途设备、明确用途设备及位置关系的配对测试，再先复验原直接语义测试。本报告未实施此后续修复。

在语义回归重新归零后，原审计指明的下一阶段必要范围仍是：

1. `target-scene-projection.js`：保留父关系与目的/未知子句的依附范围；无实体片段不能默认current_shot。FTT目的残句和待确认位置已有历史直接证据。
2. `source-adapter.js`：在functionalRelationships→operationConstraints及projectList中携带原字段、节点/约束角色与父范围；不可只返回扁平字符串。
3. `compiler.js`：依据真实输出类型与来源证据校验，包括实际渲染的sceneProgram及boundary约束；不能将所有内容反映射为functionalRelationships。

G10残留必须重新追踪原文与当前拒因，区分可在语义层识别的完整程序约束和需要父程序上下文的残缺句；不得把所有未恢复失败都归为Adapter问题。generation/compile.js、完成器、pipeline、Prompt、Provider、清单依旧不自动纳入范围。C2/C4正式路径继续fail-closed；C1/C3/C5原断言未经单独批准不能变更。

## 8. 独立审核建议与停止状态

建议后续独立审核先覆盖：所有node类型在六字段中的“类型许可≠证据充分”；否定观察与禁止候选的优先级；多分句条件不被分号截断；未知尾句；指代先行对象；separator/validator同一证据是否仍可能共享同一误判；来源与输出范围映射；系统目标程序及低层编译入口不被当作免检路径。

必须补齐修改后跨行业组、完整工作流、28项展开状态、Golden、repo:verify及current-flows。当前没有资格批准下一阶段或E1H；不能因为46/46、158/158、19/19或新增101/101通过而跳过那一项新增安全回归。

文件保全见preservation-after.json：原3048个跟踪文件中，仅两个获准生产文件改变；所有原测试、历史报告、Prompt/Golden、配置和完整性清单保持。所有运行记录是本目录新文件；没有覆盖前期报告。

**停止点：新增直接语义回归已保留并报告；候选未提交、未推送、未合并、未发布，未使用真实Provider或API Key，未启动E1H。等待人工审核及明确后续授权。**
