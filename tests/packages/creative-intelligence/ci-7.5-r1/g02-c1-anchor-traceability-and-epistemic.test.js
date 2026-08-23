import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const strategicUrl = pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href;
const serviceUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts')).href;
const orchestratorUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts')).href;

const planningClaims = Array.from({ length: 13 }, (_, index) => ({
  claimId: `runtime-claim-${index + 1}`,
  key: 'strategic_objective',
  value: `Planning claim ${index + 1}`,
  epistemicClass: 'USER_REQUIREMENT',
  sourceDocumentId: 'approved-g02-source',
  chunkRefs: [`section-${index + 1}`],
}));
const anchors = planningClaims.map((claim, index) => ({
  anchorId: `G02-BP-A${String(index + 1).padStart(2, '0')}`,
  importance: index < 7 ? 'CRITICAL' : 'IMPORTANT',
  semanticMeaning: `Material meaning ${index + 1}`,
  sourceReference: `SRC-G02-${index + 1}`,
  planningClaimRefs: [claim.claimId],
}));

function artifactWithPlanningRefs(refs) {
  return {
    schemaVersion: '0.1', projectId: 'g02-project', promptVersion: 'ci-w1c.7-strategic-synthesis-v0.1', generatedAt: '2026-08-23T00:00:00.000Z',
    sourceMap: { planningTruth: [], userRequirements: [], lockedIdentity: [], prohibitedDirections: [], needs: [], evidence: [], planningClaims: planningClaims.map((c) => c.claimId), legacyVisualEvidenceExcluded: ['visualAsset.*'] },
    projectUnderstanding: { summary: 's', coreChallenge: 'c', transformationGoal: 't', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [], planningClaimRefs: refs },
    tensions: [], insights: [], opportunities: [], diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
  };
}

test('ANCHOR-INJECT-01: Strategic prompt contains the approved Ground Truth Anchor map', async () => {
  const { compileStrategicReasoningContext, buildStrategicSynthesisPrompt } = await import(strategicUrl);
  const ctx = compileStrategicReasoningContext({
    projectId: 'g02-project',
    truth: { facts: [] }, needs: [], evidence: { entries: [] },
    planningStrategicEvidence: planningClaims,
    groundTruthAnchors: anchors,
  });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'g02-project', ctx });
  assert.match(prompt.userMessage, /# GROUND TRUTH ANCHORS/);
  assert.match(prompt.systemMessage, /Planning Claims, Planning Needs, Evidence References, and Ground Truth Anchors/);
  assert.equal(prompt.size.groundTruthAnchorCount, 13);
  for (const anchor of anchors) assert.match(prompt.userMessage, new RegExp(anchor.anchorId));
});

test('ANCHOR-INJECT-02: rendered anchor IDs originate exactly from runtime input', async () => {
  const { compileStrategicReasoningContext, buildStrategicSynthesisPrompt } = await import(strategicUrl);
  const selected = anchors.slice(0, 3);
  const ctx = compileStrategicReasoningContext({ projectId: 'g02-project', truth: { facts: [] }, needs: [], evidence: { entries: [] }, planningStrategicEvidence: planningClaims, groundTruthAnchors: selected });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'g02-project', ctx }).userMessage;
  const rendered = [...prompt.matchAll(/anchorId=(G02-BP-A\d{2})/g)].map((match) => match[1]);
  assert.deepEqual(rendered, selected.map((anchor) => anchor.anchorId));
});

test('ANCHOR-INJECT-03: no G01 anchor is introduced by prompt compilation', async () => {
  const { compileStrategicReasoningContext, buildStrategicSynthesisPrompt } = await import(strategicUrl);
  const ctx = compileStrategicReasoningContext({ projectId: 'g02-project', truth: { facts: [] }, needs: [], evidence: { entries: [] }, planningStrategicEvidence: planningClaims, groundTruthAnchors: anchors });
  const prompt = buildStrategicSynthesisPrompt({ projectId: 'g02-project', ctx }).userMessage;
  assert.doesNotMatch(prompt, /G01-|brand_positioning|transformation_objective/);
});

test('ANCHOR-INJECT runtime wiring: service persists the anchor-bearing prompt and enforces retention offline', async () => {
  const { createCreativeReasoningService } = await import(serviceUrl);
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'g02-c1-'));
  try {
    const service = createCreativeReasoningService({ outputRoot: async () => outputRoot });
    const oneClaim = planningClaims[0];
    const boundAnchors = anchors.slice(0, 3).map((anchor) => ({ ...anchor, planningClaimRefs: [oneClaim.claimId] }));
    const result = await service.run({
      projectId: 'g02-project', stopAfter: 'synthesis', useMock: true,
      truth: { projectId: 'g02-project', facts: [{ id: 'fact-1', key: 'brand.role', value: 'test', authority: 'USER_CONFIRMED', sourceRefs: [] }], conflicts: [] },
      needs: [{ id: 'need-1', type: 'communication', statement: 'test need', factRefs: ['fact-1'], coverageRequirement: 'required' }],
      evidence: { projectId: 'g02-project', entries: [{ id: 'evidence-1', sourceType: 'planning_document', content: 'test', confidence: 1 }] },
      planningStrategicEvidence: [oneClaim], groundTruthAnchors: boundAnchors,
    });
    assert.equal(result.stages.synthesis.status, 'PASS', JSON.stringify(result.stages.synthesis));
    const snapshot = JSON.parse(await fs.readFile(result.outputPaths.promptSnapshots.synthesis, 'utf8'));
    assert.match(snapshot.messages.find((message) => message.role === 'user').content, /# GROUND TRUTH ANCHORS/);
    assert.equal(result.imageProviderCallCount, 0);
  } finally {
    await fs.rm(outputRoot, { recursive: true, force: true });
  }
});

test('ANCHOR-RETENTION: CRITICAL is 100 percent hard; IMPORTANT 80 percent is diagnostic', async () => {
  const { evaluateGroundTruthAnchorRetention } = await import(strategicUrl);
  const retained = planningClaims.slice(0, 12).map((claim) => claim.claimId);
  const report = evaluateGroundTruthAnchorRetention({ artifact: artifactWithPlanningRefs(retained), groundTruthAnchors: anchors, planningClaims });
  assert.equal(report.passed, true);
  assert.deepEqual(report.critical, { retained: 7, total: 7, ratio: 1 });
  assert.equal(report.important.retained, 5);
  assert.equal(report.important.targetMet, true);

  const failed = evaluateGroundTruthAnchorRetention({ artifact: artifactWithPlanningRefs(retained.slice(1)), groundTruthAnchors: anchors, planningClaims });
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.missingCriticalAnchorIds, ['G02-BP-A01']);
  assert.ok(failed.blockedCodes.includes('ANCHOR_RETENTION_CRITICAL_MISSING'));
});

test('TRACE-CLOSED-LOOP: every retained anchor resolves through a runtime Planning claim to a source reference', async () => {
  const { evaluateGroundTruthAnchorRetention } = await import(strategicUrl);
  const report = evaluateGroundTruthAnchorRetention({ artifact: artifactWithPlanningRefs(planningClaims.map((claim) => claim.claimId)), groundTruthAnchors: anchors, planningClaims });
  assert.equal(report.traceability.length, anchors.length);
  assert.ok(report.traceability.every((row) => row.sourceReference.startsWith('SRC-G02-') && row.retainedPlanningClaimRefs.length > 0));
});

test('ANCHOR-BIND-01: templates resolve generic Planning keys to live runtime claim IDs', async () => {
  const { resolveGroundTruthAnchorTemplates } = await import(orchestratorUrl);
  const templates = [{
    anchorId: 'G02-BP-A01', importance: 'CRITICAL', semanticMeaning: 'meaning',
    sourceReference: 'SRC-G02-02', planningClaimKeys: ['business_model', 'product_service'],
  }];
  const claims = [
    { ...planningClaims[0], claimId: 'live-business-model', key: 'business_model' },
    { ...planningClaims[1], claimId: 'live-product-service', key: 'product_service' },
    { ...planningClaims[2], claimId: 'unrelated', key: 'industry' },
  ];
  assert.deepEqual(resolveGroundTruthAnchorTemplates(templates, claims), [{
    anchorId: 'G02-BP-A01', importance: 'CRITICAL', semanticMeaning: 'meaning',
    sourceReference: 'SRC-G02-02', planningClaimRefs: ['live-business-model', 'live-product-service'],
  }]);
});

test('ANCHOR-BIND-02: unresolved templates fail closed before Strategic', async () => {
  const { resolveGroundTruthAnchorTemplates } = await import(orchestratorUrl);
  assert.throws(
    () => resolveGroundTruthAnchorTemplates([{
      anchorId: 'G02-BP-A99', importance: 'CRITICAL', semanticMeaning: 'meaning',
      sourceReference: 'SRC-G02-99', planningClaimKeys: ['communication_task'],
    }], [{ ...planningClaims[0], key: 'industry' }]),
    /GROUND_TRUTH_ANCHOR_BINDING_UNRESOLVED: G02-BP-A99/,
  );
});

test('PROFILE-FORWARD-01: Strategic stage receives the explicitly selected analysis profile', async () => {
  const source = await fs.readFile(path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts'), 'utf8');
  assert.match(source, /analysisProfileId:\s*input\.analysisProfileId,[\s\S]*?attemptsOutDir:\s*attemptsDir/);
  assert.match(source, /const analysisProfileId = \(args as unknown as \{ analysisProfileId\?: string \}\)\.analysisProfileId/);
});

test('PLANNING-RESUME-01: accepted Planning carrier bypasses live Planning regeneration explicitly', async () => {
  const source = await fs.readFile(path.join(repoRoot, 'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts'), 'utf8');
  assert.match(source, /acceptedPlanningStrategicEvidence\?: PlanningStrategicClaim\[\]/);
  assert.match(source, /if \(!acceptedPlanningStrategicEvidence && structuredArtifact && brief\)/);
  assert.match(source, /acceptedPlanningStrategicEvidence \?\? planningArtifact\?\.claims \?\? \[\]/);
});

test('EPI-G02-01: future build ambition is USER_REQUIREMENT, not FACT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(strategicUrl);
  assert.equal(classifyPlanningClaimEpistemicClass({ value: '未来打造跨年龄健康管理平台' }), 'USER_REQUIREMENT');
});

test('EPI-G02-02: three-to-five-year expansion plan is USER_REQUIREMENT, not FACT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(strategicUrl);
  assert.equal(classifyPlanningClaimEpistemicClass({ value: '3-5年扩展全国连锁网络' }), 'USER_REQUIREMENT');
});

test('EPI-G02-03: projected outcome is MODEL_INFERENCE, not FACT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(strategicUrl);
  assert.equal(classifyPlanningClaimEpistemicClass({ value: '预计收入将达到阶段目标' }), 'MODEL_INFERENCE');
});

test('EPI-G02-04: current declarative operating fact remains FACT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(strategicUrl);
  assert.equal(classifyPlanningClaimEpistemicClass({ value: '公司采用线上线下一体化服务模式' }), 'FACT');
});
