// Execution-oriented Direction Generation Prompt v2 (doc section 四 / 五).
//
// Replaces the conceptual v1 prompt. It forces the model to answer "how" — core
// visual assets, industry recognition first, reusable assets, composition
// templates, and anti-concept-art constraints — instead of a macro metaphor.
// Produces the visual-direction-v2-execution contract JSON.

export const VISUAL_DIRECTIONS_PROMPT_V2_VERSION = 'visual-direction-v2-execution';

export function buildExecutionDirectionV2Prompt(context) {
  const reportLanguage = context.evidenceMap?.reportLanguage || context.reportLanguage || 'zh-CN';
  return [{ role: 'system', content: `PROTOCOL_STAGE=04-execution-oriented-directions-v2
PROMPT_VERSION=${VISUAL_DIRECTIONS_PROMPT_V2_VERSION}
DIRECTION_GENERATION_MODE=execution_oriented_v2
Report language is ${reportLanguage}. Produce exactly three meaningfully different EXECUTION-READY Visual Directions. This is an experiment that runs alongside the frozen conceptual_v1 baseline; do NOT replace it.

Read the v1 inputs you are allowed to use: brand facts, Evidence Index, Audience Boundary, Asset Boundary and selected touchpoints. You must NOT fabricate evidence or execute restricted assets.

PRINCIPLE 1 — Industry Recognition First. Every direction must build an industry_recognition_layer BEFORE any abstract metaphor: industry_visual_objects, industry_data_objects, industry_process_objects, industry_space_and_real_scenes, usable_business_objects, prohibited_misleading_templates, and a minimum_industry_recognition_strength (1-5, must be >= 4 for a ready direction).

PRINCIPLE 2 — Reusable Visual Assets. Each direction needs 3-5 core_reusable_assets covering at least: 1 graphic_asset, 1 information_asset, 1 photography_asset, 1 layout_asset. Each asset: asset_id, asset_name, asset_type, visual_description, business_evidence, execution_role, reusable_touchpoints, prohibited_use. Never output only colors, materials, light or mood.

PRINCIPLE 3 — Answer "how". Each direction must define: graphic_system (how graphics form + brand mapping + scale/crop/repeat + enter touchpoints + must-not-become), photography_object_system (real industry objects, real_content_ratio summing to 1.0), information_system (core/capability/data/cta + hierarchy + fabricated_info_prohibited), layout_behavior (subject/info/brand/whitespace/data-note areas + multi_size_adaptation).

PRINCIPLE 4 — Composition Templates. Each direction outputs >= 2 composition_templates with touchpoint in {poster, capability_deck, digital_hero, packaging_front, exhibition_backdrop, short_video_cover, map_or_activity}, each with subject_position, information_position, reusable_assets, image_object_rule, negative_constraints.

PRINCIPLE 5 — Execution Examples. Each direction outputs 3 execution_examples covering core_brand, capability_product and digital_event, each with subject, visual_structure, information_position, reused_assets, industry_recognition_source, anti_concept_art_note.

PRINCIPLE 6 — Anti Concept Art. Include ALL nine anti_concept_art_constraints (constraint_id + rule). Prohibited: giant space installations as primary, architecture/pavilion/sculpture/real-estate as visual subject, material+light-only premium, abstract without industry content, non-flat-design output, distant grand space replacing brand info, default glass/stone/glowing, cinematic concept-art-only language.

strategic_idea: <= 80 Chinese characters, not a slogan, must contain brand fact + industry object + execution mechanism.

Evidence Index: ${JSON.stringify(context.evidenceMap || {})}
Audience Boundary: ${JSON.stringify(context.audienceBoundary || {})}
Asset Boundary (allowed): ${(context.assetBoundary?.allowed_assets || context.assetBoundary?.allowed || []).map((a) => (typeof a === 'string' ? a : (a.asset_id || a.assetId))).join(', ') || 'none'}
Asset Boundary (restricted): ${(context.assetBoundary?.restricted_assets || context.assetBoundary?.restricted || []).map((a) => (typeof a === 'string' ? a : (a.asset_id || a.assetId))).join(', ') || 'none'}
Selected Touchpoints: ${(context.selectedTouchpoints || []).join(', ') || 'none'}

Return JSON only:
{"visualDirectionV2Set":{"directions":[{"direction_id":"E01","direction_name":"执行向中文名","strategic_idea":"品牌事实+行业对象+执行机制（<=80字）","industry_recognition_layer":{"industry_visual_objects":["..."],"industry_data_objects":["..."],"industry_process_objects":["..."],"industry_space_and_real_scenes":["..."],"usable_business_objects":["..."],"prohibited_misleading_templates":["..."],"minimum_industry_recognition_strength":4},"core_reusable_assets":[{"asset_id":"A01","asset_name":"...","asset_type":"graphic_asset","visual_description":"...","business_evidence":"...","execution_role":"...","reusable_touchpoints":["poster"],"prohibited_use":"..."}],"graphic_system":{"how_graphics_form":"...","brand_fact_mapping":"...","scale_crop_repeat":"...","enter_touchpoints":"...","must_not_become":"..."},"photography_object_system":{"needs_photography":"required","real_industry_objects":["..."],"subject_and_background":"...","people_product_packaging":"...","graphic_overlay":"...","real_content_ratio":{"real_industry_content_ratio":0.4,"branded_graphic_ratio":0.35,"information_layout_ratio":0.25}},"information_system":{"core_brand_info":"...","capability_product_info":"...","data_qualification_info":"...","cta_info":"...","information_hierarchy":["..."],"fabricated_info_prohibited":["..."]},"layout_behavior":{"subject_area":"...","info_area":"...","brand_area":"...","whitespace_area":"...","data_note_area":"...","multi_size_adaptation":"..."},"composition_templates":[{"template_id":"T01","touchpoint":"poster","subject_position":"...","information_position":"...","reusable_assets":["A01"],"image_object_rule":"...","negative_constraints":["..."]}],"material_and_light_support":{"material_support":"...","light_support":"..."},"execution_examples":[{"example_id":"X01","touchpoint_category":"core_brand","subject":"...","visual_structure":"...","information_position":"...","reused_assets":["A01"],"industry_recognition_source":"...","anti_concept_art_note":"..."}],"brand_evidence":"...","execution_constraints":["..."],"anti_concept_art_constraints":[{"constraint_id":"no_giant_space_installation_as_primary","rule":"不得以巨型空间装置作为主要画面"}],"template_risks":["..."],"evidence_ids":["VE001"],"asset_references":[]}]}}
` }];
}
