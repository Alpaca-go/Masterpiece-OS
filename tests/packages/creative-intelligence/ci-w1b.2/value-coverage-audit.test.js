/**
 * CI-W1B.2 Part E + Part F + Part G: Concept Gate audit fixtures.
 *
 * These are CONCEPT-GATE-LEVEL unit fixtures. They do NOT exercise
 * the application state machine (see application-blocked.test.js for
 * that) nor the Web controller (see web-all-blocked.test.js). They
 * directly call `runConceptGates` with hand-built GateContext inputs
 * so the audit conclusions about NeedRole / coverageRequirement /
 * identity-conflict / certification grounding are pinned.
 *
 * No model call. Pure.
 *
 * Spec mapping:
 *   S01 strategic coverage pass          — §25 per-Concept rule
 *   S02 strategic missing block          — §25 per-Concept rule
 *   S03 constraint respected non-block   — §14 / §17
 *   S04 constraint violation block       — §14 / §17
 *   S05 identity conflict behavior       — §19 / Gate 7
 *   S06 supported certification + trace  — §21 / Gate 3
 *   S07 unsupported certification block  — §21 / Gate 3
 *   S08 industry does not invent cert     — §22 / Gate 3
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { runConceptGates } from '@masterpiece/creative-intelligence/concept-intelligence/index.ts';

// ---------------------------------------------------------------------------
// Fixture builders (plain JS objects, structurally compatible with the
// CI semantic types. We do NOT import the CI semantic types here so the
// tests can be loaded by `node --test` without a build step.)
// ---------------------------------------------------------------------------

function makeNeed(input) {
  return {
    statement: 'fixture statement',
    whyItMatters: 'fixture',
    coverageRequirement: 'required',
    evidenceRefs: [],
    conflictRefs: [],
    sourceKinds: [],
    generatedBy: 'deterministic_rule',
    traceVersion: 'need-intelligence-v0.1',
    ...input,
  };
}

function makeFact(input) {
  return {
    schemaVersion: 'project-truth-v0.1',
    projectId: 'p-test',
    field: input.key,
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceType: input.sourceType ?? 'DOCUMENT_CARRIER',
    authority: input.authority ?? 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: input.truthClass ?? 'confirmed',
    isReferenceFact: input.isReferenceFact ?? false,
    ...input,
  };
}

function makeOpportunity(id, title, factIds, needIds) {
  return {
    id,
    projectId: 'p-test',
    title,
    statement: title,
    strategicValue: title,
    cluster: 'system-coherence',
    priority: 1,
    status: 'active',
    insightRefs: [],
    needRefs: needIds,
    factRefs: factIds,
    evidenceRefs: [],
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'opportunity-v0.1',
  };
}

function makeInsight(id, factIds, needIds) {
  return {
    id,
    projectId: 'p-test',
    title: `Insight ${id}`,
    description: `Insight ${id}`,
    opportunityRefs: [],
    needRefs: needIds,
    factRefs: factIds,
    evidenceRefs: [],
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'insight-v0.1',
  };
}

function makeEvidence(id, sourceRef) {
  return {
    id,
    schemaVersion: 'evidence-v0.1',
    projectId: 'p-test',
    sourceType: 'document',
    sourceRef,
    summary: sourceRef,
    factRefs: [],
    confidence: 1.0,
    capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeConcept(id, title, factIds, needIds) {
  return {
    id,
    projectId: 'p-test',
    title,
    thesis: `Thesis for ${title}`,
    problemStatement: `Problem for ${title}`,
    strategicMechanism: `Mechanism for ${title}`,
    rationale: `Rationale for ${title}`,
    opportunityRefs: ['opp-1'],
    insightRefs: ['insight-1'],
    needRefs: needIds,
    factRefs: factIds,
    evidenceRefs: ['evidence-1'],
    strategicPattern: 'identity-preservation',
    strengths: ['strength'],
    risks: ['risk'],
    blockers: [],
    status: 'grounded',
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'concept-intelligence-v0.1',
  };
}

const NO_CONFLICTS = [];

function gateResult(results, code) {
  for (const r of results) {
    for (const issue of r.issues) {
      if (issue.code === code) return { present: true, severity: issue.severity };
    }
  }
  return { present: false, severity: null };
}

function valueCoverageResult(results) {
  const gate = results.find((r) => r.gate === 'value-coverage');
  if (!gate) return { blocked: false, warnings: [] };
  return {
    blocked: gate.status === 'blocked',
    warnings: gate.issues.filter((i) => i.severity === 'warning').map((i) => i.code),
  };
}

// ---------------------------------------------------------------------------
// S01: strategic coverage pass — Concept covers a priority=2 required Need
// ---------------------------------------------------------------------------

test('S01 strategic coverage pass: Concept that references a priority=2 required Need passes Gate 5', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const brandNameFact = makeFact({ id: 'f-bn', key: 'brand.name', value: 'Acme', authority: 'USER_CONFIRMED' });
  const brandRoleFact = makeFact({ id: 'f-br', key: 'brand.role', value: 'platform', authority: 'USER_CONFIRMED' });

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const identityNeed = makeNeed({
    id: 'need:identity:bn:critical',
    type: 'identity',
    status: 'required',
    priority: 3,
    coverageRequirement: 'constraint_only',
    factRefs: ['f-bn', 'f-br'],
  });

  const opportunity = makeOpportunity('opp-1', 'Communicate B2B platform', ['f-bm'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm'], ['need:business:bm:important']);
  const concept = makeConcept('concept-1', 'Communicate platform', ['f-bm'], ['need:business:bm:important']);
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed, identityNeed],
    facts: [businessFact, brandNameFact, brandRoleFact],
    evidence,
    conflicts: NO_CONFLICTS,
    expectedBrandName: 'Acme',
  });
  const miss = gateResult(results, 'MISSING_CRITICAL_NEED_COVERAGE');
  assert.equal(miss.present, false, 'priority=3 constraint_only Need must NOT produce a coverage block');
  assert.equal(valueCoverageResult(results).blocked, false, 'value-coverage gate must be pass');
});

// ---------------------------------------------------------------------------
// S02: strategic missing block — Concept covers NO priority>=2 required Need
// ---------------------------------------------------------------------------

test('S02 strategic missing block: Concept that does not reference any priority>=2 required Need blocks Gate 5', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const audienceFact = makeFact({ id: 'f-au', key: 'audience_primary', value: ['enterprise'] });

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const audienceNeed = makeNeed({
    id: 'need:audience:au:important',
    type: 'audience',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-au'],
  });

  // Concept does NOT reference any required need in its trace.
  const opportunity = makeOpportunity('opp-1', 'Some opportunity', [], []);
  const insight = makeInsight('insight-1', [], []);
  const concept = makeConcept('concept-1', 'Detached concept', ['f-bm'], []);
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed, audienceNeed],
    facts: [businessFact, audienceFact],
    evidence,
    conflicts: NO_CONFLICTS,
  });
  const miss = gateResult(results, 'MISSING_CRITICAL_NEED_COVERAGE');
  assert.equal(miss.present, true, 'MISSING_CRITICAL_NEED_COVERAGE must fire when no required coverage Need is referenced');
  assert.equal(miss.severity, 'block', 'must be a hard block, not a warning');
});

// ---------------------------------------------------------------------------
// S03: constraint respected non-false-block — Concept references a
// priority=3 constraint-only Need via its fact trace but does not theme it.
// No block must fire.
// ---------------------------------------------------------------------------

test('S03 constraint respected non-false-block: priority=3 constraint_only Need does not produce coverage block', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const brandNameFact = makeFact({ id: 'f-bn', key: 'brand.name', value: 'Acme', authority: 'USER_CONFIRMED' });
  const brandRoleFact = makeFact({ id: 'f-br', key: 'brand.role', value: 'platform', authority: 'USER_CONFIRMED' });
  const prohibitedFact = makeFact({
    id: 'f-pd',
    key: 'constraint.prohibited_directions',
    value: ['avante-garde fashion photography'],
  });

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const identityNeed = makeNeed({
    id: 'need:identity:bn:critical',
    type: 'identity',
    status: 'required',
    priority: 3,
    coverageRequirement: 'constraint_only',
    factRefs: ['f-bn', 'f-br'],
  });
  const constraintNeed = makeNeed({
    id: 'need:constraint:pd:critical',
    type: 'constraint',
    status: 'required',
    priority: 3,
    coverageRequirement: 'constraint_only',
    factRefs: ['f-pd'],
  });

  // Concept references the business Need (priority=2 required).
  // Does not mention any prohibited direction.
  const opportunity = makeOpportunity('opp-1', 'Communicate B2B', ['f-bm'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm'], ['need:business:bm:important']);
  const concept = makeConcept('concept-1', 'B2B platform communication', ['f-bm'], ['need:business:bm:important']);
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed, identityNeed, constraintNeed],
    facts: [businessFact, brandNameFact, brandRoleFact, prohibitedFact],
    evidence,
    conflicts: NO_CONFLICTS,
    expectedBrandName: 'Acme',
  });
  const miss = gateResult(results, 'MISSING_CRITICAL_NEED_COVERAGE');
  assert.equal(miss.present, false, 'constraint_only priority=3 Need must NOT trigger MISSING_CRITICAL_NEED_COVERAGE');
  assert.equal(valueCoverageResult(results).blocked, false, 'value-coverage gate must NOT be blocked by a constraint-only Need');
});

// ---------------------------------------------------------------------------
// S04: constraint violation — Concept that uses a reference brand name as
// current identity is hard-blocked by the brand-identity gate
// (REFERENCE_BRAND_AS_CURRENT). Value-coverage gate must NOT be the
// cause. This proves constraint-only Needs are not silently
// downgraded to coverage targets.
// ---------------------------------------------------------------------------

test('S04 constraint violation: Concept that substitutes a reference brand is hard-blocked by the brand-identity gate', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const brandNameFact = makeFact({ id: 'f-bn', key: 'brand.name', value: 'Acme', authority: 'USER_CONFIRMED' });
  const brandRoleFact = makeFact({ id: 'f-br', key: 'brand.role', value: 'platform', authority: 'USER_CONFIRMED' });
  // A reference-only fact carrying a different brand name (e.g. a
  // 集团 / 控股 suffix). The current project's brand.name is "Acme"
  // (USER_CONFIRMED); the reference is "OtherCorp集团".
  const referenceBrandFact = makeFact({
    id: 'f-refbn',
    key: 'brand.name',
    value: 'OtherCorp集团',
    authority: 'USER_CONFIRMED',
    isReferenceFact: true,
  });

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const identityNeed = makeNeed({
    id: 'need:identity:bn:critical',
    type: 'identity',
    status: 'required',
    priority: 3,
    coverageRequirement: 'constraint_only',
    factRefs: ['f-bn', 'f-br'],
  });

  const opportunity = makeOpportunity('opp-1', 'Communicate B2B', ['f-bm'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm'], ['need:business:bm:important']);
  // Concept uses the reference brand name in its text — the
  // brand-identity gate must hard-block via REFERENCE_BRAND_AS_CURRENT.
  const concept = {
    ...makeConcept('concept-1', 'OtherCorp集团 Acme platform', ['f-bm'], ['need:business:bm:important']),
    title: 'OtherCorp集团 全新定位 Acme 平台',
    thesis: '以 OtherCorp集团 品牌语境，重塑 Acme 平台调性',
  };
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed, identityNeed],
    facts: [businessFact, brandNameFact, brandRoleFact, referenceBrandFact],
    evidence,
    conflicts: NO_CONFLICTS,
    expectedBrandName: 'Acme',
  });
  // The brand-identity gate (not value-coverage) must fire.
  const brandGate = results.find((r) => r.gate === 'brand-identity');
  assert.ok(brandGate, 'brand-identity gate must run');
  assert.equal(brandGate.status, 'blocked', 'reference-brand-as-current must be a hard block, not a warning');
  const refIssue = gateResult(results, 'REFERENCE_BRAND_AS_CURRENT');
  assert.equal(refIssue.present, true, 'REFERENCE_BRAND_AS_CURRENT must be present');
  assert.equal(refIssue.severity, 'block', 'REFERENCE_BRAND_AS_CURRENT must be a hard block');
  // And the value-coverage gate must NOT be the cause of the block.
  assert.equal(valueCoverageResult(results).blocked, false, 'value-coverage must not be the cause of the brand-substitution block');
});

// ---------------------------------------------------------------------------
// S05: identity conflict — Concept that depends on a fact involved in a
// critical identity conflict must be blocked by the unknown-conflict gate
// (Gate 7). Value-coverage gate must not be involved.
// ---------------------------------------------------------------------------

test('S05 identity conflict: Concept depending on a fact in a critical identity conflict is blocked by Gate 7', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const brandNameFact = makeFact({ id: 'f-bn', key: 'brand.name', value: 'Acme', authority: 'USER_CONFIRMED' });

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const identityNeed = makeNeed({
    id: 'need:identity:bn:critical',
    type: 'identity',
    status: 'required',
    priority: 3,
    coverageRequirement: 'constraint_only',
    factRefs: ['f-bn'],
  });

  const opportunity = makeOpportunity('opp-1', 'Communicate B2B', ['f-bm'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm'], ['need:business:bm:important']);
  const concept = makeConcept('concept-1', 'Acme platform', ['f-bm', 'f-bn'], ['need:business:bm:important']);
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  // Critical identity conflict on brand.name — the Concept depends on
  // that fact, so Gate 7 must fire.
  const conflicts = [
    {
      id: 'conflict:identity_mismatch:f-bn',
      schemaVersion: 'project-truth-v0.1',
      projectId: 'p-test',
      key: 'brand.name',
      type: 'identity_mismatch',
      factIds: ['f-bn'],
      status: 'open',
      summary: 'brand.name has two distinct values',
      detectedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed, identityNeed],
    facts: [businessFact, brandNameFact],
    evidence,
    conflicts,
    expectedBrandName: 'Acme',
  });
  const conflictIssue = gateResult(results, 'CRITICAL_CONFLICT_DEPENDENCY');
  assert.equal(conflictIssue.present, true, 'CRITICAL_CONFLICT_DEPENDENCY must fire on critical identity conflict');
  assert.equal(conflictIssue.severity, 'block', 'must be a hard block, not a warning');
  // The block must come from the unknown-conflict gate, not the
  // value-coverage gate.
  const unknownConflictGate = results.find((r) => r.gate === 'unknown-conflict');
  assert.ok(unknownConflictGate && unknownConflictGate.status === 'blocked', 'unknown-conflict gate must be blocked');
  assert.equal(valueCoverageResult(results).blocked, false, 'value-coverage must NOT be the cause of the conflict block');
});

// ---------------------------------------------------------------------------
// S06: supported certification with valid trace — Concept that mentions an
// official certification that IS in the project truth must NOT be blocked.
// ---------------------------------------------------------------------------

test('S06 supported certification: Concept mentioning a certification that exists in truth passes Gate 3', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const isoFact = makeFact({
    id: 'f-iso',
    key: 'asset_authorization_certification',
    value: 'ISO 9001',
    authority: 'USER_CONFIRMED',
  });
  const isoEvidence = makeEvidence('evidence-iso', 'cert.pdf');

  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });

  const opportunity = makeOpportunity('opp-1', 'Communicate certified B2B', ['f-bm', 'f-iso'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm', 'f-iso'], ['need:business:bm:important']);
  // Concept that explicitly references the ISO certification as a
  // grounded asset authorization claim — supported by truth.
  const concept = {
    ...makeConcept('concept-1', 'B2B platform with ISO 9001 backing', ['f-bm', 'f-iso'], ['need:business:bm:important']),
    thesis: '通过 ISO 9001 认证背书，传递平台的工程严谨性',
  };
  const evidence = [makeEvidence('evidence-1', 'doc-1'), isoEvidence];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed],
    facts: [businessFact, isoFact],
    evidence,
    conflicts: NO_CONFLICTS,
  });
  const certIssue = gateResult(results, 'OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(certIssue.present, false, 'supported certification with valid factRef must NOT trigger OFFICIAL_CERTIFICATION_CLAIM');
});

// ---------------------------------------------------------------------------
// S07: unsupported certification — Concept that mentions a certification
// NOT present in truth is hard-blocked by Gate 3.
// ---------------------------------------------------------------------------

test('S07 unsupported certification: Concept that fabricates a certification is hard-blocked by Gate 3', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' });
  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const opportunity = makeOpportunity('opp-1', 'Communicate B2B', ['f-bm'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm'], ['need:business:bm:important']);
  // Concept that fabricates an FDA certification not present in truth.
  const concept = {
    ...makeConcept('concept-1', 'B2B platform with FDA backing', ['f-bm'], ['need:business:bm:important']),
    thesis: '通过 FDA 认证背书，传递平台的合规严谨性',
  };
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed],
    facts: [businessFact], // no FDA fact
    evidence,
    conflicts: NO_CONFLICTS,
  });
  const certIssue = gateResult(results, 'OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(certIssue.present, true, 'unsupported certification must trigger OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(certIssue.severity, 'block', 'unsupported certification must be a hard block, not a warning');
});

// ---------------------------------------------------------------------------
// S08: industry does not invent certification — Concept that mentions a
// certification ONLY by industry context (e.g. medical) and not in truth
// is hard-blocked. Generator must NOT auto-emit certifications based on
// industry alone.
// ---------------------------------------------------------------------------

test('S08 industry does not invent certification: medical industry alone does not justify NMPA / FDA claims', () => {
  const businessFact = makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B medical' });
  const industryFact = makeFact({
    id: 'f-ind',
    key: 'business_industry',
    value: 'medical',
  });
  const businessNeed = makeNeed({
    id: 'need:business:bm:important',
    type: 'business',
    status: 'important',
    priority: 2,
    coverageRequirement: 'required',
    factRefs: ['f-bm'],
  });
  const opportunity = makeOpportunity('opp-1', 'Medical platform B2B', ['f-bm', 'f-ind'], ['need:business:bm:important']);
  const insight = makeInsight('insight-1', ['f-bm', 'f-ind'], ['need:business:bm:important']);
  // Concept that wraps medical industry with NMPA / GMP, neither of
  // which is supported by truth.
  const concept = {
    ...makeConcept('concept-1', 'Medical B2B platform with NMPA / GMP compliance', ['f-bm', 'f-ind'], ['need:business:bm:important']),
    thesis: '通过 NMPA 注册 与 GMP 合规，建立医疗级可信度',
  };
  const evidence = [makeEvidence('evidence-1', 'doc-1')];

  const results = runConceptGates(concept, {
    opportunities: [opportunity],
    insights: [insight],
    needs: [businessNeed],
    facts: [businessFact, industryFact], // industry alone
    evidence,
    conflicts: NO_CONFLICTS,
  });
  const certIssue = gateResult(results, 'OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(certIssue.present, true, 'industry-only certification must be hard-blocked');
  assert.equal(certIssue.severity, 'block', 'industry-only certification must be a hard block, not a warning');
});
