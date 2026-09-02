import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import type { CreativeSessionService } from '@masterpiece/runtime-core/application/creative-session-service.ts';
import type { LockedAssetsService } from '@masterpiece/runtime-core/application/locked-assets-service.ts';
import type { VisualMigrationCanonService } from '@masterpiece/runtime-core/application/visual-migration-canon-service.ts';
import { createVisualMigrationReferencePolicyService } from '@masterpiece/runtime-core/application/visual-migration-reference-policy-service.ts';
import { policyFixture, PROJECT_ID, referenceTask } from './visual-migration-reference-policy-fixture.ts';

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vm3-policy-'));
  const fixture = policyFixture();
  let canonAvailable = true;
  let packAvailable = true;
  const projects = {
    paths: async () => ({ root }),
    get: async () => ({
      id: PROJECT_ID,
      assets: [{ id: 'logo-source', mimeType: 'image/png', status: 'ready' }],
    }),
  } as unknown as ProjectStore;
  const sessions = {
    get: async () => ({
      visualMigrationCanonId: fixture.canon.canonId,
      visualMigrationCanonFingerprint: fixture.canon.canonFingerprint,
      visualMigrationCanonSourceFingerprint: fixture.canon.sourceFingerprint,
      referencePackId: fixture.referencePack.referencePackId,
    }),
  } as unknown as CreativeSessionService;
  const canons = {
    resolve: async () => {
      if (!canonAvailable) throw Object.assign(new Error('canon unavailable'), { code: 'VISUAL_MIGRATION_CANON_INTEGRITY_FAILED' });
      if (!packAvailable) throw Object.assign(new Error('pack invalid'), { code: 'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID' });
      return { canon: fixture.canon, referencePack: fixture.referencePack, references: [] };
    },
  } as unknown as VisualMigrationCanonService;
  const locks = { list: async () => [fixture.lockedAsset] } as unknown as LockedAssetsService;
  const create = () => createVisualMigrationReferencePolicyService(projects, sessions, canons, locks);
  const input = {
    projectId: PROJECT_ID,
    task: referenceTask(),
    candidateDeclarations: [{
      candidateId: 'identity-1', sourceKind: 'locked_asset' as const, sourceId: 'lock-logo',
      imageAssetId: 'logo-source', role: 'identity_reference' as const, sourceOrder: 0,
    }],
  };
  return {
    root, fixture, create, input,
    setCanonAvailable: (value: boolean) => { canonAvailable = value; },
    setPackAvailable: (value: boolean) => { packAvailable = value; },
  };
}

test('VM-3 service persists immutable deterministic policy and preserves bytes and mtime', async (t) => {
  const context = await setup();
  t.after(() => fs.rm(context.root, { recursive: true, force: true }));
  const service = context.create();
  const first = await service.createOrGet(context.input);
  assert.equal(first.created, true);
  const policyFile = path.join(
    context.root, 'visual-migration', 'reference-policies', first.policy.policyId, 'policy.json',
  );
  const beforeBytes = await fs.readFile(policyFile);
  const beforeStat = await fs.stat(policyFile);
  const second = await service.createOrGet(context.input);
  const afterBytes = await fs.readFile(policyFile);
  const afterStat = await fs.stat(policyFile);
  assert.equal(second.created, false);
  assert.deepEqual(afterBytes, beforeBytes);
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);
  assert.equal(await fs.stat(path.dirname(policyFile)).then((value) => value.isDirectory()), true);
  await assert.rejects(fs.access(path.join(context.root, 'visual-migration', 'reference-policies', 'active.json')));
});

test('VM-3 source change creates a new immutable policy and restart resolves both', async (t) => {
  const context = await setup();
  t.after(() => fs.rm(context.root, { recursive: true, force: true }));
  const first = await context.create().createOrGet(context.input);
  const changed = await context.create().createOrGet({
    ...context.input,
    task: referenceTask({ taskKind: 'poster_graphic' }),
  });
  assert.notEqual(changed.policy.policyId, first.policy.policyId);
  const restarted = context.create();
  assert.equal((await restarted.resolve(PROJECT_ID, first.policy.policyId)).policyId, first.policy.policyId);
  assert.equal((await restarted.resolve(PROJECT_ID, changed.policy.policyId)).policyId, changed.policy.policyId);
});

test('VM-3 resolve revalidates Canon to Pack linkage and fails closed', async (t) => {
  const context = await setup();
  t.after(() => fs.rm(context.root, { recursive: true, force: true }));
  const service = context.create();
  const created = await service.createOrGet(context.input);
  context.setPackAvailable(false);
  await assert.rejects(() => service.resolve(PROJECT_ID, created.policy.policyId), {
    code: 'REFERENCE_POLICY_REFERENCE_PACK_INVALID',
  });
  context.setPackAvailable(true);
  context.setCanonAvailable(false);
  await assert.rejects(() => service.resolve(PROJECT_ID, created.policy.policyId), {
    code: 'REFERENCE_POLICY_CANON_MISMATCH',
  });
});

test('VM-3 persistence detects policy tampering', async (t) => {
  const context = await setup();
  t.after(() => fs.rm(context.root, { recursive: true, force: true }));
  const service = context.create();
  const created = await service.createOrGet(context.input);
  const policyFile = path.join(
    context.root, 'visual-migration', 'reference-policies', created.policy.policyId, 'policy.json',
  );
  const tampered = JSON.parse(await fs.readFile(policyFile, 'utf8'));
  tampered.guarantees.styleFloor = 0;
  await fs.writeFile(policyFile, `${JSON.stringify(tampered)}\n`, 'utf8');
  await assert.rejects(() => context.create().resolve(PROJECT_ID, created.policy.policyId), {
    code: 'REFERENCE_POLICY_INTEGRITY_FAILED',
  });
});
