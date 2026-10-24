# RKS-01E · 经营行为字段编译诊断

结论：**确认合成标准路径存在字段路由与无保留归属的去重缺陷；不能将三项丢失全部解释为镜头作用域过滤。** 这一结论限定于 RKS-01D 合成 Packet，在图 1 根因矩阵中保持独立。

## 可复现条件

使用仓库已有 `structuredAnalysisPacketFixture()`，保持 RKS-01D 的 Restaurant、spatialConcept、三项 mustBeVisible、standard、零参考图、16:9、count=1、post_composite、模型元数据及 currentInstruction 不变。没有用户确认对象、项目存储或传输。只改变 subtype、shot 和 shotSource；显式传入的相同两种镜头在 lobby/dining 间交叉对照。固定 taskId 和 now；原 Packet 编译前后序列化相等。

`field-lineage.test.ts` 的首组最终 Prompt 与已提交 `offline-compile-comparison.json.proposedPrompt` 完全相等，未重写 RKS-01D 证据。新增 `RKS-01E-field-lineage.json` 包含各组完整**合成** Prompt、逐字段分类、投影前后状态、实际 sceneScope、独立 scope probe、sourceMap、Prompt 哈希和保留结果。probe 是在原文上独立调用导出纯函数的反事实观察，不冒充实际 composition 路径。

保留检查使用三项原文的精确匹配，并结合 adapter 执行列表和所有者跟踪定位，不作模型式语义校验。最终 Prompt 仍有 `visible cooking` 等总体目标；这不能证明厨师备餐、菜品蒸汽、顾客就餐三个具体要求完整传递。首组相等性仅记录为诊断数据，不设置为要求未来保留缺陷的新 Golden 断言。

| 对照组 | subtype | 请求 shot / shotSource | 最终有效 view | 三项最终保留 |
| --- | --- | --- | --- | --- |
| RKS-01D 原样重放 | lobby | entrance_view / 未传 | public_overview_view | 0/3 |
| 显式入口 | lobby | entrance_view / user_explicit | entrance_view | 0/3 |
| 显式广角 | lobby | three_quarter_wide / user_explicit | three_quarter_wide | 0/3 |
| 用餐区显式入口 | dining | entrance_view / user_explicit | entrance_view | 0/3 |
| 用餐区显式广角 | dining | three_quarter_wide / user_explicit | three_quarter_wide | 0/3 |
| 用餐区默认策略 | dining | entrance_view / 未传 | operational_dining_view | 0/3 |

`dining_view` 和 `operational_dining_view` 直接作为输入 shot 均在 template-router 被拒绝：`No vNext template registered for shot.space.<shot>`。后者是已支持的 dining 场景输出策略，而非输入枚举。未为测试新增别名或修改路由。默认 shot 会由 subtype 拥有的策略替换；只有 `shotSource=user_explicit` 保留明确选择。场景作用域过滤看的是 subtype，而不是任意 shot 文本。

## 实际数据转换节点

1. `generation/compile.js` 的 Short Chain 入口建立 task contract，经 `compileSpaceGeneration → compileSpacePrompt → adaptSpaceSource` 读取 Packet。当前 space 路径的实际 Prompt Source 是 adapter 返回的 layers；不把旧的持久化 Prompt Source 文档当成本次权威。`applyUserConfirmedVisualDecision` 在本实验无确认对象，不更改输入语义。
2. `space/source-adapter.js:96–97,529` 先提取 rawMustBeVisible 并 split。`semantic/separate-space-semantics.js:46–51,104` 把 mustBeVisible 视为 brand provenance；这三句均无建筑、颜色或 motif 命中，仍从 fallback 被分为 **brand_motif**，不是因为真的检测到品牌母题。三项的 motifHits 都为空。这一步把三项从 compositionMustBeVisible 排出，早于 composition 场景投影。
3. 品牌支路的 `sanitizeBrandManifestation` 对三项均返回 **kept**。不是 sanitizer 的人物活动禁词、长文本、Logo 或装饰物规则导致本次丢失。
4. `source-adapter.js:389–412` 在 standard 路径调用 projectList/scopeSourceEntries。composition 支路已经没有三项，所以 trace 中没有它们的 compositionEntries；品牌支路仍有逐条 sceneScope 记录。随后 `functionalItems` 包含所有 rawMustBeVisible，而品牌过滤条件为 `!functionalItems.has(text) || artSeen.has(text)`。三项不是 artisticFocus，当前镜头可用的条目仍被移除。去重前未确认功能/构图分支是否真正保留该条，形成“从品牌删除但无执行所有者”的丢失。
5. adapter 输出的 `composition.mustBeVisible` 和 `_raw.brandRoleManifestation` 均无三项；`_raw.mustBeVisible` 仍完整保留三项作审计。`renderComposition` 读取 composition 列表，`renderBrandTranslation` 读取品牌列表，`renderFunctionalRequirement` 读取 program/network/differentiators；它们没有从 raw 审计列表兜底执行。因此缺失在 Prompt Source 就已发生，后续 block 拼接未另行截断这些字段。
6. 六组正式 Prompt 与 Seedream adapter 的纯编译 payload.prompt 均完全相等，三项均不在其中。只编译 payload，不调用 Provider；未发现本实验的 Provider Prompt 二次丢失。

## 逐字段结果

以下源字段均为 `mediaTranslations.spatial.mustBeVisible[index]`，值逐字来自 RKS-01D 合成输入；不是实际 FTT 数据。

| 字段 / 源值 | 投影前 | lobby 投影与去重 | dining 投影与去重 | 最终保留 / 丢失原因 |
| --- | --- | --- | --- | --- |
| [0] chef preparing food | raw 保留；class=brand_motif；composition 无；brand sanitizer=kept | brand scope=current_shot，去重后无 | brand scope=current_shot，去重后无 | 正式/Provider 均否；split 误路由后无归属去重，不是镜头过滤 |
| [1] steam above dishes | raw 保留；class=brand_motif；composition 无；brand sanitizer=kept | brand scope=current_shot，去重后无 | brand scope=current_shot，去重后无 | 正式/Provider 均否；同 [0]；蒸汽是可见运营效果，不能靠建筑命中要求保护 |
| [2] customers dining at tables | raw 保留；class=brand_motif；composition 无；brand sanitizer=kept | brand scope=off_frame_dependency，投影后即无 | brand scope=current_shot，去重后无 | lobby 中存在有意的 foreign_scene_entity 过滤；dining 中仍因 split/去重缺陷丢失 |

`target-scene-projection.js:6–44` 的 dining regex 包含 dining/kitchen/餐厅/厨房/堂食；lobby 只允许 reception/entrance。于是顾客 dining 句在 lobby 中被识别为外场景。这是明确的作用域政策。chef/steam 两句无这些场景词，在该规则下均为 current_shot；不能事后以厨房画外为由解释。是否应允许入口看见用餐区，需要独立场景关系依据，不能从本合成输入替用户补足。

sourceMap 对三项都只提供 block 级声明：

- composition：`taskContract.aspectRatio|scene`、`composition.mustBeVisible (spatial items only)`、`spatial.positiveDifferentiators`。
- functional_requirement：`spatial.sceneProgram`、`spatial.functionalNetwork`、`composition.mustBeVisible (spatial items only)`、`spatial.positiveDifferentiators`。
- brand_translation：`projectFacts`、各 semantic brand/color 桶、`spatial.brandRoleManifestation`、`_raw.mustBeVisible (identity items only)`。

这些映射不是逐条成功传递收据。composition 的三个源条目没有 canonical owner，品牌支路虽留有 sceneScope/sanitizer 记录，执行列表已为空。另一个可确认的审计问题是 functional_requirement 的 sourceMap 声明 mustBeVisible，但实际 renderer 不读取该列表；实际读取并渲染它的是 composition。sourceMap 应反映真实所有权和每条删除原因，不能仅凭映射字符串判保留。

## 修复建议与范围

三项共同建议：在独立工作流内明确给可见经营行为/效果保留功能来源语义；去重应仅删除已有**当前镜头可执行所有者**的重复文本，不能仅凭原始输入集合认定已由其他 block 负责。保留完整来源路径、场景判定、执行 owner 和拒绝原因。顾客就餐句仍需经过 subtype 的可见性过滤；入口看到用餐区的需求应由明确关系和用户意图授权。

建议触及的受保护范围仅为 `packages/visual-workflow/src/generation-runtime/space/semantic/separate-space-semantics.js`、`space/source-adapter.js` 和必要的 `space/compiler.js` sourceMap；不是共享策划/迁移 Compiler。该调整可能影响所有 standard 空间项目的行为/效果句与来源去重，应包含餐饮以外服务、零售等反例。其他 generationBasis 的分类共用处也需回归，不能只测试餐饮英文三句。

本轮没有实施上述建议，没有修改生产 Compiler、P7B、B1、Provider/Seedream 配置、Golden 或完整性摘要。更详细的审阅门槛见 `RKS-01E-next-stage-proposal.md`。
