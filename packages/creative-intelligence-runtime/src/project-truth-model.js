import { CreativeIntelligenceValidationError, TRUTH_SECTIONS } from './contracts.js';
import { buildEvidenceLedger, stableFingerprint } from './evidence-ledger.js';

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function asClaim(entry) {
  return {
    content: entry.content,
    evidenceRefs: [entry.id],
    confidence: entry.confidence,
    status: entry.status,
    subjectPath: entry.subjectPath
  };
}

function targetSection(entry) {
  if (entry.evidenceType === 'source_conflict') return 'conflicts';
  if (entry.evidenceType === 'system_assumption') {
    return entry.subjectPath.startsWith('openQuestions.') ? 'openQuestions' : 'assumptions';
  }
  if (entry.evidenceType === 'system_recommendation') return null;
  if (entry.evidenceType === 'user_intent') return entry.status === 'confirmed' ? 'confirmedUserIntent' : 'openQuestions';
  const section = entry.subjectPath.split('.')[0];
  return TRUTH_SECTIONS.includes(section) ? section : null;
}

function createConflictCandidates(ledger) {
  const scalarClaims = new Map();
  for (const entry of ledger.evidence) {
    if (entry.claimMode !== 'one' || !['document_fact', 'user_intent'].includes(entry.evidenceType)) continue;
    if (!['confirmed', 'unconfirmed'].includes(entry.status)) continue;
    const list = scalarClaims.get(entry.subjectPath) || [];
    list.push(entry);
    scalarClaims.set(entry.subjectPath, list);
  }
  const conflicts = [];
  for (const [subjectPath, claims] of scalarClaims) {
    const distinct = new Map(claims.map((claim) => [claim.content.toLocaleLowerCase('en-US'), claim]));
    if (distinct.size < 2) continue;
    const values = [...distinct.values()];
    conflicts.push({
      evidenceType: 'source_conflict',
      subjectPath,
      claimMode: 'one',
      content: values.map((item) => item.content).join(' <> '),
      confidence: Math.max(...values.map((item) => item.confidence)),
      status: 'conflicted',
      sources: values.flatMap((item) => item.sources)
    });
  }
  return conflicts;
}

export function validateProjectTruthModel(model) {
  const issues = [];
  if (!model || typeof model !== 'object') return ['truth model must be an object'];
  if (model.schemaVersion !== '2.0') issues.push('schemaVersion must be 2.0');
  if (!model.projectId) issues.push('projectId is required');
  for (const section of TRUTH_SECTIONS) {
    if (!Array.isArray(model[section])) issues.push(`${section} must be an array`);
  }
  const assumptionRefs = new Set((model.assumptions || []).flatMap((claim) => claim.evidenceRefs || []));
  for (const section of ['brandFacts', 'productFacts', 'audienceFacts', 'businessGoals']) {
    for (const claim of model[section] || []) {
      if ((claim.evidenceRefs || []).some((ref) => assumptionRefs.has(ref))) {
        issues.push(`assumption was promoted into ${section}`);
      }
    }
  }
  return issues;
}

export function buildProjectTruthModel(ledger, { generatedAt = ledger?.generatedAt || new Date().toISOString() } = {}) {
  const ledgerIssues = ledger ? [] : ['ledger is required'];
  if (ledgerIssues.length) throw new CreativeIntelligenceValidationError('EVIDENCE_LEDGER_REQUIRED', ledgerIssues[0], ledgerIssues);
  const conflictCandidates = createConflictCandidates(ledger);
  const effectiveLedger = conflictCandidates.length
    ? buildEvidenceLedger({ projectId: ledger.projectId, generatedAt: ledger.generatedAt, candidates: [...ledger.evidence, ...conflictCandidates] })
    : ledger;
  const model = {
    schemaVersion: '2.0',
    projectId: effectiveLedger.projectId,
    generatedAt,
    evidenceLedgerFingerprint: effectiveLedger.sourceFingerprint,
    brandFacts: [],
    productFacts: [],
    audienceFacts: [],
    businessGoals: [],
    confirmedUserIntent: [],
    observedVisualAssets: [],
    currentVisualPatterns: [],
    constraints: [],
    conflicts: [],
    assumptions: [],
    openQuestions: [],
    confidence: { overall: 0, bySection: {} }
  };
  for (const entry of effectiveLedger.evidence) {
    const section = targetSection(entry);
    if (section) model[section].push(asClaim(entry));
  }
  for (const section of TRUTH_SECTIONS) {
    model[section].sort((left, right) => left.subjectPath.localeCompare(right.subjectPath) || left.content.localeCompare(right.content));
    model.confidence.bySection[section] = Number(average(model[section].map((claim) => claim.confidence)).toFixed(3));
  }
  const truthSections = ['brandFacts', 'productFacts', 'audienceFacts', 'businessGoals', 'confirmedUserIntent'];
  model.confidence.overall = Number(average(truthSections.map((section) => model.confidence.bySection[section]).filter(Boolean)).toFixed(3));
  model.truthFingerprint = stableFingerprint(TRUTH_SECTIONS.map((section) => [section, model[section]]));
  const issues = validateProjectTruthModel(model);
  if (issues.length) {
    throw new CreativeIntelligenceValidationError('PROJECT_TRUTH_MODEL_INVALID', `Project Truth Model is invalid: ${issues.join('; ')}`, issues);
  }
  return { ledger: effectiveLedger, truthModel: model };
}
