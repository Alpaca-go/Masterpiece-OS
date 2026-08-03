import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  analyzeIntentVisualGap,
  auditExistingVisualSystem,
  buildCreativeIntelligenceOpportunityAnalysis,
  resolvePrimaryTouchpoints
} from '@masterpiece/creative-intelligence-runtime';

const generatedAt = '2026-08-03T09:00:00.000Z';

const documentContext = {
  schemaVersion: '1.0', sourceRunId: 'doc-run', generatedAt,
  brandName: 'Field Notes', industry: 'Consumer goods',
  products: ['Tea gift set'], services: [], targetAudience: ['Young urban professionals'],
  pricePositioning: 'Premium accessible', businessModel: 'Retail and ecommerce',
  brandPersonality: ['Young and direct'], visualPreferences: ['Clear information hierarchy'],
  requiredTouchpoints: ['包装'], lockedFacts: ['Keep the supplied wordmark'],
  prohibitedDirections: ['Generic luxury gold'], unknownFields: [], evidence: [], sourceDocuments: []
};

const visualContext = {
  schemaVersion: '2.0', projectId: 'project-opportunity', version: 1, generatedAt,
  brandCore: { name: 'Field Notes', industry: 'Consumer goods', brandRole: 'Everyday gifting', audience: ['Young urban professionals'] },
  lockedAssets: {
    logoAssetIds: ['logo-01'], brandNameLocked: true, confirmedColors: ['Forest green'],
    packageStructures: ['Lid and base gift box'], productAssetIds: [], lockedAssetIds: ['logo-01'],
    mustPreserve: ['Wordmark geometry']
  },
  visualIdentity: {
    tone: ['Ornate'], colorBehavior: ['Dark saturated fields'], graphicBehavior: ['Dense decorative border'],
    materialBehavior: ['Coated paper'], compositionBehavior: ['Centered hierarchy'], lightingBehavior: ['Soft product light']
  },
  styleBoundaries: { mustAvoid: ['Excessive decorative stacking'], uncertainItems: [] },
  confirmedDecisions: [
    { id: 'intent-direct', value: 'Build a young and direct expression', source: 'user_confirmation', confirmedAt: generatedAt }
  ],
  sourceAssetRefs: [
    { assetId: 'logo-01', name: 'Field Notes wordmark', relativePath: 'assets/logo.svg', role: 'logo', lockedAssetType: 'logo' }
  ],
  provenance: { builderId: 'fixture', builderVersion: '1', sourceKinds: ['project_record', 'original_asset', 'user_confirmation'], sourceFingerprint: 'fixture' }
};

async function loadSchema(name) {
  return JSON.parse(await readFile(new URL(`../../../schemas/creative-intelligence-v2/${name}`, import.meta.url), 'utf8'));
}

test('Primary Touchpoint Registry uses explicit project touchpoints instead of unrelated VI defaults', () => {
  const analysis = buildCreativeIntelligenceOpportunityAnalysis({
    projectId: 'project-opportunity', documentContext, documentConfirmed: true, visualContext, generatedAt
  });
  const registry = analysis.artifacts.primaryTouchpointRegistry;
  assert.equal(registry.sourcePolicy, 'explicit_project_touchpoints');
  assert.equal(registry.touchpoints.length, 1);
  assert.equal(registry.touchpoints[0].label, '包装');
  assert.deepEqual(registry.touchpoints[0].taskRoute, {
    deliverableFamily: 'packaging', subtype: 'single_product_display', shot: 'PKG-HERO-SINGLE'
  });
  assert.equal(registry.touchpoints.some((item) => item.id === 'business_card'), false);
});

test('Primary Touchpoint Registry fails open to no default when industry and touchpoints are unknown', () => {
  const registry = resolvePrimaryTouchpoints({
    projectId: 'unknown-project', brandFacts: [{ subjectPath: 'brandFacts.industry', content: 'Unclassified sector', evidenceRefs: ['EV-0000000000000000'] }], businessGoals: []
  });
  assert.equal(registry.sourcePolicy, 'no_default');
  assert.deepEqual(registry.touchpoints, []);
});

test('Intent–Visual Gap Analysis does not invent contradiction without an explicit judgment', () => {
  const truth = {
    projectId: 'gap-project',
    confirmedUserIntent: [{ content: 'Young and direct', subjectPath: 'confirmedUserIntent.tone', evidenceRefs: ['EV-0000000000000001'], confidence: 1, status: 'confirmed' }],
    brandFacts: [], currentVisualPatterns: [{ content: 'Dense border', subjectPath: 'currentVisualPatterns.graphicBehavior', evidenceRefs: ['EV-0000000000000002'], confidence: 0.8, status: 'observed' }], conflicts: []
  };
  const safe = analyzeIntentVisualGap(truth);
  assert.equal(safe.underExpressed.length, 1);
  assert.equal(safe.misaligned.length, 0);
  const judged = analyzeIntentVisualGap(truth, { judgments: [{
    classification: 'misaligned', intent: 'Young and direct', currentExpression: 'Dense border',
    rationale: 'The current hierarchy communicates ceremony rather than direct access.',
    evidenceRefs: ['EV-0000000000000001', 'EV-0000000000000002']
  }] });
  assert.equal(judged.misaligned.length, 1);
  assert.equal(judged.misaligned[0].source, 'explicit_judgment');
});

test('Existing Visual System Audit standardizes 11 dimensions without fabricating quality judgments', () => {
  const analysis = buildCreativeIntelligenceOpportunityAnalysis({
    projectId: 'project-opportunity', documentContext, documentConfirmed: true, visualContext, generatedAt
  });
  const audit = auditExistingVisualSystem(analysis.artifacts.projectTruthModel);
  assert.equal(audit.dimensions.length, 11);
  assert.equal(audit.dimensions.find((item) => item.dimension === 'identity').status, 'observed');
  assert.equal(audit.dimensions.find((item) => item.dimension === 'color').status, 'observed');
  assert.equal(audit.dimensions.find((item) => item.dimension === 'spatial').status, 'missing');
  assert.equal(audit.summary.humanJudgmentRequired, true);
});

test('Category Opportunity Map exposes preservation, reconstruction, negative, ownership and routing evidence', () => {
  const analysis = buildCreativeIntelligenceOpportunityAnalysis({
    projectId: 'project-opportunity', documentContext, documentConfirmed: true, visualContext, generatedAt,
    gapJudgments: [{
      classification: 'misaligned', intent: 'Young and direct', currentExpression: 'Dense decorative border',
      rationale: 'The current expression is more ceremonial than direct.', evidenceRefs: []
    }]
  });
  const map = analysis.artifacts.categoryOpportunityMap;
  assert.ok(map.categoryContext.some((item) => item.content === 'Consumer goods'));
  assert.ok(map.mustKeep.some((item) => item.content === 'Wordmark geometry'));
  assert.ok(map.canReconstruct.some((item) => item.content === 'Dense decorative border'));
  assert.ok(map.shouldAvoid.some((item) => item.content === 'Excessive decorative stacking'));
  assert.ok(map.canOwn.some((item) => item.content === 'Build a young and direct expression'));
  assert.equal(map.primaryTouchpoints.length, 1);
  assert.deepEqual(map.negativeRuleCandidates.map((item) => item.content), map.shouldAvoid.map((item) => item.content));
});

test('Phase 2 analysis satisfies every published artifact schema', async () => {
  const names = [
    'evidence-ledger.schema.json', 'project-truth-model.schema.json',
    'existing-visual-system-audit.schema.json', 'intent-visual-gap-analysis.schema.json',
    'primary-touchpoint-registry.schema.json', 'category-opportunity-map.schema.json',
    'shadow-output.schema.json'
  ];
  const schemas = await Promise.all(names.map(loadSchema));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  schemas.slice(0, -1).forEach((schema) => ajv.addSchema(schema));
  const validate = ajv.compile(schemas.at(-1));
  const analysis = buildCreativeIntelligenceOpportunityAnalysis({
    projectId: 'project-opportunity', documentContext, documentConfirmed: true, visualContext, generatedAt
  });
  assert.equal(validate(analysis), true, JSON.stringify(validate.errors));
});
