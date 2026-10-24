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

// Pure offline orchestration. No production adapter, store, transport or model.

const authoritative = new Set(['source_fact', 'user_confirmed_design_goal']);
const draftFields = new Set(['spatialConcept', 'structureLanguage', 'functionalProgram', 'functionalNetwork',
  'functionalRelationships', 'visibleRequirements', 'compositionRequirements', 'lightingLanguage', 'materialLanguage']);
const copy = value => structuredClone(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const requireShadowValue = (condition, message) => {if (!condition) throw new Error(`RKS_SHADOW_INVALID: ${message}`);};
const unique = values => [...new Set(values)].sort();
const pathText = path => path.map((part,index) => Number.isInteger(part) ? `[${part}]` : `${index ? '.' : ''}${part}`).join('');
function at(data, path) {
  requireShadowValue(Array.isArray(path) && path.length > 0 && path.every(part =>
    Number.isInteger(part) && part >= 0 || text(part) && !['__proto__','prototype','constructor'].includes(part)), 'safe source path');
  return path.reduce((value, part) => value && Object.hasOwn(value, part) ? value[part] : undefined, data);
}
function documentsFor(projectId, documents) {
  requireShadowValue(text(projectId) && Array.isArray(documents), 'project/documents');
  const registry = new Map();
  for (const document of documents) {
    requireShadowValue(text(document.id) && !registry.has(document.id), 'document identity');
    requireShadowValue(document.projectId === projectId, 'DOCUMENT_PROJECT_MISMATCH');
    requireShadowValue(text(document.evidenceRef) && document.data && typeof document.data === 'object', 'document evidence/data');
    requireShadowValue(['source_fact','user_confirmed_design_goal','historical_human_acceptance','rks_candidate'].includes(document.sourceType), 'document source type');
    registry.set(document.id, document);
  }
  return registry;
}
function bound(registry, binding) {
  const document = registry.get(binding.documentId);
  requireShadowValue(document, 'unknown document');
  const value = at(document.data,binding.path);
  return {document, value, sourcePath:`documents.${document.id}.${pathText(binding.path)}`,
    evidenceRefs:[`${document.evidenceRef}#${pathText(binding.path)}`]};
}
const verified = document => document.sourceType === 'source_fact' ? document.verification === 'verified_source'
  : document.sourceType === 'user_confirmed_design_goal' && document.verification === 'confirmed_by_user';
function claim(projectId, binding, source) {
  requireShadowValue(text(binding.id) && DIMENSIONS.includes(binding.dimension), 'binding id/dimension');
  return {id:binding.id,projectId,dimension:binding.dimension,tag:source.value,rawValue:source.value,
    sourceType:source.document.sourceType,status:verified(source.document) ? 'confirmed' : 'unknown',
    assertion:source.document.sourceType === 'source_fact' ? 'fact' : 'goal',scope:'project',appliesTo:[projectId],
    evidenceRefs:source.evidenceRefs,sourcePath:source.sourcePath};
}
function dictionaryFor(resources) {
  const dictionary = copy(resources.dictionary);
  for (const [dimension, terms] of Object.entries(resources.tagExtensions || {})) {
    requireShadowValue(DIMENSIONS.includes(dimension), 'extension dimension');
    dictionary[dimension] ||= {};
    for (const [tag,aliases] of Object.entries(terms)) {
      requireShadowValue(!Object.hasOwn(dictionary[dimension],tag) && Array.isArray(aliases) && aliases.every(text), 'extension cannot replace existing tags');
      dictionary[dimension][tag] = copy(aliases);
    }
  }
  return dictionary;
}

// This function receives no Packet. Only intake/goal bindings can grant an
// initial classification, regardless of later analysis or historical knowledge.
export function buildRestaurantBoundary({projectId, documents, initialBindings = []}, resources) {
  const registry = documentsFor(projectId,documents);
  const claims = [], unknowns = [], bindingIds = new Set();
  for (const binding of initialBindings) {
    requireShadowValue(text(binding.id) && DIMENSIONS.includes(binding.dimension) && !bindingIds.has(binding.id), 'binding id/dimension/duplicate');
    bindingIds.add(binding.id);
    const source = bound(registry,binding);
    requireShadowValue(authoritative.has(source.document.sourceType), 'PRE_ANALYSIS_SOURCE_FORBIDDEN');
    if (!text(source.value)) {unknowns.push({id:binding.id,sourcePath:source.sourcePath,status:'unknown',reason:'missing_or_non_scalar_tag'}); continue;}
    claims.push(claim(projectId,binding,source));
  }
  const classification = classify({projectId,claims},dictionaryFor(resources),resources.archetypes);
  for (const tag of classification.tags) if (!tag.recognized || tag.status === 'unknown') unknowns.push({id:tag.id,sourcePath:tag.sourcePath,
    status:'review_required',reason:tag.recognized ? 'source_verification_missing' : 'no_exact_tag_alias',rawValue:tag.rawValue});
  return {contractVersion:'1.0',projectId,stage:'pre_analysis',classification,unknowns,
    authority:'Only caller-attested original sources and user-confirmed goals; references are not external authentication',
    missingFacts:['customers','location_context'].filter(dimension=>!classification.tags.some(tag=>tag.dimension===dimension && tag.sourceType==='source_fact' && tag.status==='confirmed'))};
}

export function runRestaurantShadowPipeline(input, resources) {
  const {projectId, documents, initialBindings = []} = input;
  const boundary = buildRestaurantBoundary({projectId,documents,initialBindings},resources);
  const dictionary = dictionaryFor(resources);
  const registry = documentsFor(projectId,documents);
  const packet = input.packet;
  requireShadowValue(!packet || packet.projectId === projectId, 'PACKET_PROJECT_MISMATCH');
  requireShadowValue(!packet || text(input.packetEvidenceRef), 'Packet evidence reference');
  const proposals = [], unknowns = [...boundary.unknowns];
  const annotationIds = new Set(initialBindings.map(binding=>binding.id));
  for (const binding of input.analysisBindings || []) {
    requireShadowValue(text(binding.id) && DIMENSIONS.includes(binding.dimension) && !annotationIds.has(binding.id), 'analysis binding identity/dimension');
    annotationIds.add(binding.id);
    const value = at(packet || {},binding.path);
    const sourcePath = `packet.${pathText(binding.path)}`;
    if (!text(value)) {unknowns.push({id:binding.id,sourcePath,status:'unknown',reason:'missing_packet_field'}); continue;}
    let tag = normalizeTag(binding.dimension,value,dictionary);
    let normalization = 'exact_dictionary_alias';
    const evidenceRefs = [`${input.packetEvidenceRef || 'provided_packet'}#${pathText(binding.path)}`];
    if (!tag && binding.reviewedMapping) {
      const mapping = binding.reviewedMapping;
      requireShadowValue(mapping.projectId === projectId && mapping.status === 'reviewed_offline' && text(mapping.evidenceRef), 'mapping review/ownership');
      if (mapping.expectedValue === value) {
        tag = normalizeTag(binding.dimension,mapping.tag,dictionary);
        normalization = 'explicit_reviewed_exact_value_mapping';
        evidenceRefs.push(mapping.evidenceRef);
      }
    }
    if (!tag) {unknowns.push({id:binding.id,sourcePath,status:'review_required',reason:'unmapped_natural_language',rawValue:value}); continue;}
    proposals.push({id:binding.id,projectId,dimension:binding.dimension,tag,rawValue:value,normalization,
      sourceType:'analysis_proposal',status:'probable',assertion:'proposal',scope:'project',appliesTo:[projectId],evidenceRefs,sourcePath});
  }
  const classification = classify({projectId,claims:[...boundary.classification.tags,...proposals]},dictionary,resources.archetypes);
  const automaticPairs = [], matches = [];
  for (const rule of resources.conflictPairs || []) {
    requireShadowValue(text(rule.id) && rule.goal && rule.proposal, 'conflict pair rule');
    const goals = boundary.classification.tags.filter(tag=>tag.status==='confirmed' && tag.sourceType==='user_confirmed_design_goal' && tag.dimension===rule.goal.dimension && tag.tag===rule.goal.tag);
    const analysis = proposals.filter(tag=>tag.dimension===rule.proposal.dimension && tag.tag===rule.proposal.tag);
    for (const goal of goals) for (const proposal of analysis) {
      automaticPairs.push([goal.id,proposal.id]);
      matches.push({ruleId:rule.id,claimIds:[goal.id,proposal.id],status:'review_required',meaning:'Proposed positioning shift requires human review; not an inferred universal style incompatibility'});
    }
  }
  const audit = input.audit || {};
  const conflicts = auditConflicts(classification,{...audit,incompatibilities:[...automaticPairs,...audit.incompatibilities || []]});
  const alignments = [];
  for (const goal of boundary.classification.tags.filter(tag=>tag.status==='confirmed')) for (const proposal of proposals) {
    if (goal.dimension===proposal.dimension && goal.tag===proposal.tag) alignments.push({claimIds:[goal.id,proposal.id],status:'consistent_with_bound_goal',
      evidenceRefs:unique([...goal.evidenceRefs,...proposal.evidenceRefs]),limitation:'Matching annotation only; proposal is not promoted to fact'});
    for (const rule of resources.compatiblePairs || []) if (goal.dimension===rule.goal.dimension && goal.tag===rule.goal.tag && proposal.dimension===rule.proposal.dimension && proposal.tag===rule.proposal.tag)
      alignments.push({ruleId:rule.id,claimIds:[goal.id,proposal.id],status:'compatible_within_rule_scope',
        evidenceRefs:unique([...goal.evidenceRefs,...proposal.evidenceRefs]),limitation:rule.limitation});
  }
  const supported = new Set(boundary.classification.tags.filter(tag=>tag.recognized && tag.status==='confirmed').map(tag=>tag.tag));
  const knowledgeAudit = [], candidates = new Map();
  for (const record of resources.knowledge || []) {
    validateKnowledge(record);
    requireShadowValue(!candidates.has(record.knowledgeId) && !knowledgeAudit.some(item=>item.knowledgeId===record.knowledgeId), 'duplicate knowledge id');
    let reason = null;
    if (!['candidate','project_observation'].includes(record.status)) reason='knowledge_lifecycle_not_candidate';
    else if (record.scope==='project' && !record.sourceProjects.includes(projectId)) reason='project_scope_mismatch';
    else if (record.excludedTags.some(tag=>supported.has(tag))) reason='excluded_tag';
    else if (record.applicableTags.some(tag=>!supported.has(tag))) reason='applicable_tags_not_supported';
    else if (!record.sourceProjects.includes(projectId)) reason='cross_project_candidate_requires_review';
    knowledgeAudit.push({knowledgeId:record.knowledgeId,scope:record.scope,status:reason ? 'withheld' : 'eligible_for_review',reason,
      lifecycle:record.status,prerequisitesState:'review_required',automaticallyApplied:false});
    if (!reason) candidates.set(record.knowledgeId,record);
  }
  const fields = {}, fieldSources = {}, choices = new Map();
  const recordChoice = (binding, source) => {
    requireShadowValue(draftFields.has(binding.field), 'unsupported draft field');
    const value = typeof source.value === 'string' ? source.value.trim() : Array.isArray(source.value) && source.value.every(text) ? source.value.join('\n') : null;
    if (!value) {unknowns.push({field:binding.field,sourcePath:source.sourcePath,status:'unknown',reason:'structured_direction_value_missing'});return;}
    const list = choices.get(binding.field) || [];
    list.push({value,sourcePath:source.sourcePath,evidenceRefs:source.evidenceRefs,sourceType:source.document.sourceType});
    choices.set(binding.field,list);
  };
  for (const binding of input.directionBindings || []) {
    const source = bound(registry,binding);
    requireShadowValue(source.document.sourceType==='user_confirmed_design_goal', 'DIRECTION_GOAL_SOURCE_REQUIRED');
    if (!verified(source.document)) {unknowns.push({field:binding.field,status:'review_required',reason:'goal_not_confirmed'});continue;}
    recordChoice(binding,source);
  }
  for (const [field,list] of choices) {
    if (new Set(list.map(item=>item.value)).size > 1) unknowns.push({field,status:'review_required',reason:'conflicting_confirmed_goal_values',choices:copy(list)});
    else {fields[field]=list[0].value;fieldSources[field]=copy(list);}
  }
  const candidateSuggestions = [];
  for (const binding of input.knowledgeBindings || []) {
    const knowledge = candidates.get(binding.knowledgeId);
    if (!knowledge) continue;
    const source = bound(registry,binding);
    requireShadowValue(['historical_human_acceptance','rks_candidate'].includes(source.document.sourceType), 'CANDIDATE_SOURCE_REQUIRED');
    requireShadowValue(Array.isArray(source.document.knowledgeIds) && source.document.knowledgeIds.includes(knowledge.knowledgeId), 'knowledge evidence binding');
    requireShadowValue(draftFields.has(binding.field), 'unsupported candidate field');
    const value = text(source.value) ? source.value : Array.isArray(source.value) && source.value.length && source.value.every(text) ? source.value.join('\n') : null;
    if (!value) {unknowns.push({field:binding.field,status:'unknown',reason:'candidate_value_missing'});continue;}
    candidateSuggestions.push({field:binding.field,value,knowledgeId:knowledge.knowledgeId,lifecycle:knowledge.status,
      sourceType:source.document.sourceType,sourcePath:source.sourcePath,evidenceRefs:unique([...source.evidenceRefs,...knowledge.evidenceRefs]),
      scope:knowledge.scope,requiresHumanReview:true,automaticallyApplied:false,prerequisites:copy(knowledge.prerequisites),exceptions:copy(knowledge.exceptions)});
  }
  const suggestions = conflicts.map(finding=>({action:'retain_confirmed_goal_and_review_proposal',code:finding.code,
    claimIds:copy(finding.claimIds),evidenceRefs:copy(finding.evidenceRefs),requiresHumanReview:true}));
  return {contractVersion:'1.0',projectId,status:'shadow_offline_only',boundary,
    postAnalysis:{classification,proposals,conflicts,ruleMatches:matches,alignments,
      inspectedPaths:(input.analysisBindings || []).map(binding=>`packet.${pathText(binding.path)}`),
      coverage:'Only bound fields reviewed; all unbound Packet prose is outside semantic audit'},
    knowledgeAudit,candidateSuggestions,suggestions,unknowns,
    b1Draft:{projectId,status:'proposed_offline',sourceType:'rks_shadow_suggestion',fields,fieldSources,
      analysisFingerprint:text(input.analysisFingerprint) ? input.analysisFingerprint : null,fingerprintAuthority:'caller_supplied_not_authenticated',
      requiresExplicitUserConfirmation:true,replacesExistingDirection:false,analysisPacketModified:false,
      candidateSuggestions:copy(candidateSuggestions),unknownFacts:copy(boundary.missingFacts)},
    safeguards:{productionEnabled:false,modelCalls:0,projectWrites:0,knowledgePromoted:false,
      styleOrMaterialInferredFromCuisinePriceLocation:false,image1RunAssociation:'undetermined'}};
}
