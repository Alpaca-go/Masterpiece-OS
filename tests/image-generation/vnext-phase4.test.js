import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileShortChainCorrectionPrompt,
  validateShortChainDeliverableEvidence,
} from '@masterpiece/image-generation-runtime/generation/index.js';

const taskContract = {
  schemaVersion: '1.0',
  taskId: 'task-space-reception',
  projectId: 'project-1',
  deliverableFamily: 'space',
  subtype: 'reception',
  shot: 'entrance_view',
  count: 1,
  aspectRatio: '16:9',
  currentInstruction: 'Create a real reception interior.',
  mustInclude: ['reception desk'],
  mustAvoid: ['VI display board'],
  referenceAssetIds: [],
  createdAt: '2026-07-29T00:00:00.000Z',
};

test('Phase 4 classifies a VI board returned for a space task as a hard mismatch', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'vi',
      detectedSubtype: 'business_card',
      visibleEvidence: ['business card', 'letterhead', 'logo board'],
      missingRequiredItems: ['floor/wall/ceiling enclosure', 'reception desk'],
      forbiddenItemsFound: ['VI display board'],
      lockedAssetViolations: [],
      brandMatch: 'matched',
    },
  });
  assert.equal(validation.status, 'failed');
  assert.deepEqual(validation.mismatchTypes, [
    'wrong_family',
    'missing_required_structure',
    'forbidden_content',
  ]);
  assert.equal(validation.retryRecommended, true);
});

test('Phase 4 refuses to self-certify an output without visible image evidence', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'unknown',
      visibleEvidence: [],
    },
  });
  assert.equal(validation.status, 'unverified');
  assert.equal(validation.retryRecommended, false);
});

test('Phase 4 correction prompt preserves original prompt and adds one explicit repair block', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'vi',
      detectedSubtype: 'business_card',
      visibleEvidence: ['business card'],
      missingRequiredItems: ['reception desk'],
      forbiddenItemsFound: ['VI display board'],
      lockedAssetViolations: [],
      brandMatch: 'matched',
    },
  });
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt: 'ORIGINAL PROMPT',
    taskContract,
    validation,
  });
  assert.match(correction, /^ORIGINAL PROMPT/u);
  assert.match(correction, /must be space/u);
  assert.match(correction, /reception desk/u);
  assert.match(correction, /Do not show: VI display board/u);
  assert.equal((correction.match(/一次性对题纠偏/gu) ?? []).length, 1);
});
