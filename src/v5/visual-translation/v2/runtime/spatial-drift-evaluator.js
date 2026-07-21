// E03 Spatial Drift Evaluator (doc section 十一).
//
// Detects when a direction slides back into exhibition-space / real-estate /
// interior-design visual language instead of a flat-design-translatable,
// information-carrying execution piece. The doc forbids:
//   architecture_as_primary_subject >= 4   -> rewrite_required
//   flat_design_translatability    <= 2     -> rewrite_required
//
// The prompt must steer the model toward "how the协同 enters flat 传播" rather
// than "协同 happens in which 空间".

import { collectDirectionText } from './direction-text-util.js';
import { countKeywordHits } from './evaluator-keywords.js';

export const SPATIAL_DRIFT_EVALUATOR_VERSION = 'spatial-drift-evaluator-v1';

const ARCHITECTURE_PRIMARY = ['建筑主体', '展馆', '雕塑', '地产空间', '巨型空间装置', '宏大空间', '建筑作为主体', '空间装置', '展厅主体', '地标建筑'];
const EXHIBITION_SPACE = ['展厅', '展览空间', '展陈', '展馆内部', '展览馆'];
const REAL_ESTATE_LANGUAGE = ['楼盘', '售楼', '样板间', '地产', '户型', '沙盘', '地产视觉'];
const INTERIOR_DESIGN = ['室内设计', '软装', '家居', '室内场景', '空间软装', '室内'];
const FLAT_DESIGN_POSITIVE = ['海报', '画册', '包装', '页面', '母版', '信息图', '信息层级', '品牌专属', 'composition_template', '平面', '字号', '网格'];

const NEGATION_MARKERS = [
  '不得', '禁止', '不以', '避免', '不可', '严禁', '不要', '拒绝',
  '不生成', '不采用', '不依赖', '不制造', '不输出', '不默认', '不只有',
  '不成为', '不退化', '不替换', '不脱离', '不堆砌', '不制造高级感'
];

// Drop prohibition / negation clauses so a direction that FORBIDS architecture
// ("不得用建筑作为主体") is NOT counted as one that USES architecture as its
// primary subject. The gate must catch directions that SLIDE INTO exhibition /
// real-estate / interior language, not directions that merely prohibit it
// (doc section 十一).
function stripProhibitions(text) {
  if (!text) return '';
  // Only split on SENTENCE / line boundaries — NOT on 、 or ，. A list-style
  // prohibition like "不得以建筑、展馆、雕塑或地产空间为视觉主体" must be
  // dropped as one unit; splitting on 、 would leak "展馆" as a bare (unguarded)
  // architecture keyword.
  const clauses = String(text).split(/[。；；\n]/);
  const kept = clauses.filter((c) => !NEGATION_MARKERS.some((m) => c.includes(m)));
  return kept.join(' ');
}

// Per-direction worst-case keyword count (doc §十一: a single direction whose
// primary subject is architecture is the drift risk — NOT the sum of weak
// mentions across all three directions, which previously inflated the score to
// ~21 because every direction repeats the same prohibition clauses).
function perDirectionMaxKeywordHits(directions, keywords) {
  let max = 0;
  for (const d of directions) {
    const clean = stripProhibitions(collectDirectionText(d));
    const hits = countKeywordHits(clean, keywords);
    if (hits > max) max = hits;
  }
  return max;
}

export function evaluateSpatialDrift(directions = []) {
  const architecture = perDirectionMaxKeywordHits(directions, ARCHITECTURE_PRIMARY);
  const exhibition = perDirectionMaxKeywordHits(directions, EXHIBITION_SPACE);
  const realEstate = perDirectionMaxKeywordHits(directions, REAL_ESTATE_LANGUAGE);
  const interior = perDirectionMaxKeywordHits(directions, INTERIOR_DESIGN);

  // flat_design_translatability: starts at 1, +1 per concrete flat-design
  // signal present in the set, capped at 5.
  let flat = 1;
  const hasComposition = directions.some((d) => (d.composition_templates?.length || 0) >= 2);
  const hasBrandDetail = directions.some((d) => (d.execution_examples || []).some((e) => e.brand_specific_detail && e.brand_specific_detail.trim().length > 0));
  const hasInformationSystem = directions.some((d) => d.information_system && (d.information_system.information_hierarchy?.length || 0) >= 3);
  const hasGraphicSystem = directions.some((d) => d.graphic_system && d.graphic_system.how_graphics_form);
  const hasAntiConcept = directions.some((d) => (d.anti_concept_art_constraints?.length || 0) > 0);
  for (const present of [hasComposition, hasBrandDetail, hasInformationSystem, hasGraphicSystem, hasAntiConcept]) {
    if (present) flat += 1;
  }
  flat = Math.min(5, flat);

  const informationDesign = directions.some((d) => (d.information_system?.information_hierarchy?.length || 0) >= 3 || (d.execution_examples || []).some((e) => e.information_hierarchy));

  const warning = (exhibition > 0 || realEstate > 0 || architecture >= 2) && flat >= 4;
  const rewriteRequired = architecture >= 4 || flat <= 2;

  let spatialDriftStatus = 'pass';
  if (rewriteRequired) spatialDriftStatus = 'blocked';
  else if (warning) spatialDriftStatus = 'warning';

  const blockingReasons = [];
  if (architecture >= 4) blockingReasons.push(`spatial_drift_architecture_primary(${architecture})`);
  if (flat <= 2) blockingReasons.push(`spatial_drift_flat_design_low(${flat})`);
  if (warning && !rewriteRequired) blockingReasons.push(`spatial_drift_warning(arch=${architecture},exhibition=${exhibition},realEstate=${realEstate},flat=${flat})`);

  return {
    evaluator_version: SPATIAL_DRIFT_EVALUATOR_VERSION,
    spatial_drift_status: spatialDriftStatus,
    architecture_as_primary_subject: architecture,
    exhibition_space_dependency: exhibition > 0,
    real_estate_visual_language: realEstate > 0,
    interior_design_dependency: interior > 0,
    flat_design_translatability: flat,
    information_design_presence: Boolean(informationDesign),
    warning,
    rewrite_required: rewriteRequired,
    blocking_reasons: blockingReasons
  };
}
