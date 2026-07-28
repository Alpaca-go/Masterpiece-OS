import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildVisualCanon,
  confirmVisualCanon,
  nextVisualCanonVersion,
} from '../packages/creative-production-runtime/src/visual-canon.js';

const NOW = '2026-07-28T00:00:00.000Z';
const style = {
  id: 'style-1',
  name: 'Primary',
  version: '1.0.0',
  status: 'confirmed',
  colorSystem: { forbiddenColors: ['荧光绿'] },
  materialAndTexture: { forbiddenTextures: ['廉价塑料'] },
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
  }, NOW);
  assert.equal(canon.canonImages.length, 2);
  assert.equal(canon.canonImages.filter((item) => item.priority === 'primary').length, 1);
  assert.ok(canon.conflicts.some((item) => item.dimension === 'lighting' && item.severity === 'warning'));
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

test('Visual Canon JSON Schema is closed and caps canonImages at four', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/visual-canon.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.canonImages.maxItems, 4);
});
