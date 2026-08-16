/**
 * Top-level orchestrator for shadow-mode Project Truth assembly.
 *
 * Spec #27-#32: shadow mode runs in parallel; does not replace production.
 *               Deterministic output; stable ordering.
 * Spec #9:    truth classes preserved; never auto-promoted.
 * Spec #59:   shadow failure does NOT break production. This function is pure
 *             and throws CI_TRUTH_* errors only when given invalid input.
 *             Production callers (in runtime-core) must wrap this in try/catch
 *             and persist a `shadow_failed` artifact instead of propagating.
 *
 * Pure function — NO IO. Persistence is the caller's responsibility
 * (runtime-core owns file writes, per spec #28).
 */

import type { AdapterOutput, AdapterContext } from '../truth/adapters/adapter-types.ts';
import type {
  ProjectTruthModel,
  TruthResolution,
  ProjectTruthConflict,
  ProjectTruthWarning,
} from '../truth/contracts.ts';
import type { EvidenceLedgerSnapshot } from '../evidence/contracts.ts';
import type { ShadowTruthValidationReport } from './shadow-types.ts';
import { assembleProjectTruth, type AssemblerResult } from '../truth/assembler.ts';
import { validateShadowTruth } from './shadow-validator.ts';
import { buildShadowReport, type ShadowReportBundle, CI_VERSION } from './shadow-report.ts';

export interface ShadowProjectTruthInput {
  projectId: string;
  carrierOutputs: AdapterOutput[];
  context: AdapterContext;
  /** Optional: carrier values to compare against. Keys are PROJECT_TRUTH_KEYS values. */
  currentCarrierValues?: Record<string, unknown>;
  /** Optional: reference-only outputs. Tagged isReferenceFact=true in the assembler. */
  referenceOutputs?: AdapterOutput[];
  /** Optional: source carrier version strings for the report. */
  sourceCarrierVersions?: string[];
  ciVersion?: string;
}

export interface ShadowProjectTruthResult {
  assembled: AssemblerResult;
  validation: ShadowTruthValidationReport;
  report: ShadowReportBundle;
}

export function runShadowProjectTruth(input: ShadowProjectTruthInput): ShadowProjectTruthResult {
  if (!input.projectId) {
    throw Object.assign(new Error('runShadowProjectTruth: projectId is required'), {
      code: 'CI_SHADOW_VALIDATION_FAILED',
    });
  }
  if (!Array.isArray(input.carrierOutputs)) {
    throw Object.assign(new Error('runShadowProjectTruth: carrierOutputs must be an array'), {
      code: 'CI_SHADOW_VALIDATION_FAILED',
    });
  }

  const assembled = assembleProjectTruth({
    projectId: input.projectId,
    carrierOutputs: input.carrierOutputs,
    context: input.context,
    referenceOutputs: input.referenceOutputs,
  });

  const validation = validateShadowTruth({
    truth: assembled.truth,
    currentCarriers: input.currentCarrierValues ?? {},
    ciVersion: input.ciVersion ?? CI_VERSION,
    generatedAt: input.context.generatedAt,
  });

  const report = buildShadowReport({
    projectId: input.projectId,
    truth: assembled.truth,
    ledger: assembled.ledger,
    resolutions: assembled.resolutions,
    conflicts: assembled.conflicts,
    validationReport: validation,
    sourceCarrierVersions: input.sourceCarrierVersions,
    warnings: assembled.warnings,
  });

  return { assembled, validation, report };
}

export type {
  ProjectTruthModel,
  TruthResolution,
  ProjectTruthConflict,
  ProjectTruthWarning,
  EvidenceLedgerSnapshot,
  ShadowTruthValidationReport,
  ShadowReportBundle,
};
