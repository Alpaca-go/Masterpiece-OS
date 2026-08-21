import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  createPlanningAwareTestReasonerFactory,
  dummyReadCredentials,
} from '../ci-7.4-r2.1/planning-aware-test-reasoner.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const serviceUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts')).href;
const strategicUrl = pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href;
const qualifierPath = path.join(repoRoot, 'apps/web-runtime/scripts/ci-w1c/live-qualify-planning-project.mjs');
const orchestratorPath = path.join(repoRoot, 'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts');

function truth(projectId) {
  return {
    projectId,
    facts: [{ id: 'scope-fact', key: 'scope.fact', value: 'Distinct project fact', authority: 'CONFIRMED', sourceRefs: [] }],
    conflicts: [],
    sourceRefs: [],
    schemaVersion: 'project-truth-v0.1',
    generatedAt: '2026-08-21T00:00:00.000Z'
  };
}

function needs() {
  return [{ id: 'scope-need', type: 'user.requirement', statement: 'Distinct project need', factRefs: [], coverageRequirement: 'required' }];
}

function evidence(projectId) {
  return { projectId, entries: [], generatedAt: '2026-08-21T00:00:00.000Z' };
}

function classifyPrompt(messages) {
  const text = messages.map((message) => message.content ?? '').join('\n');
  if (/ModelAssistedDirectionSet/iu.test(text)) return 'direction';
  if (/ModelAssistedConceptSet/iu.test(text)) return 'concept';
  return 'synthesis';
}

function makePassingReasonerFactory(projectId, seen) {
  const baseFactory = createPlanningAwareTestReasonerFactory(repoRoot);
  return (credentials) => {
    const base = baseFactory(credentials);
    return async (input) => {
      const stage = classifyPrompt(input.prompt.messages);
      seen.push(stage);
      const response = await base(input);
      const artifact = JSON.parse(response.reportMarkdown);
      artifact.projectId = projectId;
      if (stage === 'concept') {
        artifact.candidates.forEach((candidate, index) => {
          const n = index + 1;
          candidate.title = `Distinct concept ${n}`;
          candidate.coreProposition = `Project-specific proposition ${n} grounded in opportunity ${n}`;
          candidate.strategicMechanism = `Mechanism ${n} converts the source constraint into a distinct operating principle`;
          candidate.whyThisProject = `This project requires route ${n} because its source-backed challenge is distinct`;
          candidate.whyNotCategoryCliche = `Route ${n} avoids a generic category template through its cited opportunity`;
          candidate.translationHypothesis = {
            organizationLogic: `Organization logic ${n}`,
            expressionLogic: `Expression logic ${n}`,
            possibleVisualBehaviors: [`Behavior ${n}`]
          };
        });
      }
      if (stage === 'direction') {
        artifact.directions.forEach((direction, index) => {
          const n = index + 1;
          direction.title = `Distinct direction ${n}`;
          direction.creativeThesis = `Direction thesis ${n} with a unique project-specific hierarchy`;
          direction.visualMechanism = `Visual mechanism ${n} translates the selected concept without duplication`;
          direction.systemHypothesis = `System hypothesis ${n} remains testable across touchpoints`;
          direction.whyThisProject = `Direction ${n} answers the project's cited strategic mechanism`;
          direction.differenceFromOtherDirections = `Direction ${n} uses a separate organizing principle`;
        });
      }
      return { reportMarkdown: JSON.stringify(artifact) };
    };
  };
}

async function runScoped(stopAfter, options = {}) {
  const { createCreativeReasoningService } = await import(serviceUrl);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-scope-r141-'));
  const projectId = 'scope-r141-project';
  const seen = [];
  const reasonerFactory = options.failSynthesis
    ? () => async (input) => {
        seen.push(classifyPrompt(input.prompt.messages));
        return { reportMarkdown: '{"invalid":true}' };
      }
    : makePassingReasonerFactory(projectId, seen);
  try {
    const service = createCreativeReasoningService({
      outputRoot: async () => root,
      reasonerFactory,
      readCredentials: dummyReadCredentials
    });
    const result = await service.run({
      projectId,
      truth: truth(projectId),
      needs: needs(),
      evidence: evidence(projectId),
      useMock: false,
      ...(stopAfter ? { stopAfter } : {})
    });
    return { result, seen };
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('SCOPE-01: stopAfter=synthesis leaves Concept and Direction NOT_RUN with zero attempts', async () => {
  const { result } = await runScoped('synthesis');
  assert.equal(result.stages.synthesis.status, 'PASS');
  assert.deepEqual([result.stages.concept.status, result.stages.concept.attempts], ['NOT_RUN', 0]);
  assert.deepEqual([result.stages.direction.status, result.stages.direction.attempts], ['NOT_RUN', 0]);
  assert.equal(result.outputPaths.promptSnapshots.concept, null);
  assert.equal(result.outputPaths.promptSnapshots.direction, null);
});

test('SCOPE-02: failed synthesis still leaves downstream stages NOT_RUN', async () => {
  const { result, seen } = await runScoped('synthesis', { failSynthesis: true });
  assert.deepEqual([result.stages.synthesis.status, result.stages.synthesis.attempts], ['FAIL', 2]);
  assert.deepEqual([result.stages.concept.status, result.stages.concept.attempts], ['NOT_RUN', 0]);
  assert.deepEqual([result.stages.direction.status, result.stages.direction.attempts], ['NOT_RUN', 0]);
  assert.deepEqual(seen, ['synthesis', 'synthesis']);
});

test('SCOPE-03: stopAfter=concept runs Concept and leaves Direction NOT_RUN', async () => {
  const { result, seen } = await runScoped('concept');
  assert.equal(result.stages.synthesis.status, 'PASS');
  assert.equal(result.stages.concept.status, 'PASS');
  assert.deepEqual([result.stages.direction.status, result.stages.direction.attempts], ['NOT_RUN', 0]);
  assert.deepEqual(seen, ['synthesis', 'concept']);
});

test('SCOPE-04: default scope retains synthesis → concept → direction behavior', async () => {
  const { result, seen } = await runScoped(undefined);
  assert.deepEqual(seen.slice(0, 3), ['synthesis', 'concept', 'direction']);
  assert.equal(result.stages.synthesis.status, 'PASS');
  assert.equal(result.stages.concept.status, 'PASS');
  assert.equal(result.stages.direction.attempts > 0, true);
});

test('SCOPE-05: strategic-only qualification wiring uses stopAfter and treats downstream receipt as unexpected', async () => {
  const source = await fs.readFile(qualifierPath, 'utf8');
  const orchestratorSource = await fs.readFile(orchestratorPath, 'utf8');
  assert.match(source, /args\.strategicOnly \? \{ stopAfter: 'synthesis' \}/u);
  assert.doesNotMatch(source, /G01_QUALIFICATION_SCOPE_BLOCKED_CONCEPT/u);
  assert.match(source, /G01_QUALIFICATION_UNEXPECTED_STAGE/u);
  assert.match(orchestratorSource, /stopAfter\?: CreativeReasoningStopAfter/u);
  assert.match(orchestratorSource, /stopAfter: input\.stopAfter/u);
});

test('SCOPE-06: unauthorized Concept has no base or repair prompt', async () => {
  const { result, seen } = await runScoped('synthesis');
  assert.equal(seen.filter((stage) => stage === 'concept').length, 0);
  assert.equal(result.stages.concept.rawAttempts.length, 0);
  assert.equal(result.stages.concept.attempts, 0);
});

function artifactWithRefs(refsByArea) {
  return {
    projectUnderstanding: { planningClaimRefs: refsByArea.projectUnderstanding ?? [] },
    tensions: (refsByArea.tensions ?? []).map((refs, index) => ({ id: `t${index}`, planningClaimRefs: refs })),
    insights: (refsByArea.insights ?? []).map((refs, index) => ({ id: `i${index}`, planningClaimRefs: refs })),
    opportunities: (refsByArea.opportunities ?? []).map((refs, index) => ({ id: `o${index}`, planningClaimRefs: refs }))
  };
}

function passingGateResults(overrides = {}) {
  return { SG01: true, SG11: true, SG12: true, SG13: true, SG14: true, SG15: true, ...overrides };
}

async function traceFixture({ directCount = 11, allowedExtra = [], refsAbsent = false } = {}) {
  const { auditStrategicPlanningUsage, evaluateTraceabilityAcceptance } = await import(strategicUrl);
  const anchors = Array.from({ length: 12 }, (_, index) => `claim-${index + 1}`);
  const cited = refsAbsent ? [] : anchors.slice(0, directCount);
  const allowed = [...anchors, ...allowedExtra];
  const artifact = artifactWithRefs({
    projectUnderstanding: cited.slice(0, 2),
    tensions: [cited.slice(2, 5)],
    insights: [cited.slice(5, 9)],
    opportunities: [cited.slice(9)]
  });
  const usage = auditStrategicPlanningUsage({ artifact, allowedPlanningClaimIds: allowed, anchorClaimIds: anchors });
  return { anchors, allowed, usage, evaluateTraceabilityAcceptance };
}

test('TRACE-01: 12/12 semantic, 11/12 direct, SG PASS, review >=2 passes', async () => {
  const { anchors, usage, evaluateTraceabilityAcceptance } = await traceFixture();
  const result = evaluateTraceabilityAcceptance({
    requiredSemanticAnchorCount: 12,
    semanticAnchors: anchors.map((key) => ({ key, retained: true })),
    materialSilentLossCount: 0,
    gateResults: passingGateResults(),
    traceabilityScore: 2,
    usage
  });
  assert.equal(result.passed, true);
  assert.equal(usage.directAnchorTraceCoverage.citedCount, 11);
  assert.ok(result.warnings.includes('TRACE_DIRECT_ANCHOR_COVERAGE_DIAGNOSTIC'));
});

test('TRACE-02: material semantic anchor absence fails even when sourceMap carried its ID', async () => {
  const { anchors, usage, evaluateTraceabilityAcceptance } = await traceFixture({ directCount: 12 });
  const semanticAnchors = anchors.map((key, index) => ({ key, retained: index !== 4 }));
  const result = evaluateTraceabilityAcceptance({ requiredSemanticAnchorCount: 12, semanticAnchors, materialSilentLossCount: 1, gateResults: passingGateResults(), traceabilityScore: 3, usage });
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes('TRACE_MATERIAL_ANCHOR_ABSENT'));
});

test('TRACE-03: semantic presence with no planningClaimRefs fails SG-11 acceptance', async () => {
  const { anchors, usage, evaluateTraceabilityAcceptance } = await traceFixture({ refsAbsent: true });
  const result = evaluateTraceabilityAcceptance({ requiredSemanticAnchorCount: 12, semanticAnchors: anchors.map((key) => ({ key, retained: true })), materialSilentLossCount: 0, gateResults: passingGateResults({ SG11: false }), traceabilityScore: 2, usage });
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes('TRACE_SG11_FAILED'));
});

test('TRACE-04: invalid planningClaimRef fails SG-01 acceptance', async () => {
  const { anchors, usage, evaluateTraceabilityAcceptance } = await traceFixture({ directCount: 12 });
  const result = evaluateTraceabilityAcceptance({ requiredSemanticAnchorCount: 12, semanticAnchors: anchors.map((key) => ({ key, retained: true })), materialSilentLossCount: 0, gateResults: passingGateResults({ SG01: false }), traceabilityScore: 3, usage });
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes('TRACE_SG01_FAILED'));
});

test('TRACE-05: uncited redundant claim is diagnostic, not a hard gate', async () => {
  const { anchors, usage, evaluateTraceabilityAcceptance } = await traceFixture({ directCount: 12, allowedExtra: ['redundant-claim'] });
  const result = evaluateTraceabilityAcceptance({ requiredSemanticAnchorCount: 12, semanticAnchors: anchors.map((key) => ({ key, retained: true })), materialSilentLossCount: 0, gateResults: passingGateResults(), traceabilityScore: 3, usage });
  assert.equal(result.passed, true);
  assert.deepEqual(usage.uncitedPlanningClaimIds, ['redundant-claim']);
  assert.ok(result.warnings.includes('TRACE_UNCITED_PLANNING_CLAIMS_DIAGNOSTIC'));
});

test('Attempt-3-equivalent epistemic replay keeps a distinct declarative audience sub-claim FACT', async () => {
  const {
    PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION,
    buildPlanningEpistemicAudit,
    projectPlanningExtractionToClaims
  } = await import(strategicUrl);
  const sourceDocumentId = 'project:PLANNING_STRATEGIC_SOURCE:brief.docx:0123456789abcdef';
  const extraction = {
    schemaVersion: PLANNING_SEMANTIC_EXTRACTION_SCHEMA_VERSION,
    claims: [{
      key: 'audience_problem',
      value: '消费者决策从价格敏感转向价值优先，信任缺失是底层痛点。',
      epistemicClass: 'FACT',
      evidence: [{ documentId: sourceDocumentId, filename: 'brief.docx', section: '用户画像', summary: '总结消费者信任危机为当前核心痛点。' }]
    }],
    conflicts: [],
    unknownKeys: []
  };
  const finalClaims = projectPlanningExtractionToClaims({ extraction, sourceDocumentId, documentRole: 'brand-strategy' });
  const audit = buildPlanningEpistemicAudit({
    extraction,
    finalClaims,
    documentRole: 'brand-strategy',
    sourceTextByKey: { audience_problem: '消费者决策从价格敏感转向价值优先，信任缺失是底层痛点。另一独立句要求过程透明。' }
  })[0];
  assert.equal(audit.modelProposal, 'FACT');
  assert.equal(audit.deterministicClass, 'FACT');
  assert.equal(audit.finalClass, 'FACT');
  assert.equal(audit.route, 'EVIDENCE_ONLY');
  assert.deepEqual(audit.extractedValueModalityMarkers, []);
  assert.ok(audit.sourceModalityMarkers.includes('要求'));
});

test('redacted evidence v2 validates required recomputation fields and rejects raw payload keys', async () => {
  const { QUALIFICATION_EVIDENCE_V2_SCHEMA_VERSION, validateRedactedQualificationEvidenceV2 } = await import(strategicUrl);
  const { usage } = await traceFixture();
  const evidenceV2 = {
    schemaVersion: QUALIFICATION_EVIDENCE_V2_SCHEMA_VERSION,
    sourceHashes: { sha256: 'a'.repeat(64), registeredContentHash: 'b'.repeat(64) },
    callLedger: [],
    planningClaims: [],
    planningEpistemicAudit: [],
    allowedSourceSets: { facts: [], needs: [], evidence: [], planningClaims: [] },
    artifactMirrorSets: { planningTruth: [], needs: [], evidence: [], planningClaims: [] },
    blockedCodes: { accepted: [], attempts: [] },
    stageStatuses: { synthesis: { status: 'PASS', attempts: 1 }, concept: { status: 'NOT_RUN', attempts: 0 }, direction: { status: 'NOT_RUN', attempts: 0 } },
    strategicUsage: usage
  };
  assert.deepEqual(validateRedactedQualificationEvidenceV2(evidenceV2), { valid: true, errors: [] });
  assert.equal(validateRedactedQualificationEvidenceV2({ ...evidenceV2, rawText: 'forbidden' }).valid, false);
});
