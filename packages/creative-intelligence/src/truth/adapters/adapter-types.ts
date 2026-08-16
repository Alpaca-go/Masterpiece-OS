/**
 * Shared adapter types for Project Truth fact-carrier adapters.
 *
 * Spec #8: each adapter must be pure, deterministic, side-effect free,
 *          non-mutating, schema-preserving.
 *
 * Adapters are not classes. They are factory functions returning
 * an `adapt` function — easy to test, easy to compose.
 */

import type { EvidenceEntry, ProjectTruthFact, ProjectTruthWarning } from './../truth/contracts.ts';

export interface AdapterOutput {
  facts: ProjectTruthFact[];
  evidence: EvidenceEntry[];
  warnings: ProjectTruthWarning[];
}

export interface AdapterContext {
  projectId: string;
  generatedAt: string;
  /** Source fingerprint per carrier type, if known. Used for staleness. */
  sourceFingerprints: Record<string, string>;
}

export type ProjectTruthAdapter<TInput> = (input: TInput, ctx: AdapterContext) => AdapterOutput;

/**
 * Helper: emit a warning with stable code.
 */
export function warning(
  code: string,
  message: string,
  fields: { carrierId?: string; factId?: string; key?: string } = {},
): ProjectTruthWarning {
  return { code, message, ...fields };
}
