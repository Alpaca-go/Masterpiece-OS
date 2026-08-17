/**
 * CI-W1B.2 Part J: Generic real-project-derived regression fixtures.
 *
 * These are PROJECT-AGNOSTIC structural fixtures modeled on the shape
 * of real CI-W1A / CI-W1B runs. They are intentionally NOT named
 * after any specific brand. Each fixture is a `NeedItem` + `Concept`
 * combination that the audit (PART E/F/G) concluded should either
 * pass or block; the test pins the outcome so a future refactor that
 * regresses the gate semantics fails fast.
 *
 * The full real-project end-to-end retest ("九州美学" / "一剂良方")
 * is the user-authorized retest from PART J; it is NOT a unit
 * fixture. See `docs/creative-intelligence/ci-w1b.2/all-blocked-recovery-and-concept-gate-semantics-audit.md`
 * for the retest report.
 *
 * Spec mapping:
 *   J01 generic B2B brand → at least 1 valid Direction
 *   J02 generic B2C brand → at least 1 valid Direction
 *   J03 all-blocked fixture → direction_blocked, NOT awaiting_direction_selection
 *   J04 certification-only true (no fabrication) → passes
 *   J05 certification hallucination → blocked
 *   J06 constraint-only + no false coverage block
 *   J07 supported fact + valid trace → no false block
 *   J08 critical identity conflict → upstream Gate 7 block
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { runConceptGates } from '@masterpiece/creative-intelligence/concept-intelligence/index.ts';

// Shared fixture builders (kept in-file so this file is self-contained).
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
    projectId: 'p-gen',
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
    projectId: 'p-gen',
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
    projectId: 'p-gen',
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
    projectId: 'p-gen',
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
    projectId: 'p-gen',
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

function findIssue(results, code) {
  for (const r of results) {
    for (const issue of r.issues) {
      if (issue.code === code) return { present: true, severity: issue.severity };
    }
  }
  return { present: false, severity: null };
}

// ---------------------------------------------------------------------------
// J01 / J02: generic B2B / B2C brand Concepts pass Gate 5
// ---------------------------------------------------------------------------

test('J01 generic B2B brand: concept that references business Need passes Gate 5', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' }),
    makeFact({ id: 'f-bn', key: 'brand.name', value: 'GenericB2B', authority: 'USER_CONFIRMED' }),
    makeFact({ id: 'f-br', key: 'brand.role', value: 'platform', authority: 'USER_CONFIRMED' }),
    makeFact({ id: 'f-au', key: 'audience.primary', value: ['enterprise'] }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
    makeNeed({ id: 'n:identity:bn', type: 'identity', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-bn', 'f-br'] }),
    makeNeed({ id: 'n:audience:au', type: 'audience', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-au'] }),
  ];
  const opp = makeOpportunity('opp-1', 'B2B platform', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const ins = makeInsight('insight-1', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const concept = makeConcept('c-1', 'Communicate B2B platform', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts: [],
  });
  assert.equal(findIssue(results, 'MISSING_CRITICAL_NEED_COVERAGE').present, false);
});

test('J02 generic B2C brand: concept that references audience Need passes Gate 5', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'D2C retail' }),
    makeFact({ id: 'f-bn', key: 'brand.name', value: 'GenericB2C', authority: 'USER_CONFIRMED' }),
    makeFact({ id: 'f-au', key: 'audience.primary', value: ['young adults'] }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
    makeNeed({ id: 'n:identity:bn', type: 'identity', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-bn'] }),
    makeNeed({ id: 'n:audience:au', type: 'audience', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-au'] }),
  ];
  const opp = makeOpportunity('opp-1', 'D2C retail', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const ins = makeInsight('insight-1', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const concept = makeConcept('c-1', 'D2C brand for young adults', ['f-bm', 'f-au'], ['n:business:bm', 'n:audience:au']);
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts: [],
  });
  assert.equal(findIssue(results, 'MISSING_CRITICAL_NEED_COVERAGE').present, false);
});

// ---------------------------------------------------------------------------
// J03: all-blocked fixture — Generic concept set where every concept is
// gate-blocked produces a non-empty blocker list. The application layer
// test (A01-A08) covers the application state; this fixture is the
// pure gate-level mirror that pin the gate outputs that drive
// blockerSummaries.
// ---------------------------------------------------------------------------

test('J03 generic all-blocked fixture: every Concept gate-blocked → non-empty blocker summary', () => {
  // Three needs: one business (required, priority=2), one identity
  // (constraint_only, priority=3), and an upstream-block conflict
  // surface. The opportunity links ONLY to the identity need (so the
  // business need is not in the transitive trace). The Concept also
  // fabricates an FDA certification in its text → both Gate 5
  // (no required coverage) and Gate 3 (unsupported certification)
  // must fire.
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'X' }),
    makeFact({ id: 'f-bn', key: 'brand.name', value: 'Y', authority: 'USER_CONFIRMED' }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
    makeNeed({ id: 'n:identity:bn', type: 'identity', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-bn'] }),
  ];
  // Opportunity links to identity only (NOT business).
  const opp = makeOpportunity('opp-1', 'Identity-driven opportunity', ['f-bn'], ['n:identity:bn']);
  const ins = makeInsight('insight-1', ['f-bn'], ['n:identity:bn']);
  // Concept that goes through the identity opportunity but not the
  // business need, AND fabricates an FDA certification.
  const concept = {
    ...makeConcept('c-1', 'Generic identity concept', ['f-bn'], ['n:identity:bn']),
    thesis: '通过 FDA 认证背书，传递平台的合规严谨性',
  };
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts: [],
  });
  const codes = new Set();
  for (const r of results) for (const i of r.issues) codes.add(i.code);
  // Must include BOTH blockers so the projection can surface them.
  assert.ok(codes.has('MISSING_CRITICAL_NEED_COVERAGE'), 'value-coverage must fire (business Need not in trace)');
  assert.ok(codes.has('OFFICIAL_CERTIFICATION_CLAIM'), 'asset-authorization must fire (fabricated FDA)');
});

// ---------------------------------------------------------------------------
// J04: certification-only truth (no fabrication) passes Gate 3
// ---------------------------------------------------------------------------

test('J04 supported certification with valid trace passes Gate 3', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B SaaS' }),
    makeFact({ id: 'f-cert', key: 'asset_authorization_certification', value: 'GSP', authority: 'USER_CONFIRMED' }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
  ];
  const opp = makeOpportunity('opp-1', 'Generic B2B platform', ['f-bm', 'f-cert'], ['n:business:bm']);
  const ins = makeInsight('insight-1', ['f-bm', 'f-cert'], ['n:business:bm']);
  // NOTE: avoid "Pharmaceutical" / "CE" / "ISO" / "FDA" / "NMPA" / "GMP" in
  // any other text (the regex is non-word-boundary and would otherwise
  // false-positive). The thesis is the only place that mentions GSP.
  const concept = {
    ...makeConcept('c-1', 'Generic B2B with GSP backing', ['f-bm', 'f-cert'], ['n:business:bm']),
    thesis: '通过 GSP 认证背书，传递平台的工程严谨性',
  };
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1'), makeEvidence('evidence-cert', 'cert.pdf')],
    conflicts: [],
  });
  assert.equal(findIssue(results, 'OFFICIAL_CERTIFICATION_CLAIM').present, false);
});

// ---------------------------------------------------------------------------
// J05: certification hallucination (industry-only) → blocked
// ---------------------------------------------------------------------------

test('J05 certification hallucination: industry-only medical context cannot justify NMPA / FDA', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'medical supply' }),
    makeFact({ id: 'f-ind', key: 'business.industry', value: 'medical' }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
  ];
  const opp = makeOpportunity('opp-1', 'Medical platform', ['f-bm', 'f-ind'], ['n:business:bm']);
  const ins = makeInsight('insight-1', ['f-bm', 'f-ind'], ['n:business:bm']);
  const concept = {
    ...makeConcept('c-1', 'Medical platform with NMPA / FDA', ['f-bm', 'f-ind'], ['n:business:bm']),
    thesis: '通过 NMPA 注册 与 FDA 认证，建立医疗级可信度',
  };
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts: [],
  });
  const cert = findIssue(results, 'OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(cert.present, true);
  assert.equal(cert.severity, 'block');
});

// ---------------------------------------------------------------------------
// J06: constraint-only Need + respected = no false coverage block
// ---------------------------------------------------------------------------

test('J06 constraint respected: priority=3 constraint-only Need does not produce coverage block', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B' }),
    makeFact({ id: 'f-bn', key: 'brand.name', value: 'B', authority: 'USER_CONFIRMED' }),
    makeFact({ id: 'f-pd', key: 'constraint.prohibited_directions', value: ['avante-garde'] }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
    makeNeed({ id: 'n:identity:bn', type: 'identity', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-bn'] }),
    makeNeed({ id: 'n:constraint:pd', type: 'constraint', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-pd'] }),
  ];
  const opp = makeOpportunity('opp-1', 'B2B comm', ['f-bm'], ['n:business:bm']);
  const ins = makeInsight('insight-1', ['f-bm'], ['n:business:bm']);
  const concept = makeConcept('c-1', 'Conservative B2B', ['f-bm'], ['n:business:bm']);
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts: [],
  });
  assert.equal(findIssue(results, 'MISSING_CRITICAL_NEED_COVERAGE').present, false);
});

// ---------------------------------------------------------------------------
// J07: supported fact + valid trace = no false block
// ---------------------------------------------------------------------------

test('J07 supported fact + valid trace: certification claim is not falsely blocked by trace loss', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B' }),
    makeFact({ id: 'f-iso', key: 'asset_authorization_certification', value: 'ISO 9001', authority: 'USER_CONFIRMED' }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
  ];
  const opp = makeOpportunity('opp-1', 'Certified platform', ['f-bm', 'f-iso'], ['n:business:bm']);
  const ins = makeInsight('insight-1', ['f-bm', 'f-iso'], ['n:business:bm']);
  const concept = {
    ...makeConcept('c-1', 'ISO 9001 backed platform', ['f-bm', 'f-iso'], ['n:business:bm']),
    thesis: '通过 ISO 9001 认证 背书，传递平台的工程严谨性',
  };
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1'), makeEvidence('evidence-iso', 'cert.pdf')],
    conflicts: [],
  });
  assert.equal(findIssue(results, 'OFFICIAL_CERTIFICATION_CLAIM').present, false);
});

// ---------------------------------------------------------------------------
// J08: critical identity conflict → upstream Gate 7 block, NOT a coverage
// issue
// ---------------------------------------------------------------------------

test('J08 critical identity conflict: blocked by Gate 7, not by value-coverage', () => {
  const facts = [
    makeFact({ id: 'f-bm', key: 'business_model', value: 'B2B' }),
    makeFact({ id: 'f-bn', key: 'brand.name', value: 'X', authority: 'USER_CONFIRMED' }),
  ];
  const needs = [
    makeNeed({ id: 'n:business:bm', type: 'business', status: 'important', priority: 2,
      coverageRequirement: 'required', factRefs: ['f-bm'] }),
    makeNeed({ id: 'n:identity:bn', type: 'identity', status: 'required', priority: 3,
      coverageRequirement: 'constraint_only', factRefs: ['f-bn'] }),
  ];
  const opp = makeOpportunity('opp-1', 'B2B comm', ['f-bm'], ['n:business:bm']);
  const ins = makeInsight('insight-1', ['f-bm'], ['n:business:bm']);
  const concept = makeConcept('c-1', 'X platform', ['f-bm', 'f-bn'], ['n:business:bm']);
  const conflicts = [
    {
      id: 'conflict:identity_mismatch:f-bn',
      schemaVersion: 'project-truth-v0.1',
      projectId: 'p-gen',
      key: 'brand.name',
      type: 'identity_mismatch',
      factIds: ['f-bn'],
      status: 'open',
      summary: 'brand.name has two distinct values',
      detectedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  const results = runConceptGates(concept, {
    opportunities: [opp], insights: [ins], needs, facts,
    evidence: [makeEvidence('evidence-1', 'doc-1')], conflicts,
  });
  assert.equal(findIssue(results, 'CRITICAL_CONFLICT_DEPENDENCY').present, true);
  // Value-coverage must NOT be the cause.
  assert.equal(findIssue(results, 'MISSING_CRITICAL_NEED_COVERAGE').present, false);
  const unknownConflictGate = results.find((r) => r.gate === 'unknown-conflict');
  assert.ok(unknownConflictGate && unknownConflictGate.status === 'blocked');
});
