# 九州美学 P6｜局部艺术边界与专业面询离线修正

2026-10-19（Asia/Shanghai）。**离线字段表达、网页确认、正式编译与标准请求预演通过；真实视觉质量未验证。** 本轮真实 Seedream、Qwen、其他收费模型、重试、重生成与自动纠正均为0，完成证据提交后停止等待用户审核。

## 基线与只读审查

工作分支 fix/jiuzhou-final-spatial-balance，起点 b79f741ef0b86e352c6bef9cfa7beaa76ebf9059，开始时工作区干净。冻结分支仍为 5103076f5db51d9d3fe1705c8f2918443be24e49。已读取附件、仓库适用规范、P5确认、正式/Provider Prompt、请求及下一轮预检记录、P5两份真实审查报告，并目视核对本机P5真实输出。P5两个artifact-manifest逐文件校验通过。[基线核对](baseline-proof.json)

P5确认内容摘要 9e71ce823c14d343248df4904a8cecd056d60838dbeb79b19eb20b708e6736a0，正式Prompt摘要 733c44d0e67a83c051ccc1aa596aaf8424c6a53510ad87dbf738c1af6dd05a68，仅用于修改前核对。本轮新摘要另见下表，没有用P5摘要验收P6产物。

![只读P5问题基准](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-spatial-balance/real-validation/authorized-execution/jiuzhou-standard-output.png)

## 根因假设与定点修正

| 问题 | 现有字段可能的解释空间 | 本轮替换及边界 |
|---|---|---|
| P0 左前景无功能围合 | P5要求open foreground sightlines和一组曲面，但没有明确左前景的公共到达职责，也未明确系统仅在同一侧展开，模型可能自行补充另一套围护 | 在结构与构图正向指定左前景为开放公共地面、完整入口框景及连续前台接近视线，左侧层次由既有实体建筑与正常采光表达；在该镜头的可见要求中局部排除独立圆形玻璃房、筒状围合、环形灯及无用途展示 |
| P1 顶部跨度与面询巨型拱框 | P5“局部向上部边界轻薄延伸”“缩减画面占有程度”未明示上部终点、中央及前台上方顶面的保留关系；数量为一组也可能被解释为贯穿多区的一条连续曲带 | 仅一套系统依附一处侧界面，主辅曲面在同一局部起止收束，上部衔接止于该侧附近；中央和前台顶面完整，面询仅用短段局部私密边界。薄边、留缝、透景深度继续正向要求 |
| P2 屏幕与同侧座椅 | P5已写opposing consultant/guest seats及排除brain CT/MRI，仍未稳定落图；设备操作侧、访客对侧和共同看屏关系不够具体，facial imagery仍可能被泛化为头部解剖图 | 人员椅在设备操作侧，访客椅在台面对侧，空椅隔台相向且共同看屏，保留进出；屏幕改为简洁浅色皮肤表面纹理、面部分区轮廓或美学比例图示，在设备句内排除颅骨、脑纹、切面、CT/MRI、器官及可读字数/诊断/个人影像/疗效承诺 |

以上为表达缺口及解释风险假设。P5的随机构图、模型理解和其他因素也可能导致偏差，不能把三项失败确定归因于某句Prompt，更不能承诺一次文字修正必然改变真实画面。

## 字段、网页确认与编译

修改六个项目字段，未扩展到材料、灯光、色板或通用实现：[精确机器差异及理由](field-diff.json)、[完整前后值](field-differences.md)、[修改前](initial-direction.json)、[网页输入](natural-language-input.json)、[正式确认](confirmed-direction.json)。

- structureLanguage：保留前台候客与开阔主厅首句，重写局部边界与面询组织。
- artisticFocus：明确单套局部艺术及完整中央顶面。
- functionalNetwork：前三行前台与候客原样，仅替换面询节点。
- functionalRelationships：私密转场句原样，仅替换短边界及对侧座位关系。
- visibleRequirements：前台、候客与后期标识承载面原样，替换前景、艺术系统及面询三项。
- compositionRequirements：首末两行原样，替换中间两行以确定局部跨度及左前景职责。

创建新的数据隔离副本，原项目ID及分析内容随数据副本保留；只复制项目数据，不复制settings或真实凭据。经正式React网页与Node Host完成**一轮编辑—保存草稿—确认**，没有手写确认JSON或绕过分析新鲜度守卫。[网页保存确认请求](web-input-requests.json) / [确认截图](web-confirmed.png)。

正式compile与现有Adapter预演保留全部38项语义映射：[字段保真](field-fidelity.json)、[逐项Prompt位置](field-prompt-source-map.json)、[有效Packet](effective-packet.json)、[来源映射](prompt-source-map.json)、[完整编译追踪](compiler-trace.json)。本轮首次正式编译即通过，未发生关键字段丢失；没有修改编译器、过滤逻辑或断言。artisticFocus原文被现有分类器放入Architecture Language，内容完整保留，不是从请求中删除。

[正式Prompt](formal-prompt.txt)为11740字符，[Provider Prompt](provider-prompt.txt)为11843字符，仅加既有103字符前缀，正式全文为Provider后缀，无截断。保留既有7500字符质量预算及10000字符长度警告，低于12000硬上限；本轮没有为消除警告修改生产预算。

| P6对象 | 新SHA256 |
|---|---|
| 确认内容 | a73503cbfab73f9c35453092393fb1bb16c039f2c38392931212bd3bc0ee523b |
| 确认记录 | 9c25be9009a8da0e6023e80bf51969e9c3ac45e6a655cf5df0865e8b356186da |
| 正式Prompt | 8484241e0199f37a00929063c93685d4e2f9ac19926d1735d82a5a86672a1eb2 |
| Provider Prompt | 9446bb3eb32e508940136166142be623caa7ca2b20a9154c064c1e6568188854 |
| Adapter请求body | 081f266cfe9acc0af7da4f28ba2284339b02e5856e44714390f5f6b62e9c1cb8 |

Prompt按UTF-8原文、确认及body按既有digest(JSON.stringify(value))计算；文件格式化空白对应的文件哈希另见artifact-manifest，不混淆。

## 标准请求与隔离

[请求正文](provider-request.json)、[请求证据](request-evidence.json)、[任务契约](task-contract.json)。doubao-seedream-5-0-pro-260628 / volcengine / seedream-image / 2K / 16:9 / count=1 / generationBasis=standard / referenceAssetIds=[]，实际Adapter预演body无image。历史图仅在本机用于审查，没有登记素材或发送模型。

先编译并检查字段保真，再经现有generation-only start与图片服务进入Adapter，在注入的内存fetch截获一次请求并返回白色合成fixture；.invalid是离线占位端点，没有真实HTTP派发。合成图不展示、不作为设计结果或视觉证据；质量校验器未调用，Logo、文字及导视合成未执行。网页宿主阻止非本机fetch；只有新建的离线假凭据，无需也未使用真实配置。

## 保护与回归

[保护证明](protection-proof.json)记录21个既有根目录逐文件前后相同，覆盖源P5确认项目、P5真实执行数据及历史图、旧副本与既有报告；归档复核仅排除本次新增报告目录。原配色、全部三项材料与光学表现、四项照明、功能清单、原空间目标及mustAvoid逐值不变，前台候客、横向通行、私密转场原句也已单独检查。保留珠光薄边、弱紫内反射和商业功能，没有清空设施。

新副本的方向记录、方向历史、编译与fixture相关状态变化清单在保护证明内；原project.json、输入素材与分析上下文不变。归档脚本首次将副本内允许改变的design-direction也误纳入原分析不变断言，已更正范围后复核；源项目及受保护根目录核对始终通过。此为本地审计脚本范围修正，没有改生产逻辑、方案字段或测试断言。

[门禁结果](gate-results.json)：所属工作流TS82/82、JS30/30；[三行业请求对照](standard-industry-regression.json)医美、餐饮、酒店实际Adapter body与既有基线逐值一致；Golden通过且没有刷新；repo:verify结果及日志摘要见记录。无共享宿主、路由、传输、样式、依赖或生产业务变更，无其它功能影响范围。旧Golden中的人工标签不是本轮新视觉验收。

## 离线验收逐项回答

| 检查 | 离线结论 |
|---|---|
| P0左前景 | 通过：正式Provider中正向要求开放公共地面与前台视线，仅本镜头排除无功能独立围合；没有全局禁用圆形玻璃或环灯 |
| P1跨度与材质 | 通过：单套、单侧、明确收束、中央与前台顶面完整，面询仅短边界；珠光材质原值与薄边留缝正向保留 |
| P2面询与屏幕 | 通过：操作侧人员椅、台面对侧顾客椅、隔台相向共同看屏；浅色皮肤表面/面部分区/比例图示，局部排除颅内解剖与数据编造 |
| 成果保护 | 通过：前台候客、横向主厅、配色材质照明与私密转场逐值/逐句保护 |
| 技术与历史 | 通过：standard零参考实际Adapter预演、跨行业请求一致、受保护资产不变，真实模型0 |

机器清单见[offline-acceptance](offline-acceptance.json)。以上“通过”仅代表表达、数据及离线链路，不代表P6真实画面或最终医美识别达标。

## 未知点、残余风险与停止

模型仍可能把“主曲面”扩张为跨厅结构、把专业显示器泛化为解剖影像，或把空椅错误放至同侧；当前无法离线证明消除这些偏差。P5字段中保留的材质空间职责提到候客及面询边缘，其范围由本轮明确的“同一局部侧向”限定，未要求跨越整个大厅，没有发现相互排斥的正向要求。完整真实几何、材料观感与运营合理性仍需未来授权画面判断。

现有Composition仍有“No artistic installation is required by the supplied sources.”，因为本轮艺术语言被分类为建筑。建筑曲面在Architecture Language、Material System与Operational Elements中均明确正向保留；未发现语义内容丢失，但该通用句仍可能给模型带来理解歧义，已保留供用户审查。没有为消除它越权修改编译器。

[下一轮真实生图预检](next-generation-preflight.json)仅列未来另行授权后的条件。本轮不修改人工视觉质量状态，不合并、部署、发布；完成证据提交后停止，等待用户审核。
