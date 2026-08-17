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
  interpretDocumentContext,
  runNicePipeline,
  CI_VERSION,
  type AdapterContext,
  type AdapterOutput,
} from '@masterpiece/creative-intelligence/index.ts';
import { assertInside, sanitizeFilenamePart } from './analysis-contract.ts';

const SHADOW_DIRNAME = 'creative-intelligence-shadow';
const DOC_INTEL_FILENAME = 'document-intelligence.json';
const NEED_INTEL_FILENAME = 'need-intelligence.json';
const INSIGHT_INTEL_FILENAME = 'insight-intelligence.json';
const OPPORTUNITY_MAP_FILENAME = 'opportunity-map.json';

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

  // Persist 6 base files.
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

  // CI-3: optionally persist document-intelligence.json.
  if (input.carriers.documentVisualContext) {
    try {
      const diResult = interpretDocumentContext({
        projectId: input.projectId,
        context: input.carriers.documentVisualContext as never,
      });
      const diPath = path.join(shadowDir, sanitizeFilenamePart(DOC_INTEL_FILENAME) ?? DOC_INTEL_FILENAME);
      await assertInside(shadowDir, diPath);
      await fs.writeFile(
        diPath,
        JSON.stringify(
          {
            schemaVersion: '0.1',
            authoritative: false,
            mode: 'shadow',
            projectId: input.projectId,
            sourceRunId: diResult.sourceRunId,
            generatedAt: diResult.generatedAt,
            ciVersion: CI_VERSION,
            isEmpty: diResult.isEmpty,
            warnings: diResult.warnings,
            diagnostics: [], // diagnostics are produced by diagnose() if needed
            // surface a slim DocumentIntelligenceResult; full brief excluded
            // to keep the artifact small (the full brief is regenerable).
            context: diResult.context,
          },
          null,
          2,
        ),
        'utf8',
      );
      filesWritten.push(DOC_INTEL_FILENAME);
    } catch (e) {
      // Spec #56: document intelligence shadow failure must not break the
      // overall shadow run. The base 6 files have already been written.
      warnings.push(`document_intelligence artifact: ${(e as Error).message}`);
    }
  }

  // CI-4: NICE N+I+O pipeline. Runs against the assembled Project Truth +
  // Evidence + (optional) Document Intelligence result. Always writes 3
  // artifacts; failure here MUST NOT break the rest of the shadow run.
  try {
    const documentResult = input.carriers.documentVisualContext
      ? (() => {
          try {
            return interpretDocumentContext({
              projectId: input.projectId,
              context: input.carriers.documentVisualContext as never,
            });
          } catch {
            return undefined;
          }
        })()
      : undefined;
    const nice = runNicePipeline({
      projectId: input.projectId,
      truth: bundle.projectTruth,
      evidence: bundle.evidenceLedger,
      document: documentResult,
      generatedAt: bundle.projectTruth.provenance.generatedAt,
    });

    const needPath = path.join(shadowDir, sanitizeFilenamePart(NEED_INTEL_FILENAME) ?? NEED_INTEL_FILENAME);
    const insightPath = path.join(shadowDir, sanitizeFilenamePart(INSIGHT_INTEL_FILENAME) ?? INSIGHT_INTEL_FILENAME);
    const oppPath = path.join(shadowDir, sanitizeFilenamePart(OPPORTUNITY_MAP_FILENAME) ?? OPPORTUNITY_MAP_FILENAME);
    await assertInside(shadowDir, needPath);
    await assertInside(shadowDir, insightPath);
    await assertInside(shadowDir, oppPath);

    await fs.writeFile(needPath, JSON.stringify({
      schemaVersion: '0.1',
      authoritative: false,
      mode: 'shadow',
      projectId: input.projectId,
      ciVersion: CI_VERSION,
      generatedAt: bundle.projectTruth.provenance.generatedAt,
      needs: nice.needs,
      diagnostics: nice.needDiagnostics,
    }, null, 2), 'utf8');
    filesWritten.push(NEED_INTEL_FILENAME);

    await fs.writeFile(insightPath, JSON.stringify({
      schemaVersion: '0.1',
      authoritative: false,
      mode: 'shadow',
      projectId: input.projectId,
      ciVersion: CI_VERSION,
      generatedAt: bundle.projectTruth.provenance.generatedAt,
      insights: nice.insights,
      diagnostics: nice.insightDiagnostics,
    }, null, 2), 'utf8');
    filesWritten.push(INSIGHT_INTEL_FILENAME);

    await fs.writeFile(oppPath, JSON.stringify({
      schemaVersion: '0.1',
      authoritative: false,
      mode: 'shadow',
      projectId: input.projectId,
      ciVersion: CI_VERSION,
      generatedAt: bundle.projectTruth.provenance.generatedAt,
      opportunityMap: nice.opportunityMap,
      diagnostics: nice.opportunityDiagnostics,
      traceValidation: nice.traceValidation,
    }, null, 2), 'utf8');
    filesWritten.push(OPPORTUNITY_MAP_FILENAME);
  } catch (e) {
    // Spec #41: NICE shadow failure must not block production.
    warnings.push(`nice_pipeline artifacts: ${(e as Error).message}`);
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
