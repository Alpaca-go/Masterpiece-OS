import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CreativeWorkflowState } from '@masterpiece/project-contracts/index.ts';
import { createAnchorCandidateService } from '@masterpiece/runtime-core/application/anchor-candidate-service.ts';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function evaluation() {
  const item = { score: 4 as const, notes: '符合方向' };
  return {
    color: item,
    composition: item,
    material: item,
    lighting: item,
    graphic_language: item,
    brand_assets: item,
    overall_tone: item,
    evaluatedAt: new Date().toISOString(),
  };
}

test('Anchor Candidate service persists upload, review, retry and advances Session monotonically', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'anchor-candidate-service-'));
  const projectId = 'project-1';
  const projectRoot = path.join(temp, 'project');
  const upload = path.join(temp, 'anchor.png');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(upload, PNG);
  let workflowState: CreativeWorkflowState = 'STYLE_PROFILE_CREATED';
  const transitions: CreativeWorkflowState[] = [];
  const decisions: string[] = [];
  const projects = { paths: async () => ({ root: projectRoot }) };
  const sessions = {
    create: async () => ({ workflowState }),
    transition: async (_projectId: string, next: CreativeWorkflowState) => {
      workflowState = next;
      transitions.push(next);
    },
    recordDecision: async (_projectId: string, decision: { summary: string }) => {
      decisions.push(decision.summary);
    },
  };
  const styles = {
    getActive: async () => ({ id: 'style-1', version: '1.0.0', status: 'confirmed' }),
  };
  const locks = { list: async () => [{ id: 'lock-1' }] };
  try {
    const service = createAnchorCandidateService(
      projects as never,
      sessions as never,
      styles as never,
      locks as never,
    );
    const ready = await service.create(projectId);
    const pending = await service.upload(projectId, ready.id, upload);
    assert.equal(pending.status, 'pending_review');
    assert.equal(pending.source, 'uploaded');
    await fs.access(path.join(projectRoot, pending.imagePath!));
    await fs.access(path.join(projectRoot, pending.thumbnailPath!));

    const revised = await service.review(projectId, pending.id, {
      action: 'retry',
      feedback: '重新平衡构图',
      evaluation: evaluation(),
    });
    const retried = await service.retry(projectId, revised.id);
    assert.equal(retried.parentCandidateId, revised.id);
    assert.equal((await service.list(projectId)).length, 2);
    assert.deepEqual(transitions, ['PRIMARY_ANCHOR_READY', 'PRIMARY_ANCHOR_PENDING_REVIEW']);
    assert.equal(decisions.length, 1);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('selecting one Candidate Set member supersedes its comparable siblings', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'anchor-candidate-set-'));
  const projectId = 'project-set';
  const projectRoot = path.join(temp, 'project');
  const upload = path.join(temp, 'anchor.png');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(upload, PNG);
  let workflowState: CreativeWorkflowState = 'STYLE_PROFILE_CREATED';
  const service = createAnchorCandidateService(
    { paths: async () => ({ root: projectRoot }) } as never,
    {
      create: async () => ({ workflowState }),
      transition: async (_projectId: string, next: CreativeWorkflowState) => {
        workflowState = next;
      },
      recordDecision: async () => undefined,
    } as never,
    {
      getActive: async () => ({ id: 'style-1', version: '1.0.0', status: 'confirmed' }),
    } as never,
    { list: async () => [{ id: 'lock-1' }] } as never,
  );
  try {
    const ready = await Promise.all([1, 2, 3].map((candidateIndex) =>
      service.create(projectId, {
        candidateSetId: 'anchor-set-1',
        candidateIndex,
        candidateCount: 3,
      })));
    const pending = await Promise.all(ready.map((candidate) =>
      service.upload(projectId, candidate.id, upload)));
    const selected = await service.review(projectId, pending[1]!.id, {
      action: 'accept_primary',
      feedback: '人工选择第二个候选',
      evaluation: evaluation(),
    });
    const candidates = await service.list(projectId);
    assert.equal(selected.status, 'accepted');
    assert.equal(candidates.filter((item) => item.status === 'accepted').length, 1);
    assert.equal(candidates.filter((item) => item.status === 'superseded').length, 2);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
