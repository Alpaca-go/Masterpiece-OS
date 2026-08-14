import crypto from 'node:crypto';
import type {
  PackagingTranslationSource,
  PackagingTranslationV2,
} from '@masterpiece/project-contracts/index.ts';
import type { ReferencePackagingProjectInput } from '../shared/types.ts';
import { normalizePackagingTranslationV2 } from './packaging-translation-contract.ts';

export const REFERENCE_PACKAGING_PRODUCER_CONTRACT_VERSION = 'reference-packaging-producer@1.0.0';

type UnknownRecord = Record<string, unknown>;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stable(item)]),
  );
}

/**
 * Producer-owned semantic input revision. Run ids, timestamps, paths and model
 * responses are intentionally excluded so an identical rerun remains stable.
 */
export function computeReferencePackagingSourceFingerprint(input: {
  project: ReferencePackagingProjectInput;
  referenceAssetContentHashes: string[];
}): string {
  const payload = {
    producerContractVersion: REFERENCE_PACKAGING_PRODUCER_CONTRACT_VERSION,
    project: input.project,
    referenceAssetContentHashes: [...new Set(input.referenceAssetContentHashes)].sort(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(payload))).digest('hex');
}

export function createReferencePackagingSource(input: {
  projectId: string;
  runId: string;
  sourceFingerprint: string;
  generatedAt: string;
  translation: PackagingTranslationV2;
}): PackagingTranslationSource & { sourceKind: 'reference_first' } {
  return {
    schemaVersion: '1.0',
    sourceKind: 'reference_first',
    projectId: input.projectId,
    producerRunId: input.runId,
    sourceFingerprint: input.sourceFingerprint,
    translationContract: 'PackagingTranslationV2',
    generatedAt: input.generatedAt,
    translation: normalizePackagingTranslationV2(input.translation),
  };
}

export function validateReferencePackagingSource(
  value: unknown,
  expected?: { projectId?: string; runId?: string; sourceFingerprint?: string },
): asserts value is PackagingTranslationSource & { sourceKind: 'reference_first' } {
  const candidate = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<PackagingTranslationSource>
    : {};
  const errors: string[] = [];
  if (candidate.schemaVersion !== '1.0') errors.push('schemaVersion');
  if (candidate.sourceKind !== 'reference_first') errors.push('sourceKind');
  if (!candidate.projectId) errors.push('projectId');
  if (!candidate.producerRunId) errors.push('producerRunId');
  if (!candidate.sourceFingerprint) errors.push('sourceFingerprint');
  if (candidate.translationContract !== 'PackagingTranslationV2') errors.push('translationContract');
  if (!candidate.generatedAt) errors.push('generatedAt');
  if (!candidate.translation) errors.push('translation');
  if (expected?.projectId && candidate.projectId !== expected.projectId) errors.push('projectId mismatch');
  if (expected?.runId && candidate.producerRunId !== expected.runId) errors.push('producerRunId mismatch');
  if (expected?.sourceFingerprint && candidate.sourceFingerprint !== expected.sourceFingerprint) {
    errors.push('sourceFingerprint mismatch');
  }
  if (errors.length) {
    throw Object.assign(new Error(`Reference Packaging source invalid: ${errors.join(', ')}`), {
      code: 'REFERENCE_PACKAGING_SOURCE_INVALID',
    });
  }
}
