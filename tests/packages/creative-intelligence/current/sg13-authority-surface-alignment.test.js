import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStrategicSynthesisPrompt,
  compileStrategicReasoningContext,
  runStrategicGroundingGate,
} from '@masterpiece/creative-intelligence/strategic-synthesis';

const PROJECT_ID = 'proj-sg13-alignment';

function buildRuntime({ planning = false } = {}) {
  const facts = Array.from({ length: 10 }, (_, index) => ({
    id: `fact-${index + 1}`,
    key: `project.fact.${index + 1}`,
    value: `value-${index + 1}`,
    authority: index < 7 ? 'USER_CONFIRMED' : 'SYSTEM_DEFAULT',
    sourceRefs: [],
  }));
  const truth = { schemaVersion: '1.0', projectId: PROJECT_ID, facts, conflicts: [] };
  const needs = [{
    id: 'need-1',
    type: 'communication',
    statement: 'Clarify the project promise.',
    whyItMatters: 'The audience needs a concrete reason to believe.',
    status: 'required',
    priority: 3,
    factRefs: ['fact-1'],
    evidenceRefs: ['evidence-1'],
    conflictRefs: [],
    sourceKinds: ['planning_document'],
    generatedBy: 'deterministic_rule',
    traceVersion: 'test',
  }];
  const evidence = {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    generatedAt: '2026-08-21T00:00:00.000Z',
    entries: [{
      id: 'evidence-1',
      type: 'document_section',
      sourceType: 'planning_document',
      content: 'Project promise evidence.',
      isReferenceEvidence: false,
    }],
  };
  const planningClaims = planning ? [{
    claimId: 'planning-claim-1',
    key: 'brand_promise',
    value: 'A clear project promise.',
    epistemicClass: 'USER_REQUIREMENT',
    sourceDocumentId: 'planning-doc-1',
    chunkRefs: ['section-1'],
  }] : [];
  const ctx = compileStrategicReasoningContext({
    projectId: PROJECT_ID,
    truth,
    needs,
    evidence,
    planningStrategicEvidence: planningClaims,
  });
  return { truth, needs, evidence, planningClaims, ctx };
}

function buildArtifact(sourceIds, { factRef = 'fact-1', planning = false } = {}) {
  const planningClaimRefs = planning ? ['planning-claim-1'] : [];
  return {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    promptVersion: 'ci-w1c.7-strategic-synthesis-v0.1',
    generatedAt: '2026-08-21T00:00:00.000Z',
    sourceMap: {
      planningTruth: [...sourceIds.facts],
      userRequirements: [],
      lockedIdentity: [],
      prohibitedDirections: [],
      needs: [...sourceIds.needs],
      evidence: [...sourceIds.evidence],
      planningClaims: [...sourceIds.planningClaims],
      legacyVisualEvidenceExcluded: [
        'visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster',
        'old_packaging', 'old_spatial', 'style_reference',
        'structure_reference', 'spatial_reference',
      ],
    },
    projectUnderstanding: {
      summary: 'Project-specific understanding.',
      coreChallenge: 'Clarify the project promise.',
      transformationGoal: 'Create a credible reason to believe.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: [factRef],
      needRefs: ['need-1'],
      evidenceRefs: ['evidence-1'],
      planningClaimRefs,
    },
    tensions: [],
    insights: [{
      id: 'insight-1',
      statement: 'project.fact.1 creates a specific strategic opening.',
      implication: 'Lead with the verified promise.',
      whyThisProject: 'The allowed fact and need establish the opportunity.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: [factRef],
      needRefs: ['need-1'],
      evidenceRefs: ['evidence-1'],
      planningClaimRefs,
    }],
    opportunities: [],
    diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
  };
}

function gate(runtime, artifact) {
  return runStrategicGroundingGate({
    artifact,
    truth: runtime.truth,
    needs: runtime.needs,
    evidence: runtime.evidence,
    planningClaims: runtime.planningClaims,
    allowedSourceIds: runtime.ctx.sourceIds,
  });
}

test('SG13-01: truth 10 / allowed 7 / artifact mirrors allowed 7 passes', () => {
  const runtime = buildRuntime();
  assert.equal(runtime.truth.facts.length, 10);
  assert.equal(runtime.ctx.sourceIds.facts.length, 7);
  const report = gate(runtime, buildArtifact(runtime.ctx.sourceIds));
  assert.equal(report.passed, true, JSON.stringify(report.issues));
});

test('SG13-02: artifact mirrors all 10 truth facts fails SG-13', () => {
  const runtime = buildRuntime();
  const artifact = buildArtifact(runtime.ctx.sourceIds);
  artifact.sourceMap.planningTruth = runtime.truth.facts.map((fact) => fact.id);
  const report = gate(runtime, artifact);
  assert.ok(report.blockedCodes.includes('SG-13'));
});

test('SG13-03: artifact misses one allowed fact fails SG-13', () => {
  const runtime = buildRuntime();
  const artifact = buildArtifact(runtime.ctx.sourceIds);
  artifact.sourceMap.planningTruth.pop();
  const report = gate(runtime, artifact);
  assert.ok(report.blockedCodes.includes('SG-13'));
});

test('SG13-04: artifact adds an invented fact ID fails SG-13', () => {
  const runtime = buildRuntime();
  const artifact = buildArtifact(runtime.ctx.sourceIds);
  artifact.sourceMap.planningTruth.push('fact-invented');
  const report = gate(runtime, artifact);
  assert.ok(report.blockedCodes.includes('SG-13'));
});

test('SG13-05: factRefs citing excluded Truth still fails SG-01', () => {
  const runtime = buildRuntime();
  const artifact = buildArtifact(runtime.ctx.sourceIds, { factRef: 'fact-10' });
  const report = gate(runtime, artifact);
  assert.ok(report.blockedCodes.includes('SG-01'));
  assert.ok(!report.blockedCodes.includes('SG-13'));
});

test('SG-12/14/15: all mirror the same canonical SOURCE TRACE IDS domains', () => {
  const runtime = buildRuntime({ planning: true });
  const report = gate(runtime, buildArtifact(runtime.ctx.sourceIds, { planning: true }));
  for (const code of ['SG-12', 'SG-14', 'SG-15']) {
    assert.ok(!report.blockedCodes.includes(code), `${code} unexpectedly blocked`);
  }
  assert.equal(report.passed, true, JSON.stringify(report.issues));
});

test('SG-12/14/15: omit or add IDs and each domain fails its mirror gate', () => {
  const runtime = buildRuntime({ planning: true });
  const artifact = buildArtifact(runtime.ctx.sourceIds, { planning: true });
  artifact.sourceMap.planningClaims = [];
  artifact.sourceMap.needs = [];
  artifact.sourceMap.evidence = [...artifact.sourceMap.evidence, 'evidence-invented'];
  const report = gate(runtime, artifact);
  for (const code of ['SG-12', 'SG-14', 'SG-15']) {
    assert.ok(report.blockedCodes.includes(code), `${code} should block drift`);
  }
});

test('Prompt mirror contract explicitly binds all four sourceMap domains', () => {
  const runtime = buildRuntime({ planning: true });
  const prompt = buildStrategicSynthesisPrompt({ projectId: PROJECT_ID, ctx: runtime.ctx });
  for (const line of [
    'sourceMap.planningTruth MUST exactly copy SOURCE TRACE IDS facts.',
    'sourceMap.needs MUST exactly copy SOURCE TRACE IDS needs.',
    'sourceMap.evidence MUST exactly copy SOURCE TRACE IDS evidence.',
    'sourceMap.planningClaims MUST exactly copy SOURCE TRACE IDS planningClaims.',
  ]) {
    assert.ok(prompt.userMessage.includes(line), `missing prompt contract: ${line}`);
  }
});
