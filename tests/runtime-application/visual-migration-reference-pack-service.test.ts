import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualMigrationReferencePackService } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-service.ts';

const PNG_A = Buffer.from('89504e470d0a1a0a01020304', 'hex');
const PNG_B = Buffer.from('89504e470d0a1a0a05060708', 'hex');

async function fixture(overrides: { decision?: string; status?: string; runProjectId?: string } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vm1-'));
  const projectRoot = path.join(root, 'project');
  const runRoot = path.join(root, 'reference-run');
  const sourceRoot = path.join(runRoot, 'input', 'reference-assets');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.writeFile(path.join(sourceRoot, '01-first.png'), PNG_A);
  await fs.writeFile(path.join(sourceRoot, '02-second.png'), PNG_B);
  const run = {
    id: 'run-1',
    projectId: overrides.runProjectId ?? 'project-1',
    decision: overrides.decision ?? 'approved',
    status: overrides.status ?? 'completed',
    referenceAssetNames: ['first.png', 'second.png'],
  };
  const projects = { paths: async () => ({ root: projectRoot }) };
  const referenceAnchors = {
    getRun: async () => run,
    runRoot: async () => runRoot,
    getCapsule: async () => ({ schemaVersion: '1.0', sourceRunId: 'run-1' }),
    getBrief: async () => '# Stable Anchor Brief',
  };
  const service = createVisualMigrationReferencePackService(projects as never, referenceAnchors as never);
  return { root, projectRoot, runRoot, sourceRoot, service, projects, referenceAnchors };
}

test('VM-1 handoff creates exactly one immutable production pack with verified copies', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const created = await f.service.createOrGet('project-1', 'run-1');
  assert.equal(created.created, true);
  assert.equal(created.manifest.references.length, 2);
  assert.equal(created.manifest.projectId, 'project-1');
  const packRoot = path.join(f.projectRoot, 'visual-migration', 'reference-packs');
  const packs = (await fs.readdir(packRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.equal(packs.length, 1);
  for (const reference of created.references) {
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(reference.absolutePath)).digest('hex'), reference.sha256);
  }
});

test('VM-1 rejects non-approved, terminal-invalid, and project-mismatched runs', async (t) => {
  for (const state of [
    { decision: 'pending', status: 'awaiting_decision' },
    { decision: 'rejected', status: 'rejected' },
    { decision: 'approved', status: 'failed' },
    { decision: 'approved', status: 'cancelled' },
    { decision: 'approved', status: 'completed', runProjectId: 'project-other' },
  ]) {
    const f = await fixture(state);
    t.after(() => fs.rm(f.root, { recursive: true, force: true }));
    await assert.rejects(() => f.service.createOrGet('project-1', 'run-1'));
    assert.equal(await fs.stat(path.join(f.projectRoot, 'visual-migration')).then(() => true).catch(() => false), false);
  }
});

test('VM-1 handoff is idempotent for an unchanged approved run', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet('project-1', 'run-1');
  const second = await f.service.createOrGet('project-1', 'run-1');
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.manifest.referencePackId, first.manifest.referencePackId);
  const entries = await fs.readdir(path.join(f.projectRoot, 'visual-migration', 'reference-packs'));
  assert.equal(entries.filter((entry) => entry.startsWith('vmrp-')).length, 1);
});

test('VM-1 resolves after runtime restart and no longer depends on the source run', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet('project-1', 'run-1');
  await fs.rm(f.sourceRoot, { recursive: true, force: true });
  const restarted = createVisualMigrationReferencePackService(f.projects as never, f.referenceAnchors as never);
  const resolved = await restarted.resolve('project-1', first.manifest.referencePackId);
  assert.equal(resolved.references.length, 2);
  assert.deepEqual(await fs.readFile(resolved.references[0]!.absolutePath), PNG_A);
});

test('VM-1 detects tampering in a production-owned reference copy', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const created = await f.service.createOrGet('project-1', 'run-1');
  await fs.writeFile(created.references[0]!.absolutePath, Buffer.from('tampered'));
  await assert.rejects(
    () => f.service.resolve('project-1', created.manifest.referencePackId),
    { code: 'VISUAL_MIGRATION_REFERENCE_PACK_INTEGRITY_FAILED' },
  );
});

test('VM-1 refuses source mutation instead of overwriting an immutable pack', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  await f.service.createOrGet('project-1', 'run-1');
  await fs.writeFile(path.join(f.sourceRoot, '01-first.png'), Buffer.from('changed-source'));
  await assert.rejects(
    () => f.service.createOrGet('project-1', 'run-1'),
    { code: 'VISUAL_MIGRATION_REFERENCE_SOURCE_MUTATED' },
  );
});
