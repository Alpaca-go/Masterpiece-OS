import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  adaptDocumentContext,
  adaptVisualScheme,
  buildCreativeIntelligenceShadow,
  buildEvidenceLedger,
  buildProjectTruthModel,
  validateEvidenceLedger,
  validateProjectTruthModel
} from '@masterpiece/creative-intelligence-runtime';

const generatedAt = '2026-08-03T08:00:00.000Z';

const documentContext = {
  schemaVersion: '1.0',
  sourceRunId: 'document-run-01',
  generatedAt,
  brandName: 'Northstar',
  industry: 'Hospitality',
  products: ['Boutique hotel'],
  services: ['Concierge'],
  targetAudience: ['Design-aware travelers'],
  pricePositioning: 'Premium',
  businessModel: 'Direct booking',
  brandPersonality: ['Quiet confidence'],
  visualPreferences: ['Tactile restraint'],
  requiredTouchpoints: ['Lobby signage'],
  lockedFacts: ['Keep the wordmark'],
  prohibitedDirections: ['Generic luxury gold'],
  unknownFields: ['Opening season'],
  evidence: [
    { field: 'brandName', documentId: 'doc-01', filename: 'strategy.md', section: 'Brand', summary: 'Northstar' },
    { field: 'industry', documentId: 'doc-01', filename: 'strategy.md', page: 2, summary: 'Hospitality' }
  ],
  sourceDocuments: [
    { documentId: 'doc-01', filename: 'strategy.md', sourceType: 'markdown', characterCount: 1200 }
  ]
};

const visualContext = {
  schemaVersion: '2.0',
  projectId: 'project-01',
  version: 1,
  generatedAt,
  brandCore: {
    name: 'Northstar',
    industry: 'Hospitality',
    brandRole: 'A calm urban refuge',
    audience: ['Design-aware travelers']
  },
  lockedAssets: {
    logoAssetIds: ['asset-logo'],
    brandNameLocked: true,
    confirmedColors: ['Deep green'],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: ['asset-logo'],
    mustPreserve: ['Wordmark geometry']
  },
  visualIdentity: {
    tone: ['Restrained'],
    colorBehavior: ['Low-saturation fields'],
    graphicBehavior: ['Fine linear rhythm'],
    materialBehavior: ['Brushed metal'],
    compositionBehavior: ['Generous negative space'],
    lightingBehavior: ['Soft indirect light']
  },
  styleBoundaries: {
    mustAvoid: ['Glossy purple gradients'],
    uncertainItems: ['Photography temperature']
  },
  confirmedDecisions: [
    { id: 'intent-01', value: 'Prioritize spatial wayfinding', source: 'user_confirmation', confirmedAt: generatedAt }
  ],
  sourceAssetRefs: [
    { assetId: 'asset-logo', name: 'Northstar wordmark', relativePath: 'assets/logo.svg', role: 'logo', lockedAssetType: 'logo' }
  ],
  provenance: {
    builderId: 'project-context-short-chain',
    builderVersion: '1.0.0',
    sourceKinds: ['project_record', 'original_asset', 'user_confirmation'],
    sourceFingerprint: 'fixture'
  }
};

async function loadSchema(name) {
  return JSON.parse(await readFile(new URL(`../../../schemas/creative-intelligence-v2/${name}`, import.meta.url), 'utf8'));
}

test('Document and Visual Scheme adapters preserve provenance and evidence classes', () => {
  const document = adaptDocumentContext(documentContext, { confirmed: true });
  const visual = adaptVisualScheme(visualContext);
  const brand = document.find((item) => item.subjectPath === 'brandFacts.name');
  const asset = visual.find((item) => item.subjectPath === 'observedVisualAssets.logo');
  const intent = visual.find((item) => item.evidenceType === 'user_intent');

  assert.equal(brand.sources[0].sourceId, 'doc-01');
  assert.equal(brand.sources[0].location, 'Brand');
  assert.equal(asset.sources[0].sourceType, 'image');
  assert.equal(asset.sources[0].sourceId, 'asset-logo');
  assert.equal(intent.status, 'confirmed');
});

test('Evidence Ledger deduplicates a claim without losing corroborating sources', () => {
  const ledger = buildEvidenceLedger({
    projectId: 'project-01',
    generatedAt,
    candidates: [
      {
        evidenceType: 'document_fact', subjectPath: 'brandFacts.name', claimMode: 'one', content: 'Northstar',
        confidence: 0.8, status: 'unconfirmed', sources: [{ sourceType: 'document', sourceId: 'doc-01' }]
      },
      {
        evidenceType: 'document_fact', subjectPath: 'brandFacts.name', claimMode: 'one', content: ' Northstar ',
        confidence: 0.95, status: 'confirmed', sources: [{ sourceType: 'user', sourceId: 'confirmation-01' }]
      }
    ]
  });
  assert.equal(ledger.evidence.length, 1);
  assert.equal(ledger.evidence[0].sources.length, 2);
  assert.equal(ledger.evidence[0].status, 'confirmed');
  assert.equal(ledger.evidence[0].statusHistory.length, 2);
  assert.deepEqual(validateEvidenceLedger(ledger), []);
});

test('Project Truth Model keeps assumptions out of facts and exposes scalar conflicts', () => {
  const ledger = buildEvidenceLedger({
    projectId: 'project-01',
    generatedAt,
    candidates: [
      {
        evidenceType: 'document_fact', subjectPath: 'brandFacts.industry', claimMode: 'one', content: 'Hospitality',
        confidence: 0.9, status: 'confirmed', sources: [{ sourceType: 'document', sourceId: 'doc-01' }]
      },
      {
        evidenceType: 'document_fact', subjectPath: 'brandFacts.industry', claimMode: 'one', content: 'Real estate',
        confidence: 0.8, status: 'unconfirmed', sources: [{ sourceType: 'system', sourceId: 'project-context:project-01' }]
      },
      {
        evidenceType: 'system_assumption', subjectPath: 'brandFacts.name', claimMode: 'one', content: 'Maybe Northstar',
        confidence: 0.2, status: 'unconfirmed', sources: [{ sourceType: 'system', sourceId: 'inference-01' }]
      }
    ]
  });
  const result = buildProjectTruthModel(ledger, { generatedAt });
  assert.equal(result.truthModel.conflicts.length, 1);
  assert.equal(result.truthModel.assumptions.length, 1);
  assert.equal(result.truthModel.brandFacts.some((claim) => claim.content === 'Maybe Northstar'), false);
  assert.equal(result.ledger.evidence.some((item) => item.evidenceType === 'source_conflict'), true);
  assert.deepEqual(validateProjectTruthModel(result.truthModel), []);
});

test('Joint Shadow Mode is read-only toward downstream production artifacts', () => {
  const shadow = buildCreativeIntelligenceShadow({
    projectId: 'project-01',
    documentContext,
    documentConfirmed: true,
    visualContext,
    generatedAt
  });
  assert.equal(shadow.mode, 'joint');
  assert.equal(shadow.status, 'shadow_only');
  assert.equal(shadow.downstreamWritePolicy, 'disabled');
  assert.ok(shadow.artifacts.evidenceLedger.evidence.length > 10);
  assert.equal(shadow.artifacts.projectTruthModel.confirmedUserIntent.length, 1);
  assert.equal(shadow.artifacts.projectTruthModel.observedVisualAssets.length, 1);
});

test('Phase 1 artifacts satisfy their published JSON Schemas', async () => {
  const evidenceSchema = await loadSchema('evidence-ledger.schema.json');
  const truthSchema = await loadSchema('project-truth-model.schema.json');
  const shadowSchema = await loadSchema('shadow-output.schema.json');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(evidenceSchema);
  ajv.addSchema(truthSchema);
  const validateShadow = ajv.compile(shadowSchema);
  const shadow = buildCreativeIntelligenceShadow({
    projectId: 'project-01', documentContext, documentConfirmed: true, visualContext, generatedAt
  });
  assert.equal(validateShadow(shadow), true, JSON.stringify(validateShadow.errors));
});

test('Shadow Mode rejects cross-project visual input', () => {
  assert.throws(
    () => buildCreativeIntelligenceShadow({ projectId: 'another-project', visualContext, generatedAt }),
    (error) => error.code === 'SHADOW_PROJECT_MISMATCH'
  );
});
