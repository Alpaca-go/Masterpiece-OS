import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeSessionService } from '@masterpiece/runtime-core/application/creative-session-service.ts';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-session-'));
  const projectRoot = path.join(root, 'projects', 'demo-12345678');
  await fs.mkdir(projectRoot, { recursive: true });
  const project = {
    id: '12345678-1234-1234-1234-123456789012',
    brandName: '示例品牌',
    industry: '零售',
    description: '品牌升级',
    lockedFacts: ['Logo 不得修改'],
    assets: [{ id: 'asset-1' }],
  };
  const projects = {
    paths: async () => ({
      root: projectRoot,
      input: path.join(projectRoot, 'input'),
      prepared: path.join(projectRoot, 'prepared'),
      outputs: path.join(projectRoot, 'outputs'),
      runtime: path.join(projectRoot, 'runtime'),
    }),
    get: async () => project,
  };
  return { root, projectRoot, project, projects };
}

test('Creative Session service persists state, decisions and active references across restart', async () => {
  const { root, projectRoot, project, projects } = await fixture();
  try {
    const service = createCreativeSessionService(projects as never);
    const created = await service.create(project.id);
    assert.equal(created.workflowState, 'SESSION_CREATED');
    await service.recordDecision(project.id, {
      type: 'primary_direction',
      summary: '确认主方向',
      outcome: 'confirmed',
      source: 'user',
    });
    await service.setActiveEntity(project.id, 'creative_direction', { id: 'direction-1', version: '1.0.0' });
    await service.setActiveEntity(project.id, 'style_profile', { id: 'style-1', version: '1.0.0' });
    await service.setVisualMigrationReference(project.id, {
      referencePackId: `vmrp-${'a'.repeat(32)}`,
      sourceReferenceAnchorRunId: 'reference-run-1',
      sourceFingerprint: `sha256:${'b'.repeat(64)}`,
    });
    await service.setVisualMigrationCanon(project.id, {
      canonId: `vmc-${'c'.repeat(32)}`,
      canonFingerprint: `sha256:${'d'.repeat(64)}`,
      sourceFingerprint: `sha256:${'e'.repeat(64)}`,
      referencePackId: `vmrp-${'a'.repeat(32)}`,
    });
    await service.transition(project.id, 'STYLE_PROFILE_CREATED', 'Style Profile 已创建');

    const restarted = createCreativeSessionService(projects as never);
    const loaded = await restarted.get(project.id);
    assert.equal(loaded?.activeStyleProfileId, 'style-1');
    assert.equal(loaded?.activeCreativeDirectionId, 'direction-1');
    assert.equal(loaded?.decisions.length, 1);
    assert.equal(loaded?.workflowState, 'STYLE_PROFILE_CREATED');
    assert.equal(loaded?.referencePackId, `vmrp-${'a'.repeat(32)}`);
    assert.equal(loaded?.sourceReferenceAnchorRunId, 'reference-run-1');
    assert.equal(loaded?.visualMigrationCanonId, `vmc-${'c'.repeat(32)}`);
    assert.equal(loaded?.visualMigrationCanonFingerprint, `sha256:${'d'.repeat(64)}`);
    assert.ok((await fs.readFile(path.join(projectRoot, 'logs', 'creative-session.ndjson'), 'utf8')).includes('WORKFLOW_TRANSITION'));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('Creative Session service migrates a legacy session in place without persisted prompts', async () => {
  const { root, projectRoot, project, projects } = await fixture();
  try {
    await fs.writeFile(path.join(projectRoot, 'session.json'), JSON.stringify({
      id: 'legacy',
      projectId: project.id,
      styleProfileId: 'style-old',
      finalGenerationInstruction: 'legacy prompt',
    }));
    const loaded = await createCreativeSessionService(projects as never).get(project.id);
    const persisted = JSON.parse(await fs.readFile(path.join(projectRoot, 'session.json'), 'utf8'));
    assert.equal(loaded?.activeStyleProfileId, 'style-old');
    assert.equal(persisted.finalGenerationInstruction, undefined);
    assert.equal(persisted.schemaVersion, '6.0');
    assert.equal(loaded?.referencePackId, undefined);
    assert.equal(loaded?.visualMigrationCanonId, undefined);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
