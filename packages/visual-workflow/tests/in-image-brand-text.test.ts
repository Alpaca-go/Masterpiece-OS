import test from 'node:test';
import assert from 'node:assert/strict';
import { createShortChainTaskContract } from '../src/generation-runtime/generation/task-contract.js';
import { validateShortChainDeliverableEvidence } from '../src/generation-runtime/generation/deliverable-validator.js';

const BASE_TASK = {
  projectId: '3b5b03c0-915a-41aa-9c54-4ffaa166ab88',
  deliverableFamily: 'space',
  subtype: 'dining',
  shot: 'three_quarter_wide',
  currentInstruction: '社区小馆室内，暖光，明档可见',
  aspectRatio: '16:9',
  count: 1
};

function evidence(logoTextStatus: string) {
  return {
    detectedFamily: 'space',
    detectedSubtype: 'dining',
    visibleEvidence: ['wooden sign with the brand name', 'open kitchen'],
    brandMatch: 'matched',
    brandToneMatch: 'matched',
    sceneCompleteness: 'complete',
    logoTextStatus
  };
}

test('in_image is a supported logo usage mode', () => {
  const task = createShortChainTaskContract({ ...BASE_TASK, logoUsageMode: 'in_image' });
  assert.equal(task.logoUsageMode, 'in_image');
});

test('in_image passes only when the rendered brand text is correct', () => {
  const task = createShortChainTaskContract({ ...BASE_TASK, logoUsageMode: 'in_image' });
  const result = validateShortChainDeliverableEvidence({
    projectId: task.projectId,
    taskContract: task,
    runId: 'run-in-image',
    imageId: 'image-in-image',
    evidence: evidence('correct')
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.logoIntegrity, 'requires_identity_review');
});

for (const status of ['absent', 'incorrect', 'uncertain']) {
  test(`in_image fails when the brand text is ${status}`, () => {
    const task = createShortChainTaskContract({ ...BASE_TASK, logoUsageMode: 'in_image' });
    const result = validateShortChainDeliverableEvidence({
      projectId: task.projectId,
      taskContract: task,
      runId: 'run-in-image',
      imageId: 'image-in-image',
      evidence: evidence(status)
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.mismatchTypes.includes('logo_text_error'));
  });
}

test('post_composite still accepts a clean blank area', () => {
  const task = createShortChainTaskContract({ ...BASE_TASK, logoUsageMode: 'post_composite' });
  const result = validateShortChainDeliverableEvidence({
    projectId: task.projectId,
    taskContract: task,
    runId: 'run-post',
    imageId: 'image-post',
    evidence: evidence('absent')
  });
  assert.notEqual(result.status, 'failed');
  assert.equal(result.logoIntegrity, 'pending_post_composite');
});
