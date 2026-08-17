/**
 * Production Translation Context builder + entry validation.
 *
 * CI-9 Step 3 / Step 10-11:
 *   - Validates Canon freshness
 *   - Builds the shared ProductionTranslationContext
 *   - Emits PT_* diagnostics for any entry failure
 */

import type {
  ProductionTranslationContext,
  ProductionTranslationDiagnostic,
  TargetMedia,
} from './contracts.ts';
import { PRODUCTION_TRANSLATION_TRACE_VERSION } from './contracts.ts';
import type { SelectedDirectionSnapshot } from '../visual-canon/contracts.ts';
import type { VisualCanon } from '../visual-canon/contracts.ts';
import type { AnchorContract } from '../anchor-contract/contracts.ts';

export interface BuildContextInput {
  projectId: string;
  snapshot: SelectedDirectionSnapshot;
  canon: VisualCanon;
  anchor: AnchorContract;
  targetMedia: TargetMedia;
}

export interface BuildContextResult {
  context: ProductionTranslationContext | null;
  diagnostics: ProductionTranslationDiagnostic[];
}

export function buildProductionTranslationContext(input: BuildContextInput): BuildContextResult {
  const diagnostics: ProductionTranslationDiagnostic[] = [];

  // Entry rule 1: SelectedDirectionSnapshot exists
  if (!input.snapshot) {
    diagnostics.push({
      code: 'PT_CANON_REQUIRED',
      message: 'SelectedDirectionSnapshot is required',
    });
    return { context: null, diagnostics };
  }

  // Entry rule 2: VisualCanon status is valid or provisional
  if (input.canon.status === 'blocked') {
    diagnostics.push({
      code: 'PT_CANON_BLOCKED',
      message: 'VisualCanon is blocked; translation not allowed',
    });
    return { context: null, diagnostics };
  }

  // Entry rule 3: AnchorContract status is ready or provisional
  if (input.anchor.status === 'blocked') {
    diagnostics.push({
      code: 'PT_CANON_BLOCKED',
      message: 'AnchorContract is blocked; translation not allowed',
    });
    return { context: null, diagnostics };
  }

  // Entry rule 4: selectionRevision matches
  if (input.canon.selectionRevision !== input.snapshot.selectionRevision) {
    diagnostics.push({
      code: 'PT_SELECTION_MISMATCH',
      message: `VisualCanon.selectionRevision (${input.canon.selectionRevision}) != snapshot.selectionRevision (${input.snapshot.selectionRevision})`,
    });
    return { context: null, diagnostics };
  }

  // Entry rule 5: directionFingerprint matches
  if (input.canon.trace.directionFingerprint !== input.snapshot.directionFingerprint) {
    diagnostics.push({
      code: 'PT_CANON_STALE',
      message: 'VisualCanon.directionFingerprint does not match snapshot.directionFingerprint',
    });
    return { context: null, diagnostics };
  }

  const context: ProductionTranslationContext = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    selectedDirectionSnapshot: input.snapshot,
    visualCanon: input.canon,
    anchorContract: input.anchor,
    canonVersion: `v${input.canon.selectionRevision}-${input.canon.trace.directionFingerprint.slice(0, 16)}`,
    lockedAssetRules: input.canon.lockedAssetRules,
    targetMedia: input.targetMedia,
    traceVersion: PRODUCTION_TRANSLATION_TRACE_VERSION,
  };

  return { context, diagnostics };
}

/**
 * Build the shared hard DNA + hard Grammar refs that BOTH Space and
 * Packaging must preserve (Spec #31, #32).
 *
 * `sharedHardDNARefs ⊆ Space.requiredDNARefs ∧ ⊆ Packaging.requiredDNARefs`
 */
export function buildSharedHardDNA(visualCanon: VisualCanon): string[] {
  return [...visualCanon.visualDNA.requiredElementIds];
}

export function buildSharedHardGrammar(visualCanon: VisualCanon): string[] {
  const all = [
    ...visualCanon.visualGrammar.compositionRules,
    ...visualCanon.visualGrammar.assetUsageRules,
    ...visualCanon.visualGrammar.forbiddenCombinations,
  ];
  return all.filter((r) => r.invariantLevel === 'hard').map((r) => r.id);
}
