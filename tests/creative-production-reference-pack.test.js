import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  compileReferencePack,
  selectProviderReferencesFromPack,
  validateReferencePack,
} from '../packages/creative-production-runtime/src/reference-pack.js';
import { compileVisualMemory } from '../packages/creative-production-runtime/src/visual-memory.js';

function memoryWithAssets(count = 30) {
  const assets = Array.from({ length: count }, (_, index) => ({
    id: `asset-${String(index).padStart(2, '0')}`,
    relativePath: `asset-${index}.png`,
    mimeType: 'image/png',
    status: 'ready',
  }));
  const reading = assets.map((asset, index) => ({
    assetId: asset.id,
    summary: index >= 24 ? '旧版错误应用' : index === 0 ? 'Logo' : `有效视觉信号 ${index}`,
    recommendedUsage: index >= 24 ? 'exclude'
      : index === 0 ? 'identity_reference'
        : index === 1 ? 'structure_reference'
          : 'reading_only',
  }));
  return compileVisualMemory({
    projectId: 'p1',
    visualContext: {
      generatedAt: '2026-07-28T00:00:00.000Z',
      identity: { industry: '餐饮' },
      currentVisualSystem: {},
      evaluation: { visualProblems: [] },
    },
    understanding: {
      generatedAt: '2026-07-28T00:01:00.000Z',
      projectIdentity: { industry: '餐饮' },
      valuableAssets: [],
      currentProblems: [],
      upgradePrinciples: [],
      oldPatternsToAvoid: [],
      assetReadingSummary: reading,
    },
    creativeDirection: {
      id: 'd1',
      version: '1.0.0',
      brandReposition: '现代餐饮',
      visualWorld: '克制',
      creativeConcept: '温度',
      primaryConcept: '温度',
      visualKeywords: [],
      colorStrategy: '',
      materialStrategy: '',
      compositionStrategy: '',
      photographyStrategy: '',
      visualMechanism: '',
      designStrategy: '',
      oldVisualProblems: [],
      keepAssets: [],
      thingsToKeep: [],
      transformAssets: [],
      removeAssets: [],
      thingsToRemove: [],
      generationRules: [],
    },
    lockedAssets: [{
      id: 'logo-lock',
      type: 'logo',
      name: 'Logo',
      rule: 'Logo 原样保留',
      sourceAssetId: 'asset-00',
    }, {
      id: 'structure-lock',
      type: 'packaging_structure',
      name: '包装结构',
      rule: '结构保持',
      sourceAssetId: 'asset-01',
    }],
    assets,
  });
}

test('Reference Selection compresses 30 inputs to a diverse 3–5 image generation pool', () => {
  const pack = compileReferencePack({
    visualMemory: memoryWithAssets(),
    anchors: [{
      asset_id: 'primary-anchor',
      source_path: 'image-generation/run/images/image-01.png',
      rationale: 'confirmed canon',
      signals: ['spatial', 'primary'],
    }],
  });
  assert.equal(validateReferencePack(pack), pack);
  assert.equal(pack.selection.input_count, 30);
  assert.ok(pack.items.length >= 3 && pack.items.length <= 5);
  assert.equal(pack.selection.status, 'ready');
  assert.ok(pack.items.some((item) => item.role === 'anchor'));
  assert.ok(pack.items.some((item) => item.role === 'locked'));
  assert.ok(pack.items.some((item) => item.role === 'style'));
  assert.ok(pack.excluded.some((item) => item.asset_id === 'asset-29'));
});

test('Provider selection never sends Anchor or old style images and keeps only task-required locked assets', () => {
  const pack = compileReferencePack({
    visualMemory: memoryWithAssets(),
    anchors: [{
      asset_id: 'primary-anchor',
      source_path: 'image-generation/run/images/image-01.png',
      rationale: 'confirmed canon',
      signals: ['spatial', 'primary'],
    }],
  });
  const spatial = selectProviderReferencesFromPack(pack, 'interior_scene');
  const packaging = selectProviderReferencesFromPack(pack, 'packaging_render');
  const vi = selectProviderReferencesFromPack(pack, 'vi_application');
  assert.deepEqual(spatial, []);
  assert.deepEqual(packaging.map((item) => item.role), ['locked']);
  assert.ok(packaging.every((item) => item.role !== 'style' && item.role !== 'anchor'));
  assert.deepEqual(vi.map((item) => item.role), ['locked']);
});

test('Reference Pack schema is closed and caps the generation pool at five', () => {
  const schema = JSON.parse(fs.readFileSync(
    new URL('../schemas/creative-production/reference-pack.schema.json', import.meta.url),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.items.maxItems, 5);
});
