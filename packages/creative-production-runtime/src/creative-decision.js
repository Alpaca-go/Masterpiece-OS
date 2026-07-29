export const CREATIVE_DECISION_SCHEMA_VERSION = '1.0';
export const CREATIVE_DECISION_REPORT_FILENAME = '05-Creative-Decision.md';
export const CREATIVE_DECISION_JSON_FILENAME = 'creative_decision.json';

function text(value) {
  return String(value ?? '').trim();
}

function strings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

function defaultDirections(direction) {
  const primaryName = text(direction.primaryConcept || direction.creativeConcept);
  const primarySummary = text(direction.designStrategy || direction.visualWorld);
  const candidates = Array.isArray(direction.visualDirections)
    ? direction.visualDirections
    : [];
  const normalized = candidates
    .map((candidate) => ({
      name: text(candidate?.name),
      summary: text(candidate?.summary),
      rationale: text(candidate?.rationale),
      recommended: candidate?.recommended === true,
    }))
    .filter((candidate) => candidate.name && candidate.summary && candidate.rationale);
  if (!normalized.length) {
    return [{
      name: primaryName,
      summary: primarySummary,
      rationale: text(direction.projectTransformation || direction.brandReposition),
      recommended: true,
    }];
  }
  const recommendedIndex = normalized.findIndex((candidate) => candidate.recommended);
  return normalized.map((candidate, index) => ({
    ...candidate,
    recommended: index === (recommendedIndex >= 0 ? recommendedIndex : 0),
  }));
}

export function compileCreativeDecision(direction) {
  const visualDirections = defaultDirections(direction);
  const recommended = visualDirections.find((candidate) => candidate.recommended);
  const decision = {
    schema_version: CREATIVE_DECISION_SCHEMA_VERSION,
    project_id: text(direction?.projectId),
    direction_id: text(direction?.id),
    direction_version: text(direction?.version),
    brand_strategy: text(direction?.brandReposition || direction?.projectTransformation),
    visual_direction: {
      recommended: text(recommended?.name),
      rationale: text(recommended?.rationale),
      alternatives: visualDirections
        .filter((candidate) => !candidate.recommended)
        .map((candidate) => `${candidate.name}: ${candidate.summary}`),
    },
    keep_assets: strings(direction?.keepAssets ?? direction?.thingsToKeep),
    avoid_assets: strings([
      ...(direction?.removeAssets ?? direction?.thingsToRemove ?? []),
      ...(direction?.generationRules ?? []),
    ]),
    color_system: strings([direction?.colorStrategy]),
    material_system: strings([direction?.materialStrategy]),
    composition_rule: strings([direction?.compositionStrategy]),
    generation_goal: strings([
      direction?.projectTransformation,
      direction?.visualWorld,
      direction?.visualMechanism,
    ]),
    generated_at: text(direction?.generatedAt),
  };
  return validateCreativeDecision(decision);
}

export function validateCreativeDecision(decision) {
  if (!decision || decision.schema_version !== CREATIVE_DECISION_SCHEMA_VERSION) {
    throw Object.assign(new Error('Creative Decision schema version is invalid.'), {
      code: 'CREATIVE_DECISION_INVALID',
    });
  }
  for (const field of [
    'project_id', 'direction_id', 'direction_version', 'brand_strategy', 'generated_at',
  ]) {
    if (!text(decision[field])) {
      throw Object.assign(new Error(`Creative Decision is missing ${field}.`), {
        code: 'CREATIVE_DECISION_INVALID',
      });
    }
  }
  if (!text(decision.visual_direction?.recommended)
    || !text(decision.visual_direction?.rationale)
    || !Array.isArray(decision.visual_direction?.alternatives)) {
    throw Object.assign(new Error('Creative Decision visual_direction is invalid.'), {
      code: 'CREATIVE_DECISION_INVALID',
    });
  }
  for (const field of [
    'keep_assets', 'avoid_assets', 'color_system', 'material_system',
    'composition_rule', 'generation_goal',
  ]) {
    if (!strings(decision[field]).length) {
      throw Object.assign(new Error(`Creative Decision ${field} must not be empty.`), {
        code: 'CREATIVE_DECISION_INVALID',
      });
    }
  }
  return decision;
}

export function compileCreativeDecisionMarkdown(direction, decision = compileCreativeDecision(direction)) {
  validateCreativeDecision(decision);
  const list = (values) => strings(values).map((item) => `- ${item}`).join('\n');
  const alternatives = decision.visual_direction.alternatives.length
    ? list(decision.visual_direction.alternatives)
    : '- No secondary direction was retained.';
  return [
    '# Creative Decision',
    `Direction: ${decision.direction_id}@${decision.direction_version}`,
    '## Brand Diagnosis',
    list(direction.oldVisualProblems),
    '## Core Upgrade Strategy',
    `${decision.brand_strategy}\n\n${text(direction.designStrategy)}`,
    '## Keep Assets',
    list(decision.keep_assets),
    '## Remove Assets',
    list(decision.avoid_assets),
    '## New Visual DNA',
    `### Color System\n${list(decision.color_system)}`,
    `### Material System\n${list(decision.material_system)}`,
    `### Mood\n${list(direction.visualKeywords)}`,
    `### Composition Principles\n${list(decision.composition_rule)}`,
    '## Visual Direction',
    `### Recommended: ${decision.visual_direction.recommended}`,
    decision.visual_direction.rationale,
    '### Alternatives',
    alternatives,
    '## Generation Goal',
    list(decision.generation_goal),
  ].join('\n\n');
}
