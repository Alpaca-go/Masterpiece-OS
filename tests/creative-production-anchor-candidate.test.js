import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  attachAnchorCandidateOutput,
  createAnchorCandidateTask,
  failAnchorCandidateGeneration,
  retryAnchorCandidate,
  reviewAnchorCandidate,
  supersedeAnchorCandidate,
  transitionAnchorCandidate,
} from '../packages/creative-production-runtime/src/anchor-candidate.js';

const NOW = '2026-07-28T00:00:00.000Z';
const styleProfile = { id: 'style-1', version: '1.0.0', status: 'confirmed' };

function evaluation(score = 4) {
  return {
    color: { score, notes: '色彩关系成立' },
    composition: { score, notes: '构图层级成立' },
    material: { score, notes: '材质表达成立' },
    lighting: { score, notes: '光线方向成立' },
    graphic_language: { score, notes: '图形语言成立' },
    brand_assets: { score, notes: '品牌资产正确' },
    overall_tone: { score, notes: '整体气质正确' },
    evaluatedAt: NOW,
  };
}

test('Anchor Candidate generated flow reaches accepted only after seven-dimension review', () => {
  const ready = createAnchorCandidateTask({
    projectId: 'project-1',
    styleProfile,
    lockedAssetIds: ['lock-1'],
  }, NOW);
  const generating = transitionAnchorCandidate(ready, 'generating', NOW);
  const pending = attachAnchorCandidateOutput(generating, {
    source: 'generated',
    generationRunId: 'run-1',
    imagePath: 'image-generation/run-1/images/image-01.png',
    thumbnailPath: 'anchors/candidates/candidate-1/thumbnail.webp',
  }, NOW);
  const accepted = reviewAnchorCandidate(pending, {
    action: 'accept_primary',
    feedback: '方向成立',
    evaluation: evaluation(),
  }, NOW);
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.generationRunId, 'run-1');
  assert.equal(accepted.reviewHistory.length, 1);
});

test('Anchor Candidate supports external upload, revision and independent retry lineage', () => {
  const ready = createAnchorCandidateTask({ projectId: 'project-1', styleProfile }, NOW);
  const pending = attachAnchorCandidateOutput(ready, {
    source: 'uploaded',
    imagePath: 'anchors/candidates/upload/image.webp',
  }, NOW);
  const revision = reviewAnchorCandidate(pending, {
    action: 'minor_adjustment',
    feedback: '降低背景密度',
    evaluation: evaluation(3),
  }, NOW);
  const retried = retryAnchorCandidate(revision, NOW);
  assert.equal(revision.status, 'revision_required');
  assert.equal(retried.status, 'task_ready');
  assert.equal(retried.revision, 2);
  assert.equal(retried.parentCandidateId, revision.id);
  assert.notEqual(retried.id, revision.id);
});

test('Anchor Candidate records generation failure and creates a retry revision', () => {
  const ready = createAnchorCandidateTask({ projectId: 'project-1', styleProfile }, NOW);
  const generating = transitionAnchorCandidate(ready, 'generating', NOW);
  const failed = failAnchorCandidateGeneration(generating, {
    errorCode: 'IMAGE_DOWNLOAD_FAILED',
    errorMessage: '下载失败',
  }, NOW);
  assert.equal(failed.status, 'generation_failed');
  assert.deepEqual(failed.generationFailure, {
    errorCode: 'IMAGE_DOWNLOAD_FAILED',
    errorMessage: '下载失败',
    failedAt: NOW,
  });
  const retried = retryAnchorCandidate(failed, NOW);
  assert.equal(retried.status, 'task_ready');
  assert.equal(retried.revision, 2);
  assert.equal(retried.parentCandidateId, failed.id);
});

test('Anchor Candidate Set keeps comparable variants and supersedes non-selected siblings', () => {
  const candidates = [1, 2, 3].map((candidateIndex) =>
    createAnchorCandidateTask({
      projectId: 'project-1',
      styleProfile,
      candidateSetId: 'anchor-set-1',
      candidateIndex,
      candidateCount: 3,
    }, NOW));
  const pending = candidates.map((candidate, index) =>
    attachAnchorCandidateOutput(candidate, {
      source: 'uploaded',
      imagePath: `anchors/candidates/${index + 1}/image.webp`,
    }, NOW));
  const selected = reviewAnchorCandidate(pending[1], {
    action: 'accept_primary',
    feedback: '第二个候选最适合作为长期视觉基准',
    evaluation: evaluation(),
  }, NOW);
  const superseded = [
    supersedeAnchorCandidate(pending[0], selected.id, NOW),
    supersedeAnchorCandidate(pending[2], selected.id, NOW),
  ];
  assert.equal(selected.status, 'accepted');
  assert.deepEqual(superseded.map((item) => item.status), ['superseded', 'superseded']);
  assert.ok(superseded.every((item) =>
    item.reviewHistory.at(-1).action === 'supersede'));
  assert.throws(() => createAnchorCandidateTask({
    projectId: 'project-1',
    styleProfile,
    candidateSetId: 'broken-set',
    candidateIndex: 3,
    candidateCount: 2,
  }, NOW), { code: 'ANCHOR_CANDIDATE_INVALID' });
});

test('Anchor acceptance gate blocks weak brand assets and invalid transitions', () => {
  const ready = createAnchorCandidateTask({ projectId: 'project-1', styleProfile }, NOW);
  assert.throws(() => transitionAnchorCandidate(ready, 'accepted', NOW), {
    code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
  });
  const pending = attachAnchorCandidateOutput(ready, {
    source: 'uploaded',
    imagePath: 'anchors/image.webp',
  }, NOW);
  const weak = evaluation();
  weak.brand_assets.score = 2;
  assert.throws(() => reviewAnchorCandidate(pending, {
    action: 'accept_primary',
    feedback: '',
    evaluation: weak,
  }, NOW), { code: 'ANCHOR_ACCEPTANCE_GATE_FAILED' });
});

test('Anchor Candidate requires confirmed Style Profile and project-relative paths', () => {
  assert.throws(() => createAnchorCandidateTask({
    projectId: 'project-1',
    styleProfile: { ...styleProfile, status: 'draft' },
  }, NOW), { code: 'STYLE_PROFILE_NOT_CONFIRMED' });
  const ready = createAnchorCandidateTask({ projectId: 'project-1', styleProfile }, NOW);
  assert.throws(() => attachAnchorCandidateOutput(ready, {
    source: 'uploaded',
    imagePath: 'C:/outside/image.png',
  }, NOW), { code: 'ANCHOR_CANDIDATE_PATH_INVALID' });
});

test('Anchor Candidate JSON Schema is closed and fixes outputCount to one', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/anchor-candidate.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.task.properties.outputCount.const, 1);
  assert.equal(schema.properties.evaluation.required.length, 8);
  assert.ok(schema.properties.status.enum.includes('generation_failed'));
  assert.ok(schema.properties.status.enum.includes('superseded'));
  assert.deepEqual(schema.dependentRequired.candidateSetId, ['candidateIndex', 'candidateCount']);
  assert.deepEqual(schema.allOf[0].then.required, ['generationFailure']);
});
