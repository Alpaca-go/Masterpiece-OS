// Brand Identity Preservation Gate (doc section 2 / 3).
//
// P0 — blocks the v2 pipeline when the model substitutes or shrinks the
// project brand. The "安迹" incident (a non-project brand name appearing in
// the report instead of 九州美学) is exactly this class of failure: the model
// hallucinated a different brand. We never trust source fixtures to contain the
// leak; instead we scan the generated output for any unexpected brand name.
//
// v2.1.2 (Precision Patch): brand detection now uses confidence scoring and
// context analysis to avoid false positives from ordinary Chinese phrases.
// Hard-block only when: entity_type === 'brand' && confidence >= 0.85 &&
// matched_source is NOT prompt_instruction or negative_constraint.

import { collectDirectionText } from './direction-text-util.js';
import { BRAND_NAME_SUFFIX, BRAND_ROLE_KEYWORDS, STRATEGIC_THESIS_KEYWORDS, countKeywordHits } from './evaluator-keywords.js';

export const BRAND_IDENTITY_PRESERVATION_EVALUATOR_VERSION = 'brand-identity-preservation-evaluator-v2';

// Phrases that are NOT brand names even if they look like them (doc §三).
const NON_BRAND_PHRASES = new Set([
  '提供真实行业对象',
  '用真实行业对象替代概念艺术',
  '真实行业对象',
  '行业对象',
  '真实对象'
]);

// Fields that carry brand context (doc §三).
const BRAND_CONTEXT_FIELDS = /direction_name|strategic_idea|brand_evidence|brand_fact_mapping|how_graphics_form|core_brand_info|cta_info|execution_role|brand_specific_detail/;

// Prompt-instruction / negative-constraint markers (doc §三).
const PROMPT_INSTRUCTION_MARKERS = /不得|禁止|必须|需要|应该|PRINCIPLE|原则|提示|prompt|instruction|constraint|约束/;

function computeConfidence(match, text, fieldPath) {
  let score = 0.5;
  // 1. Brand-suffix strength
  const suffixStrength = {
    '集团': 0.9, '控股': 0.9, '实业': 0.85, '生物科技': 0.9, '生命科学': 0.9,
    '药业': 0.85, '大健康': 0.85, '健康科技': 0.85, '文化传媒': 0.85, '品牌管理': 0.85
  };
  for (const [s, v] of Object.entries(suffixStrength)) {
    if (match.includes(s)) score = Math.max(score, v);
  }
  // 2. Context boost: appears in brand-related field
  if (fieldPath && BRAND_CONTEXT_FIELDS.test(fieldPath)) score += 0.1;
  // 3. Context boost: appears near "品牌" / "项目"
  const idx = text.indexOf(match);
  const window = text.slice(Math.max(0, idx - 30), idx + match.length + 30);
  if (/品牌|项目|来自|名称|角色/.test(window)) score += 0.1;
  // 4. Penalty: in prompt-instruction context
  if (PROMPT_INSTRUCTION_MARKERS.test(window)) score -= 0.3;
  return Math.min(0.98, Math.max(0.1, score));
}

function determineSource(fieldPath, text, match) {
  if (fieldPath && BRAND_CONTEXT_FIELDS.test(fieldPath)) return 'explicit_brand_field';
  const idx = text.indexOf(match);
  const window = text.slice(Math.max(0, idx - 40), idx + match.length + 40);
  if (PROMPT_INSTRUCTION_MARKERS.test(window)) return 'prompt_instruction';
  if (/品牌名为|项目为|来自|品牌名称|品牌角色/.test(window)) return 'brand_context_phrase';
  return 'generic_text';
}

function getDetectionReason(match, confidence, source) {
  if (confidence >= 0.85) return 'high_confidence_brand_suffix_match';
  if (confidence >= 0.6) return 'moderate_confidence_brand_indicator';
  return 'low_confidence_possible_brand';
}

// Scan free text for brand names that are NOT the expected brand (or its known
// aliases) and for any explicitly-forbidden example brand names.
// v2.1.2: returns rich detection objects with confidence scoring and source
// classification to avoid false positives from ordinary Chinese phrases.
export function detectUnexpectedBrandNames({
  expectedBrandName,
  sourceText,
  knownExampleBrandNames = [],
  knownAliases = [],
  fieldPath = ''
} = {}) {
  const allowlist = new Set([expectedBrandName, ...(knownAliases || [])].filter(Boolean));
  const denied = new Set(knownExampleBrandNames || []);
  const found = [];
  const text = String(sourceText || '');

  // 1) forbidden example brands (e.g. a demo brand that leaked into output).
  for (const name of denied) {
    if (name && text.includes(name) && !allowlist.has(name)) {
      const idx = text.indexOf(name);
      const surrounding = text.slice(Math.max(0, idx - 30), idx + name.length + 30);
      const source = determineSource(fieldPath, text, name);
      const confidence = source === 'prompt_instruction' ? 0.3 : 0.95;
      found.push({
        detected_text: name,
        field_path: fieldPath,
        surrounding_context: surrounding,
        entity_type: 'brand',
        confidence,
        matched_source: source,
        detection_reason: 'explicit_forbidden_example_brand'
      });
    }
  }

  // 2) brand-suffix tokens that are not the allowed project brand.
  // v2.1.2: only flag as hard-block when confidence >= 0.85 and source is not
  // prompt_instruction or negative_constraint.
  const suffixMatches = text.match(BRAND_NAME_SUFFIX);
  if (suffixMatches) {
    for (const token of suffixMatches) {
      const cleaned = token.replace(BRAND_NAME_SUFFIX, '$1$2');
      // Skip non-brand phrases (e.g. "提供真实行业对象")
      if (NON_BRAND_PHRASES.has(cleaned) || NON_BRAND_PHRASES.has(token)) continue;
      if (!allowlist.has(cleaned) && !found.some((f) => f.detected_text === cleaned)) {
        const source = determineSource(fieldPath, text, token);
        const confidence = computeConfidence(token, text, fieldPath);
        const reason = getDetectionReason(token, confidence, source);
        found.push({
          detected_text: cleaned,
          field_path: fieldPath,
          surrounding_context: token,
          entity_type: confidence >= 0.85 ? 'brand' : 'possible_brand',
          confidence,
          matched_source: source,
          detection_reason: reason
        });
      }
    }
  }

  return {
    hasUnexpected: found.length > 0,
    found: Array.from(new Set(found.map((f) => f.detected_text))),
    detections: found,
    expectedBrandName,
    allowed: Array.from(allowlist),
    denied: Array.from(denied)
  };
}

export function evaluateBrandIdentityPreservation({
  directions = [],
  expectedBrandName = '九州美学',
  brandRole = '医美全链生态平台',
  strategicThesis = 'B2B2C 医美全链生态平台',
  knownExampleBrandNames = [],
  knownAliases = []
} = {}) {
  const contaminationSources = [];
  let brandNamePreserved = true;
  let rolePreserved = true;
  let thesisPreserved = true;
  let industryIdentityPreserved = true;

  const roleHitsRequired = 2; // at least two role keywords must survive
  const thesisHitsRequired = 3; // strategic thesis must remain multi-dimensional

  for (const direction of directions) {
    const text = collectDirectionText(direction);
    const detection = detectUnexpectedBrandNames({
      expectedBrandName,
      sourceText: text,
      knownExampleBrandNames,
      knownAliases
    });

    // v2.1.2: only HARD BLOCK when high-confidence brand detections that are
    // NOT from prompt instructions or negative constraints.
    const hardBlockDetections = detection.detections.filter((d) =>
      d.entity_type === 'brand' &&
      d.confidence >= 0.85 &&
      d.matched_source !== 'prompt_instruction' &&
      d.matched_source !== 'negative_constraint'
    );
    const warningDetections = detection.detections.filter((d) =>
      !hardBlockDetections.includes(d) && d.confidence >= 0.6
    );

    if (hardBlockDetections.length > 0) {
      brandNamePreserved = false;
      contaminationSources.push({
        direction_id: direction.direction_id,
        unexpected_brand_names: hardBlockDetections.map((d) => d.detected_text),
        detections: hardBlockDetections,
        possible_false_positive: false
      });
    } else if (warningDetections.length > 0) {
      // v2.1.2: low/moderate-confidence detections are warnings, not blocks
      contaminationSources.push({
        direction_id: direction.direction_id,
        unexpected_brand_names: warningDetections.map((d) => d.detected_text),
        detections: warningDetections,
        possible_false_positive: true
      });
    }

    // brand name must actually appear in the output
    if (!text.includes(expectedBrandName)) {
      brandNamePreserved = false;
      contaminationSources.push({
        direction_id: direction.direction_id,
        unexpected_brand_names: [`missing:${expectedBrandName}`]
      });
      continue;
    }

    // brand role must not be shrunk to a single function
    const roleHits = countKeywordHits(text, BRAND_ROLE_KEYWORDS);
    if (roleHits < roleHitsRequired) {
      rolePreserved = false;
      contaminationSources.push({
        direction_id: direction.direction_id,
        reason: 'brand_role_reduced',
        role_keyword_hits: roleHits
      });
    }

    const thesisHits = countKeywordHits(text, STRATEGIC_THESIS_KEYWORDS);
    if (thesisHits < thesisHitsRequired) {
      thesisPreserved = false;
      contaminationSources.push({
        direction_id: direction.direction_id,
        reason: 'strategic_thesis_reduced',
        thesis_keyword_hits: thesisHits
      });
    }

    // industry identity must not be simplified to a single supply/compliance role
    const singleFunction = /(医疗器械供应链公司|合规 ?SaaS|器械采购平台|医药物流企业)/.test(text);
    if (singleFunction) {
      industryIdentityPreserved = false;
      contaminationSources.push({
        direction_id: direction.direction_id,
        reason: 'industry_identity_simplified'
      });
    }
  }

  const contaminationDetected = contaminationSources.length > 0;
  const hasHardBlock = contaminationSources.some((s) => s.detections && !s.possible_false_positive && s.unexpected_brand_names?.length > 0 && !s.unexpected_brand_names[0].startsWith('missing:'));
  const brandIdentityPreserved = !hasHardBlock && brandNamePreserved && rolePreserved && thesisPreserved && industryIdentityPreserved;

  const blockingReasons = [];
  if (!brandNamePreserved) blockingReasons.push('brand_name_not_preserved');
  if (!rolePreserved) blockingReasons.push('brand_role_reduced');
  if (!thesisPreserved) blockingReasons.push('strategic_thesis_reduced');
  if (!industryIdentityPreserved) blockingReasons.push('industry_identity_simplified');

  return {
    evaluator_version: BRAND_IDENTITY_PRESERVATION_EVALUATOR_VERSION,
    brand_identity_preserved: brandIdentityPreserved,
    brand_name_preserved: brandNamePreserved,
    brand_role_preserved: rolePreserved,
    strategic_thesis_preserved: thesisPreserved,
    industry_identity_preserved: industryIdentityPreserved,
    contamination_detected: contaminationDetected,
    contamination_sources: contaminationSources,
    blocking_reasons: blockingReasons,
    error_code: hasHardBlock ? 'UNEXPECTED_BRAND_IDENTITY' : undefined
  };
}
