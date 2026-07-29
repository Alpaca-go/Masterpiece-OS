import crypto from 'node:crypto';
import type {
  LockedAsset,
  ProjectVisualContextVNext,
} from '../../../../packages/project-contracts/src/index.ts';
import type { ProjectRecord } from '../shared/types.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';

export const PROJECT_VISUAL_CONTEXT_VNEXT_SCHEMA_VERSION = '2.0';
export const PROJECT_CONTEXT_VNEXT_BUILDER_ID = 'project-context-builder';
export const PROJECT_CONTEXT_VNEXT_BUILDER_VERSION = '1.0.0';

export interface BuildProjectVisualContextVNextInput {
  project: ProjectRecord;
  lockedAssets?: LockedAsset[];
  structuredAnalysis?: unknown;
  structuredAnalysisRunId?: string;
  previousContext?: ProjectVisualContextVNext | null;
  generatedAt?: string;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function strings(...values: unknown[]): string[] {
  const result: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'string') return;
    const clean = value.trim();
    if (clean && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function sourceFingerprint(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function assetRole(
  asset: ProjectRecord['assets'][number],
  project: ProjectRecord,
  structured: UnknownRecord,
): ProjectVisualContextVNext['sourceAssetRefs'][number]['role'] {
  if (
    project.logoFiles.includes(asset.relativePath)
    || project.logoFiles.includes(asset.originalName)
    || /(?:^|[-_.\s])(logo|标志|标识)(?:[-_.\s]|$)/iu.test(asset.originalName)
  ) return 'logo';
  const packageIds = strings(record(structured.lockedAssets).packageStructureAssetIds);
  if (packageIds.includes(asset.id)) return 'package_structure';
  const productIds = strings(record(structured.lockedAssets).productAssetIds);
  if (productIds.includes(asset.id)) return 'product';
  if (asset.mimeType.startsWith('image/')) return 'visual_reference';
  return 'source';
}

/**
 * Builds an execution context without reading or accepting report markdown.
 * Unknown structured-analysis shapes degrade to explicit uncertainties.
 */
export function buildProjectVisualContextVNext(
  input: BuildProjectVisualContextVNextInput,
): ProjectVisualContextVNext {
  const { project } = input;
  const structured = record(input.structuredAnalysis);
  const brandCore = record(structured.brandCore);
  const structuredLocks = record(structured.lockedAssets);
  const visualIdentity = record(structured.visualIdentity);
  const boundaries = record(structured.styleBoundaries);
  const activeAssets = project.assets.filter((asset) => asset.status === 'ready');
  const sourceAssetRefs = activeAssets.map((asset) => ({
    assetId: asset.id,
    name: asset.originalName,
    relativePath: asset.relativePath,
    role: assetRole(asset, project, structured),
  }));
  const persistedLocks = input.lockedAssets ?? [];
  const logoAssetIds = strings(
    persistedLocks.filter((asset) => asset.type === 'logo').map((asset) => asset.sourceAssetId),
    sourceAssetRefs.filter((asset) => asset.role === 'logo').map((asset) => asset.assetId),
  );
  const lockedAssetIds = strings(
    persistedLocks.map((asset) => asset.id),
    structuredLocks.lockedAssetIds,
  );
  const mustPreserve = strings(
    project.lockedFacts,
    persistedLocks.map((asset) => [asset.rule, ...asset.forbiddenChanges]),
    structuredLocks.mustPreserve,
  );
  const confirmedDecisions: ProjectVisualContextVNext['confirmedDecisions'] = Array.isArray(structured.confirmedDecisions)
    ? structured.confirmedDecisions.flatMap((value, index) => {
      const decision = record(value);
      if (typeof decision.value !== 'string' || !decision.value.trim()) return [];
      return [{
        id: typeof decision.id === 'string' && decision.id.trim()
          ? decision.id.trim()
          : `structured-${index + 1}`,
        value: decision.value.trim(),
        source: 'structured_analysis' as const,
        ...(typeof decision.confirmedAt === 'string' ? { confirmedAt: decision.confirmedAt } : {}),
      }];
    })
    : [];
  for (const fact of project.lockedFacts) {
    confirmedDecisions.push({
      id: `project-fact-${sourceFingerprint(fact).slice(0, 12)}`,
      value: fact,
      source: 'project_record',
    });
  }
  const uncertaintyDefaults = [
    ...(strings(brandCore.audience).length ? [] : ['target_audience']),
    ...(strings(visualIdentity.tone).length ? [] : ['visual_tone']),
    ...(strings(visualIdentity.colorBehavior).length ? [] : ['color_behavior']),
  ];
  const fingerprintInput = {
    project: {
      id: project.id,
      projectName: project.projectName,
      brandName: project.brandName,
      industry: project.industry,
      logoLocked: project.logoLocked,
      lockedFacts: project.lockedFacts,
      assets: activeAssets.map(({ id, originalName, relativePath, mimeType, sha256 }) => ({
        id,
        originalName,
        relativePath,
        mimeType,
        sha256,
      })),
    },
    lockedAssets: persistedLocks,
    structuredAnalysis: structured,
  };

  return {
    schemaVersion: '2.0',
    projectId: project.id,
    version: (input.previousContext?.version ?? 0) + 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    brandCore: {
      name: strings(brandCore.name, project.brandName, project.projectName)[0] ?? 'unknown',
      industry: strings(brandCore.industry, project.industry, project.detectedIndustry)[0] ?? 'unknown',
      brandRole: strings(brandCore.brandRole)[0] ?? null,
      audience: strings(brandCore.audience),
    },
    lockedAssets: {
      logoAssetIds,
      brandNameLocked: Boolean(project.brandName),
      confirmedColors: strings(structuredLocks.confirmedColors),
      packageStructures: strings(structuredLocks.packageStructures),
      productAssetIds: strings(
        structuredLocks.productAssetIds,
        sourceAssetRefs.filter((asset) => asset.role === 'product').map((asset) => asset.assetId),
      ),
      lockedAssetIds,
      mustPreserve,
    },
    visualIdentity: {
      tone: strings(visualIdentity.tone),
      colorBehavior: strings(visualIdentity.colorBehavior),
      graphicBehavior: strings(visualIdentity.graphicBehavior),
      materialBehavior: strings(visualIdentity.materialBehavior),
      compositionBehavior: strings(visualIdentity.compositionBehavior),
      lightingBehavior: strings(visualIdentity.lightingBehavior),
    },
    styleBoundaries: {
      mustAvoid: strings(boundaries.mustAvoid),
      uncertainItems: strings(boundaries.uncertainItems, uncertaintyDefaults),
    },
    confirmedDecisions,
    sourceAssetRefs,
    provenance: {
      builderId: PROJECT_CONTEXT_VNEXT_BUILDER_ID,
      builderVersion: PROJECT_CONTEXT_VNEXT_BUILDER_VERSION,
      sourceKinds: [
        'project_record',
        'original_asset',
        ...(Object.keys(structured).length ? ['structured_analysis' as const] : []),
        ...(confirmedDecisions.some((decision) => decision.source === 'user_confirmation')
          ? ['user_confirmation' as const]
          : []),
      ],
      ...(input.structuredAnalysisRunId
        ? { structuredAnalysisRunId: input.structuredAnalysisRunId }
        : {}),
      sourceFingerprint: sourceFingerprint(fingerprintInput),
    },
  };
}

export function validateProjectVisualContextVNext(
  value: unknown,
): { valid: boolean; errors: string[] } {
  const context = record(value);
  const errors: string[] = [];
  if (context.schemaVersion !== '2.0') errors.push('schemaVersion must be 2.0');
  if (typeof context.projectId !== 'string' || !context.projectId) errors.push('projectId is required');
  if (!Number.isInteger(context.version) || Number(context.version) < 1) errors.push('version must be a positive integer');
  if (!record(context.brandCore).name) errors.push('brandCore.name is required');
  if (!Array.isArray(record(context.lockedAssets).mustPreserve)) errors.push('lockedAssets.mustPreserve must be an array');
  if (!Array.isArray(context.sourceAssetRefs)) errors.push('sourceAssetRefs must be an array');
  if (!record(context.provenance).sourceFingerprint) errors.push('provenance.sourceFingerprint is required');
  return { valid: errors.length === 0, errors };
}

export async function writeProjectVisualContextVNext(
  filePath: string,
  context: ProjectVisualContextVNext,
): Promise<void> {
  const validation = validateProjectVisualContextVNext(context);
  if (!validation.valid) {
    throw Object.assign(new Error(`Project Visual Context vNext invalid: ${validation.errors.join('; ')}`), {
      code: 'PROJECT_VISUAL_CONTEXT_VNEXT_INVALID',
    });
  }
  const result = await atomicWriteJsonWithRetry(filePath, context);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage ?? 'Project Visual Context vNext write failed'), {
      code: 'PROJECT_VISUAL_CONTEXT_VNEXT_WRITE_FAILED',
    });
  }
}
