import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const serviceUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts')).href;
const narrativeUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/narrative-planning-extraction-runner.ts')).href;
const strategicUrl = pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href;

const authority = Object.freeze({
  facts: ['fact-a', 'fact-b'],
  needs: ['need-a'],
  evidence: ['evidence-a'],
  planningClaims: ['planning-a', 'planning-b']
});

function prompt(ids = authority) {
  return [
    'You produce a StrategicSynthesisArtifact.',
    '# SOURCE TRACE IDS',
    `  facts: [${ids.facts.join(', ')}]`,
    `  needs: [${ids.needs.join(', ')}]`,
    `  evidence: [${ids.evidence.join(', ')}]`,
    `  planningClaims: [${ids.planningClaims.join(', ')}]`,
    '# EXCLUDED LEGACY VISUAL AUTHORITIES'
  ].join('\n');
}

async function build(ids = authority) {
  const { buildPlanningAwareMockSynthesisArtifact } = await import(serviceUrl);
  return buildPlanningAwareMockSynthesisArtifact(prompt(ids));
}

function allPlanningRefs(artifact) {
  return [
    ...artifact.projectUnderstanding.planningClaimRefs,
    ...artifact.tensions.flatMap((item) => item.planningClaimRefs),
    ...artifact.insights.flatMap((item) => item.planningClaimRefs),
    ...artifact.opportunities.flatMap((item) => item.planningClaimRefs)
  ];
}

test('MOCK-01: Planning sourceMap exactly mirrors prompt-visible authority', async () => {
  const artifact = await build();
  assert.deepEqual(artifact.sourceMap.planningClaims, authority.planningClaims);
});

test('MOCK-02: projectUnderstanding cites a valid Planning claim', async () => {
  const artifact = await build();
  assert.deepEqual(artifact.projectUnderstanding.planningClaimRefs, ['planning-a']);
});

test('MOCK-03: at least one tension or insight cites a valid Planning claim', async () => {
  const artifact = await build();
  const refs = [...artifact.tensions, ...artifact.insights].flatMap((item) => item.planningClaimRefs);
  assert.ok(refs.length > 0);
  assert.ok(refs.every((ref) => authority.planningClaims.includes(ref)));
});

test('MOCK-04: every emitted Planning ref belongs to the allowed set', async () => {
  const artifact = await build();
  const allowed = new Set(authority.planningClaims);
  assert.ok(allPlanningRefs(artifact).every((ref) => allowed.has(ref)));
  assert.equal(allPlanningRefs(artifact).some((ref) => /FAKE|NONEXISTENT/u.test(ref)), false);
});

test('MOCK-05: facts, needs, and evidence are exact authority mirrors', async () => {
  const artifact = await build();
  assert.deepEqual(artifact.sourceMap.planningTruth, authority.facts);
  assert.deepEqual(artifact.sourceMap.needs, authority.needs);
  assert.deepEqual(artifact.sourceMap.evidence, authority.evidence);
  assert.ok(artifact.projectUnderstanding.factRefs.every((ref) => authority.facts.includes(ref)));
  assert.ok(artifact.projectUnderstanding.needRefs.every((ref) => authority.needs.includes(ref)));
  assert.ok(artifact.projectUnderstanding.evidenceRefs.every((ref) => authority.evidence.includes(ref)));
});

test('MOCK-06: identical prompt produces byte-deterministic JSON', async () => {
  assert.equal(JSON.stringify(await build()), JSON.stringify(await build()));
});

test('MOCK-07: empty Planning input keeps an otherwise grounded mock valid', async () => {
  const artifact = await build({ ...authority, planningClaims: [] });
  assert.deepEqual(artifact.sourceMap.planningClaims, []);
  assert.deepEqual(allPlanningRefs(artifact), []);
  const { validateStrategicSynthesisStructural } = await import(strategicUrl);
  assert.equal(validateStrategicSynthesisStructural(artifact).passed, true);
});

test('MOCK-08: mock Strategic passes structural and SG-01/11/12/13/14/15', async () => {
  const artifact = await build();
  const { validateStrategicSynthesisStructural, runStrategicGroundingGate } = await import(strategicUrl);
  const structural = validateStrategicSynthesisStructural(artifact);
  const grounding = runStrategicGroundingGate({
    artifact,
    truth: {
      projectId: 'mock-contract-project',
      facts: authority.facts.map((id, index) => ({ id, key: `fact.key.${index}`, value: `Fact ${index}`, authority: 'CONFIRMED', sourceRefs: [] })),
      conflicts: [], sourceRefs: [], schemaVersion: 'project-truth-v0.1', generatedAt: '2026-08-22T00:00:00.000Z'
    },
    needs: [{
      id: 'need-a', type: 'business', statement: 'Need A', whyItMatters: 'Required for the project', status: 'required', priority: 2,
      factRefs: ['fact-a'], evidenceRefs: ['evidence-a'], conflictRefs: [], sourceKinds: ['test'], generatedBy: 'deterministic_rule', traceVersion: '1.0'
    }],
    evidence: {
      schemaVersion: '0.1', projectId: 'mock-contract-project', generatedAt: '2026-08-22T00:00:00.000Z',
      entries: [{ id: 'evidence-a', type: 'planning_brief', sourceType: 'test', isReferenceEvidence: false }]
    },
    planningClaims: authority.planningClaims.map((claimId, index) => ({
      claimId, key: index === 0 ? 'industry' : 'brand_role', value: `Planning ${index}`,
      epistemicClass: 'FACT', sourceDocumentId: 'planning-source', chunkRefs: ['section:1']
    })),
    allowedSourceIds: authority
  });
  assert.equal(structural.passed, true, structural.blockedCodes.join(','));
  assert.equal(grounding.passed, true, grounding.blockedCodes.join(','));
  for (const code of ['SG-01', 'SG-11', 'SG-12', 'SG-13', 'SG-14', 'SG-15']) {
    assert.equal(grounding.blockedCodes.includes(code), false, code);
  }
});

test('NARRATIVE-LATENCY-01: transport failures retain measured non-zero latency', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  await assert.rejects(
    runNarrativePlanningExtraction({
      projectId: 'latency-project', sourceDocumentId: 'latency-source', rawText: 'Synthetic planning input.',
      documentRole: 'brand-strategy', filename: 'synthetic.docx',
      reasoner: async () => {
        await new Promise((resolve) => setTimeout(resolve, 12));
        throw Object.assign(new Error('headers timeout'), {
          code: 'REQUEST_FAILED', details: { causeCode: 'UND_ERR_HEADERS_TIMEOUT', responseHeadersReceived: false }
        });
      }
    }),
    (error) => {
      assert.equal(error.code, 'NARRATIVE_EXTRACTION_FAILED');
      assert.deepEqual(error.attempts.map((attempt) => attempt.attemptKind), ['BASE', 'TRANSPORT_RETRY']);
      assert.ok(error.attempts.every((attempt) => attempt.latencyMs > 0));
      return true;
    }
  );
});
