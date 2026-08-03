import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildCreativeDirectionGenerationRequest,
  buildCreativeIntelligenceOpportunityAnalysis,
  migrateCreativeDecisionForV2
} from '@masterpiece/creative-intelligence-runtime';

const fixtureUrl = new URL('../../../evaluation/contracts/creative-intelligence-v2-golden-cases.json', import.meta.url);

test('Phase 6 Golden matrix covers all required migration and product scenarios without visual rereads', async () => {
  const matrix = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  assert.deepEqual(matrix.cases.map((item) => item.id), [
    'greenfield-document', 'existing-visual-upgrade', 'joint-intent-visual',
    'reference-first-transfer', 'legacy-project', 'incomplete-evidence'
  ]);
  assert.ok(matrix.cases.filter((item) => 'requiresVisualReread' in item)
    .every((item) => item.requiresVisualReread === false));
});

test('document-only greenfield and existing visual upgrade select the correct direction mode from structured truth', () => {
  const base = {
    schemaVersion: '2.0', projectId: 'golden-mode', brandFacts: [{ content: 'Retail', subjectPath: 'brandFacts.industry', evidenceRefs: ['EV-1'], confidence: 1, status: 'confirmed' }],
    productFacts: [], audienceFacts: [], businessGoals: [], confirmedUserIntent: [], currentVisualPatterns: [], constraints: [], conflicts: [], assumptions: [], openQuestions: []
  };
  const opportunities = { projectId: 'golden-mode', mustKeep: [], canReconstruct: [], shouldAvoid: [], canOwn: [], primaryTouchpoints: [{ id: 'poster', label: 'Poster', evidenceRefs: ['EV-1'] }], evidenceRefs: ['EV-1'] };
  assert.equal(buildCreativeDirectionGenerationRequest({ projectTruthModel: { ...base, observedVisualAssets: [] }, categoryOpportunityMap: opportunities }).directionMode, 'greenfield');
  assert.equal(buildCreativeDirectionGenerationRequest({ projectTruthModel: { ...base, observedVisualAssets: [{ content: 'Existing mark', evidenceRefs: ['EV-1'] }] }, categoryOpportunityMap: opportunities }).directionMode, 'existing_system_upgrade');
});

test('joint analysis exposes intent-to-visual gaps from cached structured sources', () => {
  const output = buildCreativeIntelligenceOpportunityAnalysis({
    projectId: 'golden-joint',
    documentContext: {
      schemaVersion: '1.0', sourceRunId: 'document-golden-joint',
      brandName: 'Example', industry: 'Retail', products: [], services: [], targetAudience: ['Young families'],
      brandPersonality: ['Warm and approachable'], visualPreferences: ['Warm and approachable'],
      requiredTouchpoints: ['Poster'], lockedFacts: [], prohibitedDirections: ['Cold clinical styling'],
      unknownFields: [], warnings: [], evidence: []
    },
    documentConfirmed: true,
    visualContext: {
      schemaVersion: '2.0', projectId: 'golden-joint', brandCore: { name: 'Example', industry: 'Retail', audience: [] },
      visualIdentity: { colorBehavior: ['Cold monochrome'], compositionBehavior: [], graphicBehavior: [] },
      styleBoundaries: { mustKeep: [], mustAvoid: [] }, lockedAssets: { confirmedColors: [], logoAssetIds: [] }, sourceAssetRefs: []
    }
  });
  assert.equal(output.mode, 'joint');
  assert.ok(output.artifacts.intentVisualGapAnalysis.requiresHumanReview);
});

test('legacy migration preserves the exact production decision and never fabricates V2 evidence or trace', () => {
  const legacy = { schemaVersion: '6.0', projectId: 'legacy-project', id: 'legacy-1', primaryDirection: { name: 'Existing direction' } };
  const migrated = migrateCreativeDecisionForV2(legacy);
  assert.equal(migrated.status, 'legacy_passthrough');
  assert.strictEqual(migrated.productionDecision, legacy);
  assert.equal(migrated.creativeDecisionV2, null);
  assert.equal(migrated.decisionTrace, null);
});

test('incomplete evidence fails closed before direction generation instead of inventing a touchpoint', () => {
  assert.throws(() => buildCreativeDirectionGenerationRequest({
    projectTruthModel: { projectId: 'incomplete', brandFacts: [], observedVisualAssets: [] },
    categoryOpportunityMap: { projectId: 'incomplete', primaryTouchpoints: [] }
  }), (error) => ['DIRECTION_EVIDENCE_REQUIRED', 'TOUCHPOINT_CONFIRMATION_REQUIRED', 'PROJECT_TRUTH_INSUFFICIENT'].includes(error.code));
});
