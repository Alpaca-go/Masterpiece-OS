// Execution-oriented Direction Generation Prompt v2 (doc section 四 / 五).
//
// Replaces the conceptual v1 prompt. It forces the model to answer "how" — core
// visual assets, industry recognition first, reusable assets, composition
// templates, and anti-concept-art constraints — instead of a macro metaphor.
// Produces the visual-direction-v2-execution contract JSON.

export const VISUAL_DIRECTIONS_PROMPT_V2_VERSION = 'visual-direction-v2-execution';

export function buildExecutionDirectionV2Prompt(context) {
  const reportLanguage = context.brandFacts?.reportLanguage || context.reportLanguage || 'zh-CN';
  const brandIdentity = context.brandFacts?.identity || {};
  const brandName = brandIdentity.brandName || brandIdentity.projectName || '九州美学';
  const brandRole = brandIdentity.brandRole || '医美全链生态平台';
  return [{ role: 'system', content: `PROTOCOL_STAGE=04-execution-oriented-directions-v2
PROMPT_VERSION=${VISUAL_DIRECTIONS_PROMPT_V2_VERSION}
DIRECTION_GENERATION_MODE=execution_oriented_v2
Report language is ${reportLanguage}. Produce exactly three meaningfully different EXECUTION-READY Visual Directions. This is an experiment that runs alongside the frozen conceptual_v1 baseline; do NOT replace it.

PROJECT BRAND — you MUST preserve this exactly and never substitute or shrink it:
- 品牌名称：${brandName}
- 品牌角色：${brandRole}（B2B2C：上游品牌/产品/材料、九州美学平台能力、医美机构与专业服务、消费者安心与美学价值 四类价值共存；供应链、仓储、温控与合规是产业底座，不是品牌全部）
- 不得把品牌缩减为医疗器械供应链公司、合规 SaaS、器械采购平台或医药物流企业。

Read the v1 inputs you are allowed to use: brand facts, Evidence Index, Audience Boundary, Asset Boundary and selected touchpoints. You must NOT fabricate evidence or execute restricted assets.

PRINCIPLE 1 — Industry Recognition First. Every direction must build an industry_recognition_layer BEFORE any abstract metaphor: industry_visual_objects, industry_data_objects, industry_process_objects, industry_space_and_real_scenes, usable_business_objects, prohibited_misleading_templates, and a minimum_industry_recognition_strength (1-5, must be >= 4 for a ready direction).

PRINCIPLE 2 — Reusable Visual Assets. Each direction needs 3-5 core_reusable_assets covering at least: 1 graphic_asset, 1 information_asset, 1 photography_asset, 1 layout_asset. Each asset: asset_id, asset_name, asset_type, visual_description, business_evidence, execution_role, reusable_touchpoints, prohibited_use. Never output only colors, materials, light or mood.

PRINCIPLE 3 — Answer "how". Each direction must define: graphic_system (how graphics form + brand mapping + scale/crop/repeat + enter touchpoints + must-not-become), photography_object_system (real industry objects, real_content_ratio summing to 1.0), information_system (core/capability/data/cta + hierarchy + fabricated_info_prohibited), layout_behavior (subject/info/brand/whitespace/data-note areas + multi_size_adaptation).

PRINCIPLE 4 — Composition Templates. Each direction outputs >= 2 composition_templates with touchpoint in {poster, capability_deck, digital_hero, packaging_front, exhibition_backdrop, short_video_cover, map_or_activity}, each with subject_position, information_position, reusable_assets, image_object_rule, negative_constraints.

PRINCIPLE 5 — Execution Examples. Each direction outputs EXACTLY 3 complete execution_examples, one per category: core_brand (核心品牌传播触点), capability_product (能力/产品触点), digital_event (数字/活动触点). Touchpoints must NOT repeat across the three. Each example carries: example_id, touchpoint, audience, communication_goal, hero_subject, hero_subject_position, hero_subject_scale, supporting_subjects, subject, visual_structure, information_position, information_zone, brand_zone, whitespace_behavior, canvas_ratio, photography_ratio, graphic_ratio, information_ratio, responsive_adaptation, graphic_overlay, reused_assets, industry_recognition_source, industry_content, layout_structure, information_hierarchy, brand_specific_detail, anti_concept_art_rule, prohibited_content, anti_concept_art_note, and downstream_consumer_value {present, consumer_value_role, value_statement, visual_expression, touchpoints, evidence_ids}.

每个触点的 information_zone 必须结构化输出：
- position: 信息区域在画面中的具体位置（如"画面右下 1/3 区域"）
- width_or_height: 信息区域占画面的宽度或高度比例
- alignment: 信息对齐方式（左对齐/居中对齐/右对齐）
- hierarchy_behavior: 信息层级行为（主次信息如何分布）
- collision_avoidance: 与主体/品牌区域的碰撞规避规则

每个触点的 brand_zone 必须结构化输出：
- position: 品牌区域在画面中的具体位置
- logo_scale: 品牌标识在画面中的占比或绝对尺寸
- safe_area: 品牌标识的安全边距
- relationship_to_hero: 品牌区域与主视觉主体的空间关系
- fixed_or_adaptive: 品牌区域是固定位置还是随触点自适应变化

每个触点的 canvas_ratio 必须根据实际载体确定，禁止所有触点统一比例：
- 招商海报 / 社交媒体海报：4:5 或 1:1
- 手册封面 / 产品画册：A4 竖版（210:297）或 A4 横版
- 官网首屏 / 数字主视觉：16:9 或 21:9
- 峰会主视觉 / 展览背景：16:9 或 3:1
- 产品详情页 / 长页：3:4 或长页滚动
- 短视频封面：9:16

每个触点的 responsive_adaptation 必须描述横竖版/多尺寸如何适配，不得使用"保持结构不变"等空泛描述。
每个触点的 whitespace_behavior 必须描述留白区域的具体位置、比例和功能（如"品牌标识与信息区域之间保持 20% 留白，确保信息层级清晰"）。

每个触点必须能明确回答：主体是什么（hero_subject_position）、信息放哪里（information_zone）、品牌专属资产放哪里（brand_zone）、行业识别来自什么、消费者如何感知价值、横竖版/多尺寸如何适配（responsive_adaptation）。

PRINCIPLE 6 — Anti Concept Art. Include EXACTLY the following nine anti_concept_art_constraints (one object per item), using the exact constraint_id values shown — do not invent, rename, abbreviate, or use underscore variants. Each item has constraint_id + rule (<=200 characters). You must include all nine IDs:
1. no_giant_space_installation_as_primary
2. no_architecture_pavilion_sculpture_realestate_as_subject
3. no_material_light_only_premium
4. no_abstract_without_industry_content
5. must_convert_to_flat_design
6. no_distant_grand_space_replacing_info
7. no_default_glass_stone_glowing
8. no_cinematic_concept_art_only
9. must_generate_poster_booklet_packaging_page_template

示例（JSON 片段，必须原样使用以上 constraint_id）：
"anti_concept_art_constraints": [
  {"constraint_id": "no_giant_space_installation_as_primary", "rule": "不得以巨型空间装置作为主要画面"},
  {"constraint_id": "no_architecture_pavilion_sculpture_realestate_as_subject", "rule": "不得以建筑、展馆、雕塑或地产空间为视觉主体"},
  {"constraint_id": "no_material_light_only_premium", "rule": "不得只依赖材质与光影形成高级感"},
  {"constraint_id": "no_abstract_without_industry_content", "rule": "不得只有抽象物体而没有行业内容"},
  {"constraint_id": "must_convert_to_flat_design", "rule": "必须能转化为平面设计"},
  {"constraint_id": "no_distant_grand_space_replacing_info", "rule": "不得用远景宏大空间替代品牌信息"},
  {"constraint_id": "no_default_glass_stone_glowing", "rule": "不得默认使用玻璃曲面、石材和发光结构"},
  {"constraint_id": "no_cinematic_concept_art_only", "rule": "不得只输出电影概念图语言"},
  {"constraint_id": "must_generate_poster_booklet_packaging_page_template", "rule": "必须能直接生成海报、画册、包装或页面母版"}
]

PRINCIPLE 7 — 硬约束（必须满足，违反即视为生成失败）：
1. 必须保留当前项目品牌名称（${brandName}）与品牌角色（${brandRole}）。
2. 不得引入示例品牌名或任何非项目品牌名。
3. 不得将品牌缩减为单一供应链或合规职能。
4. 三个方向必须来自不同 Direction Family（A 全链可信系统 / B 医美产品与材料美学 / C 产业协同与机构赋能），并声明 direction_family（A/B/C）与 family_type。
5. 只能有一个方向以合规为 Primary（compliance_weight < 0.5 的方向才算非合规主方向）。
6. 至少一个方向体现医美产品、材料或科学美学（product_material_weight 最高）。
7. 至少一个方向体现机构赋能与 B2B2C 生态协同（ecosystem_weight 最高）。
8. 每个方向输出 3 个完整真实执行触点（1 核心品牌传播 + 1 能力/产品 + 1 数字/活动），每个触点字段完整。
9. 三方向整体必须覆盖消费者安心与美学价值；至少两个方向必须明确 downstream consumer value；产品材料美学方向（B）必须具有足够品牌美学权重（brand_aesthetic_weight ≥ 0.15 且 consumer_value_weight ≥ 0.10 且 product_material_weight ≥ 0.30）。
10. 不得生成未经 Evidence 支持的具体姓名、编号、比例和评分；字段结构可以使用但必须标记为 structure_only 或 placeholder；内容完整不等于允许执行，必须区分 content readiness 与 execution permission。
11. 每个可复用资产的 asset_id 必须全局唯一（建议格式 E01-G-01 / E01-I-01 / E01-P-01 / E01-L-01），不得跨方向重复；重复 asset_id 将导致执行被阻断。
12. downstream consumer value 的 present 与 consumer_value_role 必须一致：primary → consumer_value_weight ≥ 0.15、strong_secondary → ≥ 0.08、secondary → ≥ 0.04、none → ≤ 0.02；且不得出现 present=true 且 role=none 的矛盾组合。
13. E03 不得滑向展厅 / 地产空间 / 室内设计视觉语言；协同关系必须进入平面传播（海报/画册/包装/页面母版），不得以建筑、展馆或空间装置作为视觉主体（architecture_as_primary_subject 不得超过阈值，flat_design_translatability 必须达标）。
14. 不得输出任何未经 Evidence 支撑的具体指标数值（率、数、指数、评分、比例、覆盖率、参数、区间、排名、增长率、达标率、准确率、合格率、时效、容量、规模、具体百分比、功效/安全性提升百分比等）；字段结构允许但必须标注 structure_only 或占位，区分 field_structure / placeholder_value 与 specific_unverified_value / unsupported_scientific_claim。
15. 六项 compliance_weights 总和必须为 1.00 ± 0.01（compliance_weight + supply_chain_weight + product_material_weight + ecosystem_weight + brand_aesthetic_weight + consumer_value_weight = 1.00）。禁止依赖下游归一化；权重总和错误将导致整组方向被阻断并要求重写。
16. 所有 Execution Example 的 Critical 字段（information_zone、brand_zone）和 Required 字段（canvas_ratio、whitespace_behavior、responsive_adaptation）必须输出。缺失任一 Critical 字段将导致整组方向被阻断。
17. E02 产品材料美学方向不得只使用分子结构、成分比例、产品摄影、实验室、对角线布局等行业通用答案。必须建立"品牌专属材料视觉机制"，并解释：
    - 材料结构如何与品牌资产关联；
    - 微观结构如何形成可复用图形语法；
    - 产品、包装、耗材、器械如何共享同一资产；
    - 科学信息如何转化为审美秩序；
    - 消费者如何感知安心、品质与精致；
    - 与普通医药、护肤、器械视觉有何区别。
18. E01 全链可信系统方向必须体现品牌资产来源，输出 brand_asset_derivation：source_asset（来源于哪个品牌资产）、transformation_rule（从资产到触点的转换规则）、unique_geometry（品牌专属几何形态）、repeat_rule（如何在不同触点复用）、scale_rule（缩放规则）、prohibited_generic_form（禁止的通用形式）。禁止仅把通用节点网络命名为"品牌节点"。
19. 每个触点的画布比例必须根据实际载体确定，禁止所有触点统一比例。

PRINCIPLE 8 — 输出前自检（必须执行，允许自动重试一次）：
在输出最终 JSON 前，必须执行以下自检：
- validateWeightSum()：六项权重总和是否为 1.00 ± 0.01；
- validateExecutionExampleCriticalFields()：每个触点的 information_zone 和 brand_zone 是否完整；
- validateExecutionExampleRequiredFields()：每个触点的 canvas_ratio、whitespace_behavior、responsive_adaptation 是否完整；
- validateE02PositiveQuality()：E02 是否建立了品牌专属材料视觉机制（而非通用行业描述）；
- validateBrandExclusivity()：E01 和 E02 的品牌专属性是否达标（E01 ≥ 4，E02 ≥ 3）；
- validateTouchpointRatios()：每个触点的画布比例是否符合载体规范。

如果自检发现以下问题，允许自动重试一次：权重总和、缺失字段、画布比例、响应适配、品牌区域、信息区域。禁止自动伪造数据、资质、产品参数、注册证或合作成果。

PRINCIPLE 9 — E02 品牌专属材料视觉机制（仅适用于 family_type=product_material_aesthetics 的方向）：
E02 必须通过以下八个维度建立品牌专属材料视觉机制：
1. proprietary_material_motif：品牌专属材料母题（如"九州美学分子编织纹"）
2. source_from_brand_assets：该母题来源于哪个现有品牌资产
3. microscopic_visual_rule：微观结构在平面传播中的图形语法规则（如何放大、裁切、重复、配色）
4. material_light_behavior：材质与光线的行为逻辑（如何表现产品质感、透明感、精密感）
5. product_object_rule：产品/器械/耗材在画面中的呈现规则（如何展示而不沦为产品目录）
6. information_aesthetic_rule：科学信息如何转化为审美秩序（数据、参数、成分如何排版而不成为说明书）
7. consumer_perception_bridge：消费者如何感知安心、品质与精致（从视觉到心理预期的桥梁）
8. cross_touchpoint_asset_behavior：同一视觉资产如何跨产品、包装、机构、数字触点复用

E02 通过标准（六项正向质量均 ≥ 3）：
- 产品呈现力 ≥ 3
- 品牌美学力 ≥ 3
- 消费者价值力 ≥ 3
- 执行多样性 ≥ 3
- 材质专属性 ≥ 3
- 品牌专属性 ≥ 3

strategic_idea: <= 80 Chinese characters, not a slogan, must contain brand fact + industry object + execution mechanism.

Evidence Index: ${JSON.stringify(context.evidenceIndex || [])}
Audience Boundary: ${JSON.stringify(context.audienceBoundary || {})}
Asset Boundary (allowed): ${(context.assetBoundary?.allowed_assets || context.assetBoundary?.allowed || []).map((a) => (typeof a === 'string' ? a : (a.asset_id || a.assetId))).join(', ') || 'none'}
Asset Boundary (restricted): ${(context.assetBoundary?.restricted_assets || context.assetBoundary?.restricted || []).map((a) => (typeof a === 'string' ? a : (a.asset_id || a.assetId))).join(', ') || 'none'}
Selected Touchpoints: ${(context.selectedTouchpoints || []).join(', ') || 'none'}

Return JSON only. Ensure the output is valid JSON: every object and array element must be separated by a comma, and every opening bracket must have a matching closing bracket. Do NOT output markdown, explanations, or trailing text outside the JSON.
{"visualDirectionV2Set":{"directions":[{"direction_id":"E01","direction_name":"执行向中文名","strategic_idea":"品牌事实+行业对象+执行机制（<=80字）","direction_family":"A","family_type":"supply_chain_trust","industry_recognition_layer":{"industry_visual_objects":["..."],"industry_data_objects":["..."],"industry_process_objects":["..."],"industry_space_and_real_scenes":["..."],"usable_business_objects":["..."],"prohibited_misleading_templates":["..."],"minimum_industry_recognition_strength":4},"core_reusable_assets":[{"asset_id":"A01","asset_name":"...","asset_type":"graphic_asset","visual_description":"...","business_evidence":"...","execution_role":"...","reusable_touchpoints":["poster"],"prohibited_use":"..."}],"graphic_system":{"how_graphics_form":"...","brand_fact_mapping":"...","scale_crop_repeat":"...","enter_touchpoints":"...","must_not_become":"..."},"photography_object_system":{"needs_photography":"required","real_industry_objects":["..."],"subject_and_background":"...","people_product_packaging":"...","graphic_overlay":"...","real_content_ratio":{"real_industry_content_ratio":0.4,"branded_graphic_ratio":0.35,"information_layout_ratio":0.25}},"information_system":{"core_brand_info":"...","capability_product_info":"...","data_qualification_info":"structure_only 示意，不填具体数值","cta_info":"...","information_hierarchy":["..."],"fabricated_info_prohibited":["..."]},"layout_behavior":{"subject_area":"...","info_area":"...","brand_area":"...","whitespace_area":"...","data_note_area":"...","multi_size_adaptation":"..."},"composition_templates":[{"template_id":"T01","touchpoint":"poster","subject_position":"...","information_position":"...","reusable_assets":["A01"],"image_object_rule":"...","negative_constraints":["..."]}],"material_and_light_support":{"material_support":"...","light_support":"..."},"execution_examples":[{"example_id":"X01","touchpoint_category":"core_brand","subject":"...","visual_structure":"...","information_position":"...","reused_assets":["A01"],"industry_recognition_source":"...","anti_concept_art_note":"...","touchpoint":"招商海报","audience":"B2B采购决策者","communication_goal":"建立平台可信","hero_subject":"...","supporting_subjects":"...","industry_content":"...","layout_structure":"左图右信息栅格","information_hierarchy":"品牌-能力-数据-CTA","brand_specific_detail":"品牌专属节点图形","anti_concept_art_rule":"不得概念稿化","prohibited_content":"建筑/展馆主体","downstream_consumer_value":{"present":true,"consumer_value_role":"strong_secondary","value_statement":"...","visual_expression":"...","touchpoints":["..."],"evidence_ids":[]}},"example_id":"X02","touchpoint_category":"capability_product","subject":"...","visual_structure":"...","information_position":"...","reused_assets":["A01"],"industry_recognition_source":"...","anti_concept_art_note":"...","touchpoint":"供应链能力手册封面","audience":"B2B采购决策者","communication_goal":"展示能力","hero_subject":"...","supporting_subjects":"...","industry_content":"...","layout_structure":"左图右信息栅格","information_hierarchy":"能力-数据-CTA","brand_specific_detail":"品牌专属节点图形","anti_concept_art_rule":"不得概念稿化","prohibited_content":"建筑/展馆主体","downstream_consumer_value":{"present":false,"consumer_value_role":"secondary","value_statement":"","visual_expression":"","touchpoints":[],"evidence_ids":[]}},"example_id":"X03","touchpoint_category":"digital_event","subject":"...","visual_structure":"...","information_position":"...","reused_assets":["A01"],"industry_recognition_source":"...","anti_concept_art_note":"...","touchpoint":"官网首屏","audience":"B2B采购决策者","communication_goal":"引导 Demo","hero_subject":"...","supporting_subjects":"...","industry_content":"...","layout_structure":"左图右信息栅格","information_hierarchy":"品牌-能力-CTA","brand_specific_detail":"品牌专属节点图形","anti_concept_art_rule":"不得概念稿化","prohibited_content":"建筑/展馆主体","downstream_consumer_value":{"present":false,"consumer_value_role":"secondary","value_statement":"","visual_expression":"","touchpoints":[],"evidence_ids":[]}}],"compliance_weights":{"compliance_weight":0.2,"supply_chain_weight":0.3,"product_material_weight":0.1,"ecosystem_weight":0.2,"brand_aesthetic_weight":0.1,"consumer_value_weight":0.1},"industry_recognition_classification":{"regulatory_objects":["..."],"supply_chain_objects":["..."],"product_material_objects":["..."],"institution_service_objects":["..."],"consumer_value_objects":["..."],"aesthetic_culture_objects":["..."]},"asset_authorization":{"data_authorization_level":"abstracted","document_visualization_mode":"structure_only","credential_usage_mode":"redacted","generated_data_policy":"abstracted"},"downstream_consumer_value":{"present":true,"consumer_value_role":"strong_secondary","value_statement":"上游可信如何转化为消费者安心","visual_expression":"温控追溯可视化带来安心感","touchpoints":["官网","招商物料"],"evidence_ids":[]} 采购决策者","communication_goal":"建立平台可信","hero_subject":"医美机构门头与诊疗空间","industry_content":"真实行业对象","layout_structure":"左图右信息栅格","brand_specific_detail":"九州美学节点图形","anti_concept_art_rule":"不得概念稿化"}],"brand_evidence":"...","direction_family":"A","compliance_weights":{"compliance_weight":0.3,"supply_chain_weight":0.25,"product_material_weight":0.15,"ecosystem_weight":0.2,"brand_aesthetic_weight":0.05,"consumer_value_weight":0.05},"industry_recognition_classification":{"regulatory_objects":["..."],"supply_chain_objects":["..."],"product_material_objects":["..."],"institution_service_objects":["..."],"consumer_value_objects":["..."],"aesthetic_culture_objects":["..."]},"asset_authorization":{"data_authorization_level":"abstracted","document_visualization_mode":"structure_only","credential_usage_mode":"redacted","generated_data_policy":"abstracted"},"execution_constraints":["..."],"anti_concept_art_constraints":[{"constraint_id":"no_giant_space_installation_as_primary","rule":"不得以巨型空间装置作为主要画面"}],"template_risks":["..."],"evidence_ids":["VE001"],"asset_references":[]}]}}
` }];
}
