import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileVNextCorrectionPrompt,
  validateVNextDeliverableEvidence,
} from '../../packages/image-generation-runtime/src/vnext/index.js';

const taskContract = {
  schemaVersion: '1.0',
  taskId: 'task-space-reception',
  projectId: 'project-1',
  deliverableFamily: 'space',
  subtype: 'reception',
  shot: 'front',
  count: 1,
  aspectRatio: '16:9',
  currentInstruction: 'Create a complete reception without a central display device.',
  mustInclude: ['reception desk', 'clear circulation'],
  mustAvoid: ['central display device'],
  referenceAssetIds: [],
  logoUsageMode: 'blank_area',
  createdAt: '2026-07-30T00:00:00.000Z',
};

test('result validator separates scene, brand tone, logo/text, locked asset, and quality failures', () => {
  const validation = validateVNextDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-calibration',
    imageId: 'image-calibration',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['partial reception corner', 'purple neon wall', 'pseudo-text signage'],
      missingRequiredItems: [],
      forbiddenItemsFound: [],
      lockedAssetViolations: ['confirmed layered motif is absent'],
      brandMatch: 'matched',
      brandToneMatch: 'mismatched',
      sceneCompleteness: 'incomplete',
      logoTextStatus: 'incorrect',
      qualityIssues: ['warped ceiling junction'],
    },
  });
  assert.equal(validation.status, 'failed');
  assert.deepEqual(validation.mismatchTypes, [
    'locked_asset_violation',
    'brand_tone_mismatch',
    'scene_incomplete',
    'logo_text_error',
    'quality_issue',
  ]);
  assert.equal(validation.retryRecommended, true);
  const correction = compileVNextCorrectionPrompt({
    originalPrompt: 'ORIGINAL PROMPT',
    taskContract,
    validation,
  });
  assert.match(correction, /complete, continuous and functionally legible scene/u);
  assert.match(correction, /Remove every logo, letter, word and pseudo-text/u);
  assert.match(correction, /warped ceiling junction/u);
});
