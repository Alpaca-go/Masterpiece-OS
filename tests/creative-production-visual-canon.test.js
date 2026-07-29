import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildVisualCanon,
  confirmVisualCanon,
  migrateVisualCanon,
  nextVisualCanonVersion,
} from '../packages/creative-production-runtime/src/visual-canon.js';

const NOW = '2026-07-28T00:00:00.000Z';
const style = {
  id: 'style-1',
  name: 'Primary',
  version: '1.0.0',
  status: 'confirmed',
  styleEssence: {
    keywords: ['东方秩序', '克制'],
    mood: ['安静', '高级'],
    visualPositioning: '以山水层叠隐喻文化传承',
  },
  colorSystem: {
    primary: ['暖橙'],
    secondary: ['米白'],
    neutral: [],
    accent: ['朱砂红'],
    forbiddenColors: ['荧光绿'],
  },
  graphicLanguage: { coreMotifs: ['层叠轮廓'], layoutRhythm: ['十二列网格'] },
  compositionSystem: {
    hierarchy: ['单一焦点'],
    focalPointRules: ['主体居中'],
    croppingRules: [],
    negativeSpace: '上部保留三分之一留白',
  },
  materialAndTexture: {
    materials: ['磨砂纸'],
    surfaceRules: ['细颗粒表面'],
    printFeeling: ['压凹工艺'],
    renderingRules: [],
    forbiddenTextures: ['廉价塑料'],
  },
  lightingSystem: {
    type: '柔和侧光',
    contrast: '中低对比',
    shadow: '自然软阴影',
    temperature: '暖中性',
  },
  forbiddenVariations: ['复制参考品牌图形'],
  promptComponents: { required: ['暖色层次'] },
  allowedVariations: ['触点构图可变化'],
};
const anchor = {
  id: 'anchor-1',
  status: 'accepted',
  imagePath: 'anchors/candidates/anchor-1/image.webp',
  lockedAssetIds: ['lock-critical'],
};
const lock = { id: 'lock-critical', priority: 'critical' };

test('Visual Canon builds one Primary plus supporting images and reports soft conflicts', () => {
  const canon = buildVisualCanon({
    projectId: 'project-1',
    styleProfile: style,
    lockedAssets: [lock],
    primary: {
      anchor,
      observations: {
        colors: ['暖橙'],
        materials: ['磨砂纸'],
        lighting: ['柔和侧光'],
        graphicLanguage: ['抽象线条'],
        compositionDensity: '疏朗',
      },
    },
    supporting: [{
      anchor: { ...anchor, id: 'anchor-2', imagePath: 'anchors/candidates/anchor-2/image.webp' },
      type: 'packaging',
      observations: {
        lighting: ['均匀顶光'],
        compositionDensity: '紧凑',
        preservedLockedAssetIds: ['lock-critical'],
      },
    }],
    industryAttributes: ['东方生活美学'],
  }, NOW);
  assert.equal(canon.canonImages.length, 2);
  assert.equal(canon.canonImages.filter((item) => item.priority === 'primary').length, 1);
  assert.ok(canon.conflicts.some((item) => item.dimension === 'lighting' && item.severity === 'warning'));
  assert.deepEqual(canon.visualDNA.industryAttributes, ['东方生活美学']);
  assert.equal(canon.visualDNA.coreVisualMetaphor, '以山水层叠隐喻文化传承');
  assert.ok(canon.colorSystem.primary.includes('暖橙'));
  assert.ok(canon.materialSystem.craftRules.includes('压凹工艺'));
  assert.ok(canon.lightingSystem.direction.includes('柔和侧光'));
  assert.ok(canon.compositionSystem.gridRules.includes('十二列网格'));
  assert.ok(canon.spatialSystem.displayRules.includes('单一焦点'));
  assert.equal(confirmVisualCanon(canon, NOW).status, 'confirmed');
});

test('Visual Canon blocks forbidden style values and missing critical Locked Assets', () => {
  const canon = buildVisualCanon({
    projectId: 'project-1',
    styleProfile: style,
    lockedAssets: [lock],
    primary: {
      anchor,
      observations: {
        colors: ['荧光绿'],
        preservedLockedAssetIds: [],
      },
    },
  }, NOW);
  assert.ok(canon.conflicts.filter((item) => item.severity === 'blocking').length >= 2);
  assert.throws(() => confirmVisualCanon(canon, NOW), { code: 'CANON_CONFLICT_BLOCKING' });
});

test('Visual Canon caps images at four and versions deterministically', () => {
  const supporting = Array.from({ length: 4 }, (_, index) => ({
    anchor: { ...anchor, id: `anchor-${index + 2}` },
  }));
  assert.throws(() => buildVisualCanon({
    projectId: 'project-1',
    styleProfile: style,
    lockedAssets: [lock],
    primary: { anchor },
    supporting,
  }, NOW), { code: 'VISUAL_CANON_INVALID' });
  assert.equal(nextVisualCanonVersion('1.2.3'), '1.3.0');
  assert.equal(nextVisualCanonVersion('1.2.3', 'patch'), '1.2.4');
});

test('Visual Canon binds Designer Selection instead of treating the Concept as a provider reference', () => {
  const concept = {
    id: 'concept-space',
    type: 'space',
    status: 'generated',
    imagePath: 'image-generation/run-concept/images/concept.png',
  };
  const canon = buildVisualCanon({
    projectId: 'project-1',
    styleProfile: style,
    lockedAssets: [lock],
    sourceExplorationId: 'exploration-1',
    selectedConceptId: concept.id,
    coreVisualMetaphor: '以安静层叠空间建立品牌体验',
    primary: {
      concept,
      explorationId: 'exploration-1',
      observations: {
        preservedLockedAssetIds: ['lock-critical'],
        spatialStructure: '层叠空间结构',
        displayStrategy: '克制的重点陈列',
      },
    },
  }, NOW);
  assert.equal(canon.sourceExplorationId, 'exploration-1');
  assert.equal(canon.selectedConceptId, 'concept-space');
  assert.equal(canon.canonImages[0].sourceKind, 'visual_concept');
  assert.equal(canon.canonImages[0].sourceConceptId, 'concept-space');
  assert.ok(canon.spatialSystem.structureRules.includes('层叠空间结构'));
  assert.ok(canon.spatialSystem.displayRules.includes('克制的重点陈列'));
});

test('legacy Visual Canon migrates its reusable rule systems without changing identity or version', () => {
  const current = buildVisualCanon({
    projectId: 'project-1',
    styleProfile: style,
    lockedAssets: [lock],
    primary: { anchor },
    industryAttributes: ['东方生活美学'],
  }, NOW);
  const {
    visualDNA: _visualDNA,
    colorSystem: _colorSystem,
    materialSystem: _materialSystem,
    lightingSystem: _lightingSystem,
    compositionSystem: _compositionSystem,
    spatialSystem: _spatialSystem,
    ...legacy
  } = current;
  const migrated = migrateVisualCanon(legacy, {
    styleProfile: style,
    industryAttributes: ['东方生活美学'],
  });
  assert.equal(migrated.id, current.id);
  assert.equal(migrated.version, current.version);
  assert.deepEqual(migrated.visualDNA.industryAttributes, ['东方生活美学']);
  assert.doesNotThrow(() => confirmVisualCanon(migrated, NOW));
});

test('Visual Canon JSON Schema is closed and caps canonImages at four', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/visual-canon.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.canonImages.maxItems, 4);
  for (const field of [
    'visualDNA', 'colorSystem', 'materialSystem', 'lightingSystem', 'compositionSystem',
    'spatialSystem',
  ]) {
    assert.ok(schema.required.includes(field));
    assert.equal(schema.properties[field].additionalProperties, false);
  }
});
