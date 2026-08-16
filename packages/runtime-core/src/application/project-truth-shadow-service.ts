/**
 * CI-2: Project Truth Shadow Service.
 *
 * Shadow-only Project Truth assembly orchestration. Persists to
 * `<projectContext>/creative-intelligence-shadow/`. NEVER reads or
 * writes production flow. NEVER replaces current production facts.
 *
 * Spec #27-#32: shadow mode.
 * Spec #28:     orchestration in runtime-core; CI is pure.
 * Spec #29:     persist to non-authoritative path.
 * Spec #30:     every artifact includes schemaVersion / projectId /
 *               generatedAt / sourceCarrierVersions / sourceFingerprints /
 *               ciVersion / authoritative=false / mode=shadow.
 * Spec #32:     current production does NOT read shadow artifacts.
 * Spec #59:     shadow failure must NOT break production. This service
 *               throws an `CI_SHADOW_VALIDATION_FAILED` error on hard
 *               invalid input, but the caller MUST wrap invocations in
 *               try/catch (see `runShadowProjectTruthSafely`).
 *
 * Production flow does NOT depend on this service. It is exposed for:
 *   - golden shadow validation tests
 *   - developer-facing debug
 *   - future CI-3 forward wiring (still optional)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  adaptVisualUnderstandingCore,
  adaptPromptSourceObject,
  adaptNormalizedProjectFacts,
  adaptResolvedProjectContext,
  adaptCurrentProjectCorePack,
  adaptCurrentProjectProfile,
  runShadowProjectTruth,
  type AdapterContext,
  type AdapterOutput,
  CI_VERSION,
} from '@masterpiece/creative-intelligence/index.ts';
import { assertInside, sanitizeFilenamePart } from './analysis-contract.ts';

const SHADOW_DIRNAME = 'creative-intelligence-shadow';

export interface ShadowCarrierInput {
  projectRecord?: unknown;
  documentVisualContext?: unknown;
  visualUnderstandingCore?: unknown;
  promptSourceObject?: unknown;
  normalizedProjectFacts?: unknown;
  resolvedProjectContext?: unknown;
  currentProjectCorePack?: unknown;
  currentProjectProfile?: unknown;
  /** Reference-only outputs (Reference-First flow). */
  referenceOutputs?: AdapterOutput[];
  /** Optional sourceFingerprints map per carrier. */
  sourceFingerprints?: Record<string, string>;
  /** Optional source carrier version strings. */
  sourceCarrierVersions?: string[];
}

export interface RunShadowInput {
  projectId: string;
  projectContextRoot: string;
  carriers: ShadowCarrierInput;
  /** Optional pre-computed currentCarrierValues for the validator. */
  currentCarrierValues?: Record<string, unknown>;
  generatedAt?: string;
}

export interface RunShadowResult {
  ok: boolean;
  artifactDirectory: string;
  files: string[];
  errorCode?: string;
  errorMessage?: string;
}

const ARTIFACT_FILES = [
  'project-truth.json',
  'evidence-ledger.json',
  'truth-resolutions.json',
  'truth-conflicts.json',
  'validation-report.json',
  'shadow-report.json',
] as const;

export async function runProjectTruthShadow(input: RunShadowInput): Promise<RunShadowResult> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const shadowDir = path.join(input.projectContextRoot, SHADOW_DIRNAME);
  await assertInside(input.projectContextRoot, shadowDir);

  const context: AdapterContext = {
    projectId: input.projectId,
    generatedAt,
    sourceFingerprints: input.carriers.sourceFingerprints ?? {},
  };

  const carrierOutputs: AdapterOutput[] = [];
  const warnings: string[] = [];

  if (input.carriers.projectRecord) {
    try {
      carrierOutputs.push(adaptProjectRecord(input.carriers.projectRecord as never, context));
    } catch (e) {
      warnings.push(`project_record adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.documentVisualContext) {
    try {
      carrierOutputs.push(adaptDocumentVisualContext(input.carriers.documentVisualContext as never, context));
    } catch (e) {
      warnings.push(`document_visual_context adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.visualUnderstandingCore) {
    try {
      carrierOutputs.push(adaptVisualUnderstandingCore(input.carriers.visualUnderstandingCore as never, context));
    } catch (e) {
      warnings.push(`visual_understanding_core adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.promptSourceObject) {
    try {
      carrierOutputs.push(adaptPromptSourceObject(input.carriers.promptSourceObject as never, context));
    } catch (e) {
      warnings.push(`prompt_source_object adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.normalizedProjectFacts) {
    try {
      carrierOutputs.push(adaptNormalizedProjectFacts(input.carriers.normalizedProjectFacts as never, context));
    } catch (e) {
      warnings.push(`normalized_project_facts adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.resolvedProjectContext) {
    try {
      carrierOutputs.push(adaptResolvedProjectContext(input.carriers.resolvedProjectContext as never, context));
    } catch (e) {
      warnings.push(`resolved_project_context adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.currentProjectCorePack) {
    try {
      carrierOutputs.push(adaptCurrentProjectCorePack(input.carriers.currentProjectCorePack as never, context));
    } catch (e) {
      warnings.push(`current_project_core_pack adapter: ${(e as Error).message}`);
    }
  }
  if (input.carriers.currentProjectProfile) {
    try {
      carrierOutputs.push(adaptCurrentProjectProfile(input.carriers.currentProjectProfile as never, context));
    } catch (e) {
      warnings.push(`current_project_profile adapter: ${(e as Error).message}`);
    }
  }

  let bundle;
  try {
    const { report } = runShadowProjectTruth({
      projectId: input.projectId,
      carrierOutputs,
      context,
      currentCarrierValues: input.currentCarrierValues ?? {},
      referenceOutputs: input.carriers.referenceOutputs,
      sourceCarrierVersions: input.carriers.sourceCarrierVersions,
      ciVersion: CI_VERSION,
    });
    bundle = report;
  } catch (e) {
    return {
      ok: false,
      artifactDirectory: shadowDir,
      files: [],
      errorCode: 'CI_SHADOW_VALIDATION_FAILED',
      errorMessage: (e as Error).message,
    };
  }

  // Persist 6 files.
  await fs.mkdir(shadowDir, { recursive: true });
  const filesWritten: string[] = [];
  for (const filename of ARTIFACT_FILES) {
    const target = path.join(shadowDir, sanitizeFilenamePart(filename) ?? filename);
    await assertInside(shadowDir, target);
    let payload: unknown;
    if (filename === 'project-truth.json') payload = bundle.projectTruth;
    else if (filename === 'evidence-ledger.json') payload = bundle.evidenceLedger;
    else if (filename === 'truth-resolutions.json') payload = bundle.truthResolutions;
    else if (filename === 'truth-conflicts.json') payload = bundle.truthConflicts;
    else if (filename === 'validation-report.json') payload = bundle.validationReport;
    else if (filename === 'shadow-report.json') {
      payload = {
        ...bundle,
        _warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
    await fs.writeFile(target, JSON.stringify(payload, null, 2), 'utf8');
    filesWritten.push(filename);
  }

  return { ok: true, artifactDirectory: shadowDir, files: filesWritten };
}

/**
 * Safe wrapper: NEVER throws. Returns ok=false on any failure.
 * Spec #59: shadow failure must not break production.
 */
export async function runProjectTruthShadowSafely(input: RunShadowInput): Promise<RunShadowResult> {
  try {
    return await runProjectTruthShadow(input);
  } catch (e) {
    return {
      ok: false,
      artifactDirectory: path.join(input.projectContextRoot, SHADOW_DIRNAME),
      files: [],
      errorCode: 'CI_SHADOW_VALIDATION_FAILED',
      errorMessage: (e as Error).message,
    };
  }
}
