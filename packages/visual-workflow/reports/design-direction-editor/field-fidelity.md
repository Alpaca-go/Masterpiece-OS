# 真实网页自然语言输入到 Provider 的逐字段保真

全部 34 项通过。输入来自空编辑器的真实文本框与下拉选择，未预置确认 JSON；实际公共业务服务经正式编译器产生有效 Packet 和 Provider 请求。每项对确认记录和有效 Packet 作精确结构比较，对正式 Prompt 和实际 Provider Prompt 检查语义原句/子句。英文大小写可归一；跨区原句留在 Packet，当前镜头只执行可见通行和隐私边界。

| 项 | 网页输入 | 确认记录 / 有效 Packet 目标 | 实际输入值 | 结果 |
| --- | --- | --- | --- | --- |
| 1 | colorEntries[0].name | colorSystem.primary[0].name | 暖白与乳白 | PASS |
| 2 | colorEntries[0].role | colorSystem.primary[0].role | 安静明亮的建筑背景 | PASS |
| 3 | colorEntries[0].surfaceApplicability | colorSystem.primary[0].surfaceApplicability | 墙面、地面及周边顶面；不包含主艺术结构内层 | PASS |
| 4 | colorEntries[0].spatialUsage | colorSystem.primary[0].spatialUsage | dominant_field | PASS |
| 5 | colorEntries[1].name | colorSystem.secondary[0].name | 浅暖灰 | PASS |
| 6 | colorEntries[1].role | colorSystem.secondary[0].role | 辅助接待表面的低对比层次 | PASS |
| 7 | colorEntries[1].surfaceApplicability | colorSystem.secondary[0].surfaceApplicability | 接待台次要台面与限定辅助表面 | PASS |
| 8 | colorEntries[1].spatialUsage | colorSystem.secondary[0].spatialUsage | secondary_surface | PASS |
| 9 | colorEntries[2].name | colorSystem.accent[0].name | 品牌紫 | PASS |
| 10 | colorEntries[2].role | colorSystem.accent[0].role | 局部材料内层的细微虹彩；视觉识别以后期真实标识体现 | PASS |
| 11 | colorEntries[2].surfaceApplicability | colorSystem.accent[0].surfaceApplicability | 只在层片内层和少量细部出现，不染满墙顶、窗帘或家具 | PASS |
| 12 | colorEntries[2].spatialUsage | colorSystem.accent[0].spatialUsage | local_accent | PASS |
| 13 | materialEntries[0].material | materialSystem[0].material | 半透明珠光薄片 | PASS |
| 14 | materialEntries[0].brandRole | materialSystem[0].brandRole | 参与建筑分隔与空间组织的主艺术系统 | PASS |
| 15 | materialEntries[0].behavior | materialSystem[0].behavior | 自然光分层透射，可读取后方空间<br>边缘细腻反射与温和高光<br>轻薄层叠保留清楚深度<br>珠母贝般温和虹彩，紫只在局部内层微弱出现 | PASS |
| 16 | materialEntries[0].forbidden | materialSystem[0].forbidden | 厚重染色玻璃<br>不透明自发光浮雕 | PASS |
| 17 | materialEntries[1].material | materialSystem[1].material | 暖白矿物基底 | PASS |
| 18 | materialEntries[1].brandRole | materialSystem[1].brandRole | 衬托薄片与自然光的建筑背景 | PASS |
| 19 | materialEntries[1].behavior | materialSystem[1].behavior | 柔和漫反射<br>连续、低对比的安静表面 | PASS |
| 20 | materialEntries[1].forbidden | materialSystem[1].forbidden | 高对比镜面拼贴 | PASS |
| 21 | functionalProgram | mediaTranslations.spatial.sceneProgram | 接待大厅<br>入口<br>候客区 | PASS |
| 22 | functionalNetwork | mediaTranslations.spatial.functionalNetwork | Reception: a usable reception counter connects to waiting area seating through clear visitor circulation. | PASS |
| 23 | functionalRelationships | mediaTranslations.spatial.functionalRelationships | Reception and waiting share readable circulation; preserve the consultation privacy boundary while other room interiors remain off frame. | PASS |
| 24 | visibleRequirements | mediaTranslations.spatial.mustBeVisible | Reception counter<br>Waiting area seating<br>Clear visitor circulation<br>Consultation privacy boundary | PASS |
| 25 | compositionRequirements | mediaTranslations.spatial.compositionRequirements | 入口视角保留前景通行、中景接待与候客、背景留白的清晰纵深；艺术焦点与可用接待台形成主次，不遮挡通行。 | PASS |
| 26 | colorAvoid | colorSystem.forbidden | 紫色共同主导墙、顶、窗帘与多类家具 | PASS |
| 27 | mustAvoid | creativeDecision.strategicNegatives | 通用医美装修<br>重复拱券、波浪灯槽及连续紫色发光描边<br>装饰性羽毛堆叠<br>厚重染色玻璃与不透明发光浮雕 | PASS |
| 28 | spatialConcept | mediaTranslations.spatial.spatialConcept | 具有当代美术馆气质的高端医美接待空间，以建筑组织、轻薄半透明结构和材料光学形成安静明亮的艺术体验。 | PASS |
| 29 | structureLanguage | mediaTranslations.spatial.structureLanguage | 轻薄半透明顶面与连续空间分隔组织自然光、穿行和视线纵深<br>周边墙地及顶面保持暖白低对比留白 | PASS |
| 30 | artisticFocus | mediaTranslations.spatial.signatureSpatialMechanism | 接待区：一个与建筑结合的珠光层叠艺术装置，层片之间保留可读深度，成为唯一主艺术焦点。 | PASS |
| 31 | lightingLanguage | lightingSystem.source | 柔和自然日光<br>克制的间接光 | PASS |
| 32 | lightingContrast | lightingSystem.contrast | 建筑背景低对比，层片边缘保留细腻明暗 | PASS |
| 33 | lightingInteraction | lightingSystem.interactionWithMaterials | 自然光穿透层片产生分层透射与细腻散射<br>边缘反射温和，不以连续发光描边代替结构 | PASS |
| 34 | lightingAvoid | lightingSystem.forbidden | 全空间紫色灯带<br>紫色霓虹 | PASS |

完整证据见 [field-fidelity.json](./field-fidelity.json)、[浏览器保存请求](./web-input-requests.json)、[有效 Packet](./effective-packet.json)、[正式 Prompt](./formal-prompt.txt)、[实际 Provider 请求](./provider-request.json)。标准路线、参考图 0，实际请求无 image 字段。未明确点缀范围时确认及发送被阻断；补充范围后才完成一次离线生图及一次离线校验。真实模型调用 0，合成输出不表示视觉质量通过。
