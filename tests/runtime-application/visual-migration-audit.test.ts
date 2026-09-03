import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import crypto from 'node:crypto';
import { decideVisualMigrationAudit } from '@masterpiece/runtime-core/application/visual-migration-audit-decision-engine.ts';
import { createVisualMigrationAuditObserver } from '@masterpiece/runtime-core/application/visual-migration-audit-observer.ts';
import { createVisualMigrationAuditService } from '@masterpiece/runtime-core/application/visual-migration-audit-service.ts';
import { createVisualMigrationAuditEvidenceResolver } from '@masterpiece/runtime-core/application/visual-migration-audit-evidence-resolver.ts';
import { createRunStore } from '@masterpiece/runtime-core/application/image-generation/run-store.ts';

const SHA = 'a'.repeat(64);
const source = (changes: Record<string, unknown> = {}) => ({
  identityPreservation: 'matched', lockedAssetIntegrity: 'pass', contentHierarchy: 'matched',
  structurePreservation: 'matched', foreignIdentityVisible: 'none', visibleFindings: [], ...changes,
}) as never;
const reference = (changes: Record<string, unknown> = {}) => ({
  colorSystem: 'matched', layoutAndTypography: 'matched', graphicLanguage: 'matched',
  materialAndPhotography: 'matched', extensionMechanism: 'matched', referenceIdentityLeakage: 'none',
  nearCopyRisk: 'low', referenceConflict: 'none', visibleFindings: [], ...changes,
}) as never;

test('VM-6 deterministic A-J audit matrix', () => {
  assert.equal(decideVisualMigrationAudit({ source: source(), reference: reference() }).disposition, 'pass');
  assert.equal(decideVisualMigrationAudit({ source: source({ contentHierarchy: 'minor_drift' }), reference: reference() }).disposition, 'pass_with_warnings');
  assert.deepEqual(decideVisualMigrationAudit({ source: source({ identityPreservation: 'major_drift' }), reference: reference() }).failureClasses, ['SOURCE_IDENTITY_LOSS']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source({ contentHierarchy: 'major_drift' }), reference: reference() }).failureClasses, ['TARGET_IDENTITY_LOSS']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source({ structurePreservation: 'major_drift' }), reference: reference() }).failureClasses, ['STRUCTURE_DRIFT']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source(), reference: reference({ colorSystem: 'major_drift' }) }).failureClasses, ['PALETTE_DRIFT']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source(), reference: reference({ colorSystem: 'major_drift', graphicLanguage: 'major_drift' }) }).failureClasses, ['PALETTE_DRIFT', 'GRAPHIC_LANGUAGE_DRIFT', 'STYLE_DRIFT']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source(), reference: reference({ nearCopyRisk: 'high' }) }).failureClasses, ['NEAR_COPY_RISK']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source(), reference: reference(), exactCopyDetected: true }).failureClasses, ['NEAR_COPY_RISK']);
  assert.deepEqual(decideVisualMigrationAudit({ source: source(), reference: reference({ referenceIdentityLeakage: 'visible' }) }).failureClasses, ['NEAR_COPY_RISK']);
  const conflict = decideVisualMigrationAudit({ source: source(), reference: reference({ referenceConflict: 'confirmed' }) });
  assert.equal(conflict.disposition, 'reference_conflict_blocked'); assert.equal(conflict.retryEligibility, false);
  assert.equal(decideVisualMigrationAudit({ source: source({ identityPreservation: 'uncertain' }), reference: reference() }).disposition, 'manual_review_required');
});

function canon() {
  const rule = (statement: string) => ({ statement });
  return { projectIdentity: { requiredIdentityRules: [rule('keep identity')], lockedFacts: ['brand'], lockedAssetIds: ['logo'] },
    transferSystem: { color: [rule('warm')], layoutAndTypography: [rule('grid')], graphicLanguage: [rule('lines')], materialAndPhotography: [rule('paper')], extensionMechanism: [rule('extend')] },
    prohibitedTransfer: { referenceBrandNames: [], referenceLogos: [], referenceSlogans: [], referenceSignatureGraphics: [], referenceProprietaryPatterns: [], prohibitedMutations: [], userAvoidance: [] } } as never;
}

test('VM-6 observer performs exactly two role-separated calls and rejects invalid JSON', async () => {
  const calls: unknown[] = [];
  const replies = [JSON.stringify(source()), JSON.stringify(reference())];
  const observer = createVisualMigrationAuditObserver({
    readSettings: async () => ({ profiles: [{ id: 'audit', isEnabled: true, hasApiKey: true, modelType: 'analysis', protocol: 'openai-chat-multimodal' }] }),
    readCredentials: async () => ({ apiKey: 'test', baseUrl: 'https://invalid.test', model: 'audit-model', protocol: 'openai-chat-multimodal' }),
    createReasoner: () => async (input) => { calls.push(input); return { reportMarkdown: replies.shift()!, provider: 'fixture', model: 'audit-model', runId: `obs-${calls.length}` }; },
  });
  const image = (id: string, role: string) => ({ candidateId: id, role, sourceKind: 'project_asset', sourceId: id, mimeType: 'image/png', sha256: SHA, byteSize: 10, absolutePath: `D:/fixture/${id}.png` });
  const result = await observer.observe({ evidence: { snapshot: {}, canon: canon(), output: image('output', 'generated_output'), selected: [], source: [image('identity', 'identity_reference')], reference: [image('style', 'style_reference')], exactCopyDetected: false } as never });
  assert.equal(result.modelCallCount, 2); assert.equal(calls.length, 2);
  assert.deepEqual((calls[0] as any).prompt.attachments.map((item: any) => item.assetId), ['output', 'identity']);
  assert.deepEqual((calls[1] as any).prompt.attachments.map((item: any) => item.assetId), ['output', 'style']);
  const invalid = createVisualMigrationAuditObserver({ readSettings: async () => ({ profiles: [{ id: 'audit', isEnabled: true, hasApiKey: true, modelType: 'analysis', protocol: 'openai-chat-multimodal' }] }), readCredentials: async () => ({ apiKey: 'x', baseUrl: 'x', model: 'x', protocol: 'openai-chat-multimodal' }), createReasoner: () => async () => ({ reportMarkdown: 'not json', provider: 'x', model: 'x', runId: 'x' }) });
  await assert.rejects(() => invalid.observe({ evidence: { snapshot: {}, canon: canon(), output: image('o', 'generated_output'), source: [], reference: [] } as never }), { code: 'VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID' });
  const unavailable = createVisualMigrationAuditObserver({ readSettings: async () => ({ profiles: [] }), readCredentials: async () => ({ apiKey: '', baseUrl: '', model: '' }) });
  await assert.rejects(() => unavailable.observe({ evidence: { snapshot: {}, canon: canon(), output: image('o', 'generated_output'), source: [], reference: [] } as never }), { code: 'VISUAL_MIGRATION_AUDITOR_PROFILE_REQUIRED' });
});

async function fixtureStore() {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'vm6-audit-'));
  const projectId = crypto.randomUUID();
  const root = path.join(dataPath, 'projects', `fixture-${projectId.slice(0, 8)}`);
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, 'project.json'), JSON.stringify({ id: projectId, assets: [] }));
  return { dataPath, projectId, root, store: createRunStore(dataPath, projectId) };
}

test('VM-6 Audit is deterministic, immutable, restart-readable and tamper-detecting', async (t) => {
  const f = await fixtureStore(); t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const evidence = { snapshot: { snapshotId: 'vmges-' + '1'.repeat(32), snapshotFingerprint: 'sha256:' + '1'.repeat(64), reproducibilityFingerprint: 'sha256:' + '2'.repeat(64) }, canon: canon(),
    output: { candidateId: 'image-01', mimeType: 'image/png', sha256: SHA, byteSize: 10 }, source: [], reference: [], selected: [], exactCopyDetected: false } as never;
  const make = () => createVisualMigrationAuditService({ evidenceResolver: { resolve: async () => evidence } as never,
    observer: { resolveAuditor: async () => ({ profileId: 'audit', provider: 'fixture', model: 'audit-model' }), observe: async () => ({ source: source(), reference: reference(), provider: 'fixture', model: 'audit-model', sourceObservationRunId: 's1', referenceObservationRunId: 'r1', sourcePromptVersion: 'visual-migration-source-audit@1.0.0', referencePromptVersion: 'visual-migration-reference-audit@1.0.0', modelCallCount: 2 }) } as never,
    runStoreResolver: () => createRunStore(f.dataPath, f.projectId), now: () => '2026-09-03T00:00:00.000Z' });
  const first = await make().audit({ projectId: f.projectId, runId: 'run-1' });
  const second = await make().audit({ projectId: f.projectId, runId: 'run-1' });
  assert.equal(first.auditId, second.auditId); assert.equal(first.auditFingerprint, second.auditFingerprint);
  assert.deepEqual(await make().get({ projectId: f.projectId, runId: 'run-1', auditId: first.auditId }), first);
  await assert.rejects(() => f.store.writeVisualMigrationAuditCreateOnce('run-1', first.auditId, { ...first, decision: { ...first.decision, disposition: 'pass_with_warnings' } }), { code: 'VISUAL_MIGRATION_AUDIT_CONFLICT' });
  const auditPath = path.join(f.root, 'image-generation', 'run-1', 'visual-migration-audits', first.auditId, 'audit.json');
  const tampered = JSON.parse(await fs.readFile(auditPath, 'utf8')); tampered.decision.disposition = 'pass_with_warnings';
  await fs.writeFile(auditPath, JSON.stringify(tampered));
  await assert.rejects(() => make().get({ projectId: f.projectId, runId: 'run-1', auditId: first.auditId }), { code: 'VISUAL_MIGRATION_AUDIT_OBSERVATION_INVALID' });
});

test('VM-6 unresolved task_reference fails closed before observer', async (t) => {
  const f = await fixtureStore(); t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000020001e221bc330000000049454e44ae426082', 'hex');
  const hash = crypto.createHash('sha256').update(png).digest('hex'); const runRoot = path.join(f.root, 'image-generation', 'run-task');
  await fs.mkdir(path.join(runRoot, 'images'), { recursive: true }); await fs.writeFile(path.join(runRoot, 'images', 'image.png'), png);
  await f.store.saveRun({ schemaVersion: '3.0', runId: 'run-task', projectId: f.projectId, taskId: 'task', status: 'succeeded', outputType: 'brand_poster', providerId: 'seedream', modelId: 'seedream', region: 'global', createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z', gate: { blocked: false, errors: [], warnings: [] }, images: [{ imageId: 'image-01', relativePath: 'images/image.png', mimeType: 'image/png', sizeBytes: png.length, sha256: hash, downloadedAt: '2026-09-03T00:00:00Z' }] } as never);
  await f.store.writeTask('run-task', { references: [] });
  const snapshot = { authority: { canon: { canonId: 'vmc-' + '1'.repeat(32) }, referencePack: { referencePackId: 'vmrp-' + '1'.repeat(32) } }, artifacts: { task: { filename: 'task.json' } }, referenceDecision: { reserved: { identity: 'task-1' }, selectedCandidateIds: ['task-1'], materializedReferences: [{ candidateId: 'task-1', role: 'identity_reference', providerRole: 'current_project_identity', sourceKind: 'task_reference', sourceId: 'missing-task-ref', mimeType: 'image/png', sha256: hash, byteSize: png.length }] } };
  const resolver = createVisualMigrationAuditEvidenceResolver({ dataPath: f.dataPath, projects: { get: async () => ({ assets: [] }), paths: async () => ({ root: f.root, input: path.join(f.root, 'input') }) } as never, lockedAssets: {} as never, referencePacks: { resolve: async () => ({ references: [] }) } as never, visualMigrationCanons: { resolve: async () => ({ canon: canon() }) } as never, generationEvidence: { getGenerationEvidenceSnapshot: async () => snapshot } as never, runStoreResolver: () => f.store });
  await assert.rejects(() => resolver.resolve({ projectId: f.projectId, runId: 'run-task' }), { code: 'VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE' });
});

test('VM-6 evidence resolver verifies output and exact-copy SHA before observer', async (t) => {
  const f = await fixtureStore(); t.after(() => fs.rm(f.dataPath, { recursive: true, force: true }));
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000020001e221bc330000000049454e44ae426082', 'hex');
  const hash = crypto.createHash('sha256').update(png).digest('hex');
  const runRoot = path.join(f.root, 'image-generation', 'run-1'); await fs.mkdir(path.join(runRoot, 'images'), { recursive: true });
  await fs.writeFile(path.join(runRoot, 'images', 'image.png'), png); await fs.writeFile(path.join(f.root, 'style.png'), png);
  await f.store.saveRun({ schemaVersion: '3.0', runId: 'run-1', projectId: f.projectId, taskId: 'task-1', status: 'succeeded', outputType: 'brand_poster', providerId: 'seedream', modelId: 'seedream', region: 'global', createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z', gate: { blocked: false, errors: [], warnings: [] }, images: [{ imageId: 'image-01', relativePath: 'images/image.png', mimeType: 'image/png', sizeBytes: png.length, sha256: hash, downloadedAt: '2026-09-03T00:00:00Z' }] } as never);
  await f.store.writeTask('run-1', { references: [] });
  const snapshot = { authority: { canon: { canonId: 'vmc-' + '1'.repeat(32) }, referencePack: { referencePackId: 'vmrp-' + '1'.repeat(32) } }, artifacts: { task: { filename: 'task.json' } }, referenceDecision: { reserved: { style: 'style-1' }, selectedCandidateIds: ['style-1'], materializedReferences: [{ candidateId: 'style-1', role: 'style_reference', providerRole: 'reference_style', sourceKind: 'visual_migration_reference_pack', sourceId: 'ref-1', mimeType: 'image/png', sha256: hash, byteSize: png.length }] } };
  const resolver = createVisualMigrationAuditEvidenceResolver({ dataPath: f.dataPath, projects: { get: async () => ({ assets: [] }), paths: async () => ({ root: f.root, input: path.join(f.root, 'input') }) } as never, lockedAssets: {} as never,
    referencePacks: { resolve: async () => ({ references: [{ referenceId: 'ref-1', absolutePath: path.join(f.root, 'style.png') }] }) } as never,
    visualMigrationCanons: { resolve: async () => ({ canon: canon() }) } as never, generationEvidence: { getGenerationEvidenceSnapshot: async () => snapshot } as never, runStoreResolver: () => f.store });
  const resolved = await resolver.resolve({ projectId: f.projectId, runId: 'run-1' });
  assert.equal(resolved.exactCopyDetected, true); assert.deepEqual(resolved.reference.map((item) => item.candidateId), ['style-1']);
  await fs.writeFile(path.join(runRoot, 'images', 'image.png'), Buffer.from('tamper'));
  await assert.rejects(() => resolver.resolve({ projectId: f.projectId, runId: 'run-1' }), { code: 'VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED' });
});
