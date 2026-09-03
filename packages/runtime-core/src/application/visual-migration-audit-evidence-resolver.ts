import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  detectMimeByFileSignature,
} from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
import type { ProjectStore } from './project-store.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { VisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import type { VisualMigrationCanonService } from './visual-migration-canon-service.ts';
import type { VisualMigrationGenerationEvidenceService } from './visual-migration-generation-evidence-service.ts';
import type { VisualMigrationGenerationEvidenceSnapshotV1 } from './visual-migration-generation-evidence-contract.ts';
import type { RunStore } from './image-generation/run-store.ts';
import { resolveProjectRoot, runRootUnder } from './image-generation/paths.ts';
import {
  VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE,
  VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED,
  VISUAL_MIGRATION_AUDIT_RUN_INVALID,
  visualMigrationAuditError,
} from './visual-migration-audit-contract.ts';

type FrozenReference = VisualMigrationGenerationEvidenceSnapshotV1['referenceDecision']['materializedReferences'][number];

export interface ResolvedVisualMigrationAuditImage {
  candidateId: string;
  role: FrozenReference['role'] | 'generated_output';
  sourceKind: FrozenReference['sourceKind'] | 'generated_output';
  sourceId: string;
  mimeType: string;
  sha256: string;
  byteSize: number;
  absolutePath: string;
}

export interface ResolvedVisualMigrationAuditEvidence {
  snapshot: VisualMigrationGenerationEvidenceSnapshotV1;
  canon: Awaited<ReturnType<VisualMigrationCanonService['resolve']>>['canon'];
  output: ResolvedVisualMigrationAuditImage;
  selected: ResolvedVisualMigrationAuditImage[];
  source: ResolvedVisualMigrationAuditImage[];
  reference: ResolvedVisualMigrationAuditImage[];
  exactCopyDetected: boolean;
}

interface Dependencies {
  dataPath: string;
  projects: ProjectStore;
  lockedAssets: LockedAssetsService;
  referencePacks: VisualMigrationReferencePackService;
  visualMigrationCanons: VisualMigrationCanonService;
  generationEvidence: VisualMigrationGenerationEvidenceService;
  runStoreResolver: (projectId: string) => RunStore;
}

async function sha256(filename: string): Promise<string> {
  return crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex');
}

async function safeFile(root: string, filename: string, code: string): Promise<{ actual: string; size: number }> {
  const [actualRoot, actual] = await Promise.all([
    fs.realpath(root).catch(() => null), fs.realpath(filename).catch(() => null),
  ]);
  if (!actualRoot || !actual || (actual !== actualRoot && !actual.startsWith(`${actualRoot}${path.sep}`))) {
    throw visualMigrationAuditError(code, 'Audit evidence path is missing or outside its authority root.');
  }
  const stat = await fs.stat(actual).catch(() => null);
  if (!stat?.isFile() || stat.size < 1) throw visualMigrationAuditError(code, 'Audit evidence is not a readable regular file.');
  return { actual, size: stat.size };
}

async function verifyFrozen(root: string, filename: string, frozen: FrozenReference): Promise<ResolvedVisualMigrationAuditImage> {
  const checked = await safeFile(root, filename, VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE);
  const mimeType = await detectMimeByFileSignature(checked.actual);
  const hash = await sha256(checked.actual);
  if (!mimeType || mimeType !== frozen.mimeType || hash !== frozen.sha256 || checked.size !== frozen.byteSize) {
    throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, `Frozen evidence changed: ${frozen.candidateId}.`);
  }
  return { ...frozen, absolutePath: checked.actual };
}

export function createVisualMigrationAuditEvidenceResolver(deps: Dependencies) {
  async function resolve(input: { projectId: string; runId: string; imageId?: string }): Promise<ResolvedVisualMigrationAuditEvidence> {
    const store = deps.runStoreResolver(input.projectId);
    const run = await store.readRun(input.runId);
    if (!run || run.projectId !== input.projectId || run.status !== 'succeeded' || !run.images.length) {
      throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_RUN_INVALID, 'Audit requires a succeeded visual_transfer run.');
    }
    const image = input.imageId ? run.images.find((item) => item.imageId === input.imageId) : run.images[0];
    if (!image) throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_RUN_INVALID, 'Generated image is missing.');
    const projectRoot = await resolveProjectRoot(deps.dataPath, input.projectId);
    const runRoot = runRootUnder(projectRoot, input.runId);
    const checkedOutput = await safeFile(runRoot, path.join(runRoot, image.relativePath), VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED);
    const outputMime = await detectMimeByFileSignature(checkedOutput.actual);
    const outputSha = await sha256(checkedOutput.actual);
    if (!outputMime || outputMime !== image.mimeType || outputSha !== image.sha256 || checkedOutput.size !== image.sizeBytes) {
      throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED, 'Generated output integrity validation failed.');
    }
    const snapshot = await deps.generationEvidence.getGenerationEvidenceSnapshot({ projectId: input.projectId, runId: input.runId, verifyArtifacts: true });
    const canonResolution = await deps.visualMigrationCanons.resolve(input.projectId, snapshot.authority.canon.canonId);
    const [project, projectPaths, pack, taskBytes] = await Promise.all([
      deps.projects.get(input.projectId), deps.projects.paths(input.projectId),
      deps.referencePacks.resolve(input.projectId, snapshot.authority.referencePack.referencePackId),
      store.readRunArtifact(input.runId, snapshot.artifacts.task.filename),
    ]);
    if (!taskBytes) throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, 'Verified task artifact is unavailable.');
    let task: { references?: Array<{ assetId?: string; candidateId?: string }> };
    try { task = JSON.parse(taskBytes.toString('utf8')); } catch { throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, 'Task artifact is not valid JSON.'); }
    const selected: ResolvedVisualMigrationAuditImage[] = [];
    for (const frozen of snapshot.referenceDecision.materializedReferences) {
      let filename = '';
      if (frozen.sourceKind === 'visual_migration_reference_pack') {
        const item = pack.references.find((entry) => entry.referenceId === frozen.sourceId);
        filename = item?.absolutePath ?? '';
      } else {
        let assetId = frozen.sourceId;
        if (frozen.sourceKind === 'locked_asset') {
          assetId = (await deps.lockedAssets.get(input.projectId, frozen.sourceId))?.sourceAssetId ?? '';
        } else if (frozen.sourceKind === 'task_reference') {
          const matches = (task.references ?? []).filter((entry) => entry.candidateId === frozen.candidateId || entry.assetId === frozen.sourceId);
          if (matches.length !== 1 || !matches[0]?.assetId) {
            throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, `Task reference cannot be uniquely recovered: ${frozen.candidateId}.`);
          }
          assetId = matches[0].assetId;
        }
        const asset = project.assets.find((entry) => entry.id === assetId);
        if (asset?.status === 'ready') filename = asset.usage === 'generation_reference'
          ? path.join(projectPaths.root, asset.relativePath)
          : path.join(projectPaths.input, asset.relativePath);
      }
      if (!filename) throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, `Evidence cannot be resolved: ${frozen.candidateId}.`);
      selected.push(await verifyFrozen(projectPaths.root, filename, frozen));
    }
    const selectedIds = selected.map((entry) => entry.candidateId);
    if (selectedIds.some((id, index) => id !== snapshot.referenceDecision.selectedCandidateIds[index])
      || selectedIds.length !== snapshot.referenceDecision.selectedCandidateIds.length) {
      throw visualMigrationAuditError(VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE, 'Resolved evidence order differs from VM-5.');
    }
    const identities = selected.filter((entry) => entry.role === 'identity_reference');
    const structures = selected.filter((entry) => entry.role === 'structure_reference');
    const styles = selected.filter((entry) => entry.role === 'style_reference');
    const reserved = snapshot.referenceDecision.reserved;
    const ordered = (items: ResolvedVisualMigrationAuditImage[], first?: string) => first
      ? [...items.filter((item) => item.candidateId === first), ...items.filter((item) => item.candidateId !== first)]
      : items;
    const source = [...ordered(identities, reserved.identity).slice(0, 2), ...ordered(structures, reserved.structure).slice(0, 1)];
    const reference = ordered(styles, reserved.style).slice(0, 3);
    return {
      snapshot, canon: canonResolution.canon,
      output: { candidateId: image.imageId, role: 'generated_output', sourceKind: 'generated_output', sourceId: image.imageId, mimeType: outputMime, sha256: outputSha, byteSize: checkedOutput.size, absolutePath: checkedOutput.actual },
      selected, source, reference,
      exactCopyDetected: styles.some((entry) => entry.sha256 === outputSha),
    };
  }
  return { resolve };
}

export type VisualMigrationAuditEvidenceResolver = ReturnType<typeof createVisualMigrationAuditEvidenceResolver>;
