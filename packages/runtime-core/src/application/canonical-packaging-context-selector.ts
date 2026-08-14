import type {
  ActiveReferenceSource,
  PackagingTranslationSource,
  PackagingTranslationSourceKind,
  PackagingTranslationV2,
  ProjectVisualContextShortChain,
} from '@masterpiece/project-contracts/index.ts';
import { validatePackagingTranslationV2 } from './packaging-translation-contract.ts';

export type PackagingGenerationMode = 'analysis_led' | 'reference_first';

export interface SelectedPackagingContext {
  sourceKind: PackagingTranslationSourceKind;
  projectId: string;
  sourceFingerprint: string;
  translation: PackagingTranslationV2;
}

export interface PackagingTruthVisualContext {
  packageStructures: readonly string[];
  packagingConcept: string;
  sourceKind: PackagingTranslationSourceKind;
  sourceFingerprint: string;
  translationContract: 'PackagingTranslationV2';
}

export class CanonicalPackagingContextError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'CanonicalPackagingContextError';
  }
}

function fail(code: string, message: string): never {
  throw new CanonicalPackagingContextError(code, message);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertProjectBinding(actual: unknown, expected: string, label: string): void {
  if (actual !== expected) {
    fail('PACKAGING_CONTEXT_PROJECT_MISMATCH', `${label} is not bound to the Workspace project`);
  }
}

function validateSource(
  source: PackagingTranslationSource,
  expectedKind: PackagingTranslationSourceKind,
  projectId: string,
): PackagingTranslationV2 {
  assertProjectBinding(source?.projectId, projectId, 'Packaging translation source');
  if (source?.schemaVersion !== '1.0'
    || source.translationContract !== 'PackagingTranslationV2'
    || !nonEmpty(source.sourceFingerprint)
    || !nonEmpty(source.generatedAt)) {
    fail('PACKAGING_CONTEXT_PROVENANCE_INVALID', 'selected Packaging source provenance is incomplete');
  }
  if (source.sourceKind !== expectedKind) {
    fail('PACKAGING_CONTEXT_SOURCE_KIND_MISMATCH', `selected source must be ${expectedKind}`);
  }
  if (expectedKind === 'reference_first' && !nonEmpty(source.producerRunId)) {
    fail('PACKAGING_CONTEXT_PROVENANCE_INVALID', 'Reference source producerRunId is required');
  }
  if (source.translation?.status !== 'ready'
    || !Array.isArray(source.translation?.missingRequiredFields)
    || source.translation.missingRequiredFields.length > 0) {
    fail('PACKAGING_CONTEXT_TRANSLATION_INVALID', 'PackagingTranslationV2 must be ready');
  }
  const validation = validatePackagingTranslationV2(source.translation);
  if (!validation.valid) {
    fail(
      'PACKAGING_CONTEXT_TRANSLATION_INVALID',
      `PackagingTranslationV2 is incomplete: ${validation.errors.join(', ')}`,
    );
  }
  return validation.value;
}

/**
 * Sole Packaging handoff selector. It reads exactly one producer slot selected
 * by Workspace generationMode and performs no source discovery or reasoning.
 */
export function selectCanonicalPackagingContext(input: {
  workspaceProjectId: string;
  generationMode: string;
  projectVisualContext: ProjectVisualContextShortChain;
  activeReferenceSource?: ActiveReferenceSource | null;
}): SelectedPackagingContext {
  const projectId = nonEmpty(input.workspaceProjectId)
    ? input.workspaceProjectId
    : fail('PACKAGING_CONTEXT_PROJECT_MISMATCH', 'Workspace projectId is required');
  if (input.generationMode !== 'analysis_led' && input.generationMode !== 'reference_first') {
    fail('PACKAGING_CONTEXT_MODE_UNSUPPORTED', 'generationMode must select a canonical producer');
  }
  const mode: PackagingGenerationMode = input.generationMode;
  const context = input.projectVisualContext;
  if (!context || context.schemaVersion !== '2.0') {
    fail('PACKAGING_CONTEXT_PROVENANCE_INVALID', 'Project Visual Context 2.0 is required');
  }
  assertProjectBinding(context.projectId, projectId, 'Project Visual Context');
  if (context.packagingTranslations?.schemaVersion !== '1.0') {
    fail('PACKAGING_CONTEXT_PROVENANCE_INVALID', 'Packaging producer slots are unavailable');
  }

  const source = mode === 'analysis_led'
    ? context.packagingTranslations.analysisLed
    : context.packagingTranslations.referenceFirst;
  if (!source) {
    fail(
      mode === 'analysis_led'
        ? 'PACKAGING_ANALYSIS_SOURCE_UNAVAILABLE'
        : 'PACKAGING_REFERENCE_SOURCE_UNAVAILABLE',
      `${mode} Packaging translation is unavailable`,
    );
  }
  const translation = validateSource(source, mode, projectId);

  if (mode === 'reference_first') {
    const active = input.activeReferenceSource;
    if (!active) {
      fail('PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING', 'an explicit active Reference source is required');
    }
    if (active.schemaVersion !== '1.0'
      || !nonEmpty(active.runId)
      || !nonEmpty(active.sourceFingerprint)
      || !nonEmpty(active.selectedAt)) {
      fail('PACKAGING_CONTEXT_PROVENANCE_INVALID', 'active Reference source provenance is incomplete');
    }
    assertProjectBinding(active.projectId, projectId, 'Active Reference source');
    if (source.producerRunId !== active.runId) {
      fail('PACKAGING_REFERENCE_RUN_MISMATCH', 'selected producer run is not the active Reference run');
    }
    if (source.sourceFingerprint !== active.sourceFingerprint) {
      fail('PACKAGING_REFERENCE_FINGERPRINT_MISMATCH', 'selected source fingerprint does not match the active Reference source');
    }
  }

  return Object.freeze({
    sourceKind: mode,
    projectId,
    sourceFingerprint: source.sourceFingerprint,
    translation,
  });
}

/**
 * Projects only the existing A11 truth fields plus semantic provenance used by
 * the existing truth-surface fingerprint. Producer run identity is excluded so
 * an identical semantic rerun does not create false staleness.
 */
export function projectSelectedPackagingContextToTruth(
  selected: SelectedPackagingContext,
): PackagingTruthVisualContext {
  const packageStructures = selected.translation.structureStrategy
    .map((entry) => entry.structure.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
  return Object.freeze({
    packageStructures: Object.freeze(packageStructures),
    packagingConcept: selected.translation.packagingConcept,
    sourceKind: selected.sourceKind,
    sourceFingerprint: selected.sourceFingerprint,
    translationContract: 'PackagingTranslationV2',
  });
}
