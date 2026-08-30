/**
 * Anchor Contract contracts.
 *
 * CI-8: Anchor Contract is a specification of what an eventual Anchor
 * must prove visually in order to validate the selected Direction
 * and Visual Canon.
 *
 * It is NOT an image prompt. It is NOT production input.
 *
 * Hard rules:
 *   - No prompt, no negativePrompt, no provider, no model, no seed
 *   - No aspectRatio, no camera, no render, no generate
 *   - No imageRequest
 *   - No production compiler input (Space / Packaging / Image Gen)
 */

import type { InvariantLevel } from '../visual-canon/contracts.ts';

export type AnchorStatus = 'ready' | 'provisional' | 'blocked';

export interface AnchorEvaluationCriterion {
  id: string;

  criterion: string;

  sourceRefs: string[];

  severity: InvariantLevel;
}

export interface AnchorContract {
  schemaVersion: '0.1';
  traceVersion: typeof ANCHOR_CONTRACT_TRACE_VERSION;

  projectId: string;
  selectedDirectionId: string;
  selectionRevision: number;

  /** What the Anchor exists to prove. */
  purpose: string;

  /** What an Anchor must demonstrate visually. */
  mustDemonstrate: string[];

  /** What an Anchor must preserve. */
  mustPreserve: string[];

  /** What an Anchor may explore. */
  mayExplore: string[];

  /** What an Anchor must not change. */
  mustNotChange: string[];

  requiredDNARefs: string[];
  requiredGrammarRefs: string[];
  lockedAssetRefs: string[];

  crossMediaProof?: string[];

  evaluationCriteria: AnchorEvaluationCriterion[];

  status: AnchorStatus;

  authoritative: false;
  mode: 'shadow';
}

// --- Diagnostics ---

export type AnchorDiagnosticCode =
  | 'ANCHOR_CONTRACT_SELECTION_REQUIRED'
  | 'ANCHOR_CONTRACT_CANON_INVALID'
  | 'ANCHOR_CONTRACT_MISSING_DNA'
  | 'ANCHOR_CONTRACT_MISSING_GRAMMAR'
  | 'ANCHOR_CONTRACT_LOCKED_ASSET_VIOLATION'
  | 'ANCHOR_CONTRACT_PROMPT_LEAKAGE'
  | 'ANCHOR_CONTRACT_PRODUCTION_SPEC_LEAKAGE';

export interface AnchorDiagnostic {
  code: AnchorDiagnosticCode;
  message: string;
  field?: string;
}

export const ANCHOR_CONTRACT_TRACE_VERSION = 'anchor-contract-v0.1';
