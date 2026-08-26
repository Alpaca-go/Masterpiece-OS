import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPackagingTranslation,
  validatePackagingTranslation,
} from '@masterpiece/creative-production-runtime/packaging-translation.js';
import { phase1Packet } from './fixtures/packaging-analysis-context.js';

test('packaging translation preserves packaging decisions and removes spatial language', () => {
  const packet = phase1Packet();
  packet.mediaTranslations.packaging.photographyDirection.push('不要出现接待台与天花');
  const translation = buildPackagingTranslation({ visualDecisionPacket: packet });
  assert.equal(translation.status, 'ready');
  assert.doesNotMatch(JSON.stringify(translation), /接待台|天花/u);
  assert.ok(translation.graphicTranslation[0].packagingExpression.includes('半透明套封'));
});

test('packaging translation blocks when structure evidence is missing', () => {
  const packet = phase1Packet();
  packet.lockedAssets = packet.lockedAssets.filter((item) => item.type !== 'packaging_structure');
  packet.mediaTranslations.packaging.structureStrategy = [];
  const translation = buildPackagingTranslation({ visualDecisionPacket: packet });
  assert.equal(translation.status, 'insufficient');
  assert.ok(translation.missingRequiredFields.includes('structureStrategy'));
});

test('packaging translation validator rejects cross-media language', () => {
  const translation = buildPackagingTranslation({ visualDecisionPacket: phase1Packet() });
  translation.openingExperience.push('入口视角展示空间动线');
  const result = validatePackagingTranslation(translation);
  assert.ok(result.missingRequiredFields.includes('crossMediaLanguage'));
});
