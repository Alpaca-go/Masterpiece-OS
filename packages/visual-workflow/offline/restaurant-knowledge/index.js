// Offline research only. No production registration, filesystem, model or transport access.
// Claims are explicit annotations, not an NLP interpretation of arbitrary Packet prose.
export const SOURCE_TYPES = Object.freeze(['source_fact', 'user_confirmed_design_goal',
  'historical_human_acceptance', 'analysis_proposal', 'rks_candidate']);
export const STATUSES = Object.freeze(['confirmed', 'probable', 'unknown', 'conflict']);
export const DIMENSIONS = Object.freeze(['cuisine_product', 'business_format', 'location_context',
  'customers', 'service_model', 'brand_positioning', 'experiential_mood', 'cultural_context',
  'spatial_mechanism', 'visual_style', 'material']);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.length > 0 && value.every(nonempty);
const sorted = values => [...new Set(values)].sort();
const stable = values => [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
const requireValue = (condition, message) => { if (!condition) throw new Error(`RKS_INVALID: ${message}`); };

export function validateClaim(claim) {
  requireValue(claim && nonempty(claim.id) && nonempty(claim.projectId), 'claim identity');
  requireValue(DIMENSIONS.includes(claim.dimension) && nonempty(claim.tag), 'dimension/tag');
  requireValue(SOURCE_TYPES.includes(claim.sourceType) && STATUSES.includes(claim.status), 'source/status');
  requireValue(claim.scope === 'project' && strings(claim.appliesTo) && strings(claim.evidenceRefs), 'scope/evidence');
  requireValue(['fact', 'goal', 'proposal', 'observation'].includes(claim.assertion), 'assertion');
  requireValue(!(claim.status === 'confirmed' && ['analysis_proposal', 'rks_candidate'].includes(claim.sourceType)), 'proposal cannot self-confirm');
  return claim;
}

export function normalizeTag(dimension, value, dictionary) {
  const key = value.normalize('NFKC').trim().toLowerCase().replace(/[\s-]+/gu, '_');
  const terms = dictionary[dimension] || {};
  return Object.entries(terms).find(([tag, aliases]) => [tag, ...aliases].some(alias =>
    alias.normalize('NFKC').trim().toLowerCase().replace(/[\s-]+/gu, '_') === key))?.[0] || null;
}

export function classify({projectId, claims}, dictionary, archetypes) {
  requireValue(nonempty(projectId) && Array.isArray(claims), 'project/claims');
  const ids = new Set();
  const tags = claims.map(raw => {
    validateClaim(raw);
    requireValue(!ids.has(raw.id), 'duplicate claim id'); ids.add(raw.id);
    requireValue(raw.projectId === projectId && raw.appliesTo.includes(projectId), 'PROJECT_MISMATCH');
    const tag = normalizeTag(raw.dimension, raw.tag, dictionary);
    return {...structuredClone(raw), tag: tag || raw.tag, recognized: !!tag,
      status: tag ? raw.status : 'unknown', evidenceRefs: sorted(raw.evidenceRefs), appliesTo: sorted(raw.appliesTo)};
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  // Unknowns/proposals never become a confirmed archetype or manufacture a missing dimension.
  const supported = tags.filter(t => t.recognized && t.status === 'confirmed' &&
    ['source_fact', 'user_confirmed_design_goal'].includes(t.sourceType));
  const matches = archetypes.filter(a => a.required.every(r => supported.some(t => t.dimension === r.dimension && t.tag === r.tag)))
    .map(a => ({id: a.id, evidenceRefs: sorted(supported.filter(t => a.required.some(r => r.dimension === t.dimension && r.tag === t.tag)).flatMap(t => t.evidenceRefs))}));
  return {projectId, tags, missingDimensions: DIMENSIONS.filter(d => !tags.some(t => t.dimension === d && t.status !== 'unknown')),
    archetypes: stable(matches), primaryArchetype: matches.length === 1 ? matches[0].id : null,
    status: matches.length > 1 ? 'conflict' : matches.length ? 'supported' : 'unknown',
    auxiliaryMechanisms: supported.filter(t => t.dimension === 'service_model').map(t => t.tag).sort()};
}

// Inference edges and conflicts are supplied by an offline reviewer, never guessed
// from word co-occurrence. Distinct tags alone do not imply incompatibility.
export function auditConflicts(classification, {inferences = [], incompatibilities = [], applications = [], replacements = []} = {}) {
  const claims = new Map(classification.tags.map(t => [t.id, t]));
  const get = id => { requireValue(claims.has(id), `unknown claim ${id}`); return claims.get(id); };
  const findings = [];
  function add(code, priority, involved, reason, extraRefs = []) {
    findings.push({code, priority, claimIds: sorted(involved.map(t => t.id)),
      evidenceRefs: sorted([...involved.flatMap(t => t.evidenceRefs), ...extraRefs]), reason});
  }
  for (const edge of inferences) {
    const from = get(edge.from), to = get(edge.to);
    const targetGoal = to.sourceType === 'user_confirmed_design_goal' && to.status === 'confirmed';
    if (['service_model', 'business_format'].includes(from.dimension) && to.dimension === 'visual_style' && !targetGoal)
      add('RKS-CF-001', 'P1', [from, to], '经营机制不能独立证明视觉风格。');
    if (['cuisine_product', 'cultural_context'].includes(from.dimension) && ['material', 'visual_style'].includes(to.dimension) && !targetGoal)
      add('RKS-CF-004', 'P1', [from, to], '菜系或文化不能强制推导材料与风格。');
  }
  for (const pair of incompatibilities) {
    const involved = pair.map(get);
    requireValue(involved.length === 2, 'incompatibility pair');
    const goal = involved.find(t => t.sourceType === 'user_confirmed_design_goal' && t.status === 'confirmed');
    const proposal = involved.find(t => ['analysis_proposal', 'rks_candidate'].includes(t.sourceType));
    if (goal && proposal) add('RKS-CF-002', 'P0', involved, '保留双方证据；用户目标优先于冲突提案。');
    else add('RKS-CF-002', 'P2', involved, '权属冲突待审，不自动改写可核实事实或确认目标。');
  }
  for (const claim of claims.values()) {
    if (['location_context', 'customers'].includes(claim.dimension) && claim.assertion === 'fact' && claim.sourceType !== 'source_fact')
      add('RKS-CF-003', 'P1', [claim], '设计目标或推断被当作实际物业/客群事实。');
  }
  for (const application of applications) {
    validateKnowledge(application.knowledge);
    requireValue(application.targetProjectId === classification.projectId, 'application target');
    const knowledge = application.knowledge;
    if (knowledge.scope === 'project' && !knowledge.sourceProjects.includes(application.targetProjectId))
      add('RKS-CF-005', 'P1', [], '项目经验不得跨品牌自动应用。', knowledge.evidenceRefs);
  }
  for (const replacement of replacements) {
    const previous = get(replacement.previous), next = get(replacement.next);
    if (previous.sourceType === 'user_confirmed_design_goal' && previous.status === 'confirmed' &&
      !(next.sourceType === 'user_confirmed_design_goal' && next.status === 'confirmed' && replacement.explicitReview === true))
      add('RKS-CF-006', 'P0', [previous, next], '已确认方向不能被分析建议或旧状态静默替换。');
  }
  return stable(findings);
}

// This validates research records only; no persisted production schema is changed.
export function validateKnowledge(record) {
  requireValue(record && ['industry', 'business_format', 'style', 'project'].includes(record.scope), 'knowledge scope');
  requireValue(['project_observation', 'candidate', 'cross_project_testing', 'validated', 'deprecated'].includes(record.status), 'knowledge status');
  for (const field of ['knowledgeId', 'title', 'judgment', 'uncertainty', 'antiHomogenization', 'beforeAfter']) requireValue(nonempty(record[field]), field);
  for (const field of ['sourceProjects', 'evidenceRefs', 'reviewSources', 'prerequisites', 'exceptions']) requireValue(strings(record[field]), field);
  for (const field of ['applicableTags', 'excludedTags', 'validatedCases', 'failedCases']) requireValue(Array.isArray(record[field]), field);
  if (record.status === 'validated') requireValue(record.validatedCases.length > 0 && record.reviewSources.some(s => s.startsWith('human:')), 'validation requires human evidence');
  return record;
}

export function compareDirections(baseline, proposed) {
  requireValue(baseline.projectId === proposed.projectId, 'PROJECT_MISMATCH');
  requireValue(proposed.status === 'proposed_offline', 'offline proposal only');
  requireValue(JSON.stringify(baseline.controls) === JSON.stringify(proposed.controls), 'comparison controls differ');
  return sorted([...Object.keys(baseline.fields), ...Object.keys(proposed.fields)]).flatMap(field =>
    JSON.stringify(baseline.fields[field]) === JSON.stringify(proposed.fields[field]) ? [] :
      [{field, before: structuredClone(baseline.fields[field] ?? null), after: structuredClone(proposed.fields[field] ?? null)}]);
}
