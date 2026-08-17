/**
 * Anchor Validator.
 *
 * CI-8 Step 41, 56, 75: validate Anchor Contract.
 *
 * Checks:
 *   - Selection entry rules
 *   - All hard DNA covered
 *   - All hard Grammar covered
 *   - All Locked Asset rules covered
 *   - selected Direction visualMechanism covered
 *   - No prompt leakage
 */

import type {
  AnchorContract,
  AnchorDiagnostic,
  AnchorStatus,
  AnchorEvaluationCriterion,
} from './contracts.ts';
import type { SelectedDirectionSnapshot } from '../visual-canon/contracts.ts';
import type { VisualCanon } from '../visual-canon/contracts.ts';
import { detectAnchorLeakage } from './anchor-boundary.ts';

export interface AnchorValidationContext {
  anchor: AnchorContract;
  canon: VisualCanon;
  snapshot: SelectedDirectionSnapshot;
}

export function validateAnchor(ctx: AnchorValidationContext): {
  status: AnchorStatus;
  diagnostics: AnchorDiagnostic[];
} {
  const diagnostics: AnchorDiagnostic[] = [];
  const a = ctx.anchor;

  // Hard DNA coverage: every required DNA element should be referenced
  const requiredDna = ctx.canon.visualDNA.requiredElementIds;
  for (const dnaId of requiredDna) {
    if (!a.requiredDNARefs.includes(dnaId)) {
      diagnostics.push({
        code: 'ANCHOR_CONTRACT_MISSING_DNA',
        message: `Anchor contract must reference required DNA: ${dnaId}`,
        field: dnaId,
      });
    }
  }

  // Hard Grammar coverage: composition rules and forbidden combinations should be referenced
  const hardGrammar = [
    ...ctx.canon.visualGrammar.compositionRules.filter((r) => r.invariantLevel === 'hard'),
    ...ctx.canon.visualGrammar.assetUsageRules.filter((r) => r.invariantLevel === 'hard'),
    ...ctx.canon.visualGrammar.forbiddenCombinations,
  ];
  for (const gr of hardGrammar) {
    if (!a.requiredGrammarRefs.includes(gr.id)) {
      diagnostics.push({
        code: 'ANCHOR_CONTRACT_MISSING_GRAMMAR',
        message: `Anchor contract must reference required Grammar rule: ${gr.id}`,
        field: gr.id,
      });
    }
  }

  // Locked Asset coverage
  for (const lar of ctx.canon.lockedAssetRules) {
    if (!a.lockedAssetRefs.includes(lar.assetType)) {
      diagnostics.push({
        code: 'ANCHOR_CONTRACT_LOCKED_ASSET_VIOLATION',
        message: `Anchor contract must reference Locked Asset type: ${lar.assetType}`,
        field: lar.assetType,
      });
    }
  }

  // Direction visualMechanism coverage
  const visMechRef = 'direction-visual-mechanism';
  if (!a.mustDemonstrate.some((m) => m.includes(ctx.snapshot.direction.visualMechanism.slice(0, 30)))) {
    if (!a.requiredDNARefs.includes(visMechRef)) {
      diagnostics.push({
        code: 'ANCHOR_CONTRACT_MISSING_DNA',
        message: 'Anchor mustDemonstrate should reference selected Direction visualMechanism',
        field: 'mustDemonstrate',
      });
    }
  }

  // Prompt leakage check
  const leakage = detectAnchorLeakage(a);
  if (leakage.field) {
    diagnostics.push({
      code: 'ANCHOR_CONTRACT_PROMPT_LEAKAGE',
      message: `Anchor contract contains forbidden field: ${leakage.field}`,
      field: leakage.field ?? undefined,
    });
  }
  if (leakage.text) {
    diagnostics.push({
      code: 'ANCHOR_CONTRACT_PROMPT_LEAKAGE',
      message: `Anchor contract contains forbidden text: ${leakage.text.slice(0, 60)}`,
    });
  }

  // Status
  const hasBlock = diagnostics.some((d) =>
    d.code === 'ANCHOR_CONTRACT_PROMPT_LEAKAGE'
    || d.code === 'ANCHOR_CONTRACT_PRODUCTION_SPEC_LEAKAGE'
    || d.code === 'ANCHOR_CONTRACT_LOCKED_ASSET_VIOLATION',
  );
  const hasWarning = diagnostics.length > 0;

  let status: AnchorStatus;
  if (hasBlock) {
    status = 'blocked';
  } else if (ctx.canon.status === 'provisional' || ctx.snapshot.direction.status === 'provisional') {
    status = 'provisional';
  } else if (hasWarning) {
    status = 'provisional';
  } else {
    status = 'ready';
  }

  return { status, diagnostics };
}
