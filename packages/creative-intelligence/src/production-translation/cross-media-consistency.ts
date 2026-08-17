/**
 * Cross-Media Consistency Validator.
 *
 * CI-9 Step 7 / Step 35: enforce that Space and Packaging agree on:
 *   - selectedDirectionId
 *   - canonVersion
 *   - hard DNA set
 *   - hard Grammar set
 *   - Locked Asset rule set
 *
 * "Think once, compile many": Space and Packaging must share the
 * authoritative creative baseline. Media differences must be adaptation
 * only, never identity-level mutation.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationDiagnostic,
  SpaceTranslationContract,
  PackagingTranslationContract,
} from './contracts.ts';

export function validateCrossMediaConsistency(
  space: SpaceTranslationContract | MediaTranslationContract,
  packaging: PackagingTranslationContract | MediaTranslationContract,
): ProductionTranslationDiagnostic[] {
  const diagnostics: ProductionTranslationDiagnostic[] = [];

  if (space.selectedDirectionId !== packaging.selectedDirectionId) {
    diagnostics.push({
      code: 'PT_SELECTION_MISMATCH',
      message: 'Space and Packaging reference different selectedDirectionId',
    });
  }
  if (space.canonVersion !== packaging.canonVersion) {
    diagnostics.push({
      code: 'PT_CANON_STALE',
      message: 'Space and Packaging use different canonVersion',
    });
  }

  // Hard DNA must be identical (set equality)
  const spaceDna = new Set(space.requiredDNARefs);
  const pkgDna = new Set(packaging.requiredDNARefs);
  for (const dna of spaceDna) {
    if (!pkgDna.has(dna)) {
      diagnostics.push({
        code: 'PT_HARD_DNA_MISSING',
        message: `Hard DNA "${dna}" missing from Packaging contract`,
        field: dna,
      });
    }
  }
  for (const dna of pkgDna) {
    if (!spaceDna.has(dna)) {
      diagnostics.push({
        code: 'PT_HARD_DNA_MISSING',
        message: `Hard DNA "${dna}" missing from Space contract`,
        field: dna,
      });
    }
  }

  // Hard Grammar must be identical
  const spaceGrammar = new Set(space.requiredGrammarRefs);
  const pkgGrammar = new Set(packaging.requiredGrammarRefs);
  for (const g of spaceGrammar) {
    if (!pkgGrammar.has(g)) {
      diagnostics.push({
        code: 'PT_HARD_GRAMMAR_MISSING',
        message: `Hard Grammar "${g}" missing from Packaging contract`,
        field: g,
      });
    }
  }
  for (const g of pkgGrammar) {
    if (!spaceGrammar.has(g)) {
      diagnostics.push({
        code: 'PT_HARD_GRAMMAR_MISSING',
        message: `Hard Grammar "${g}" missing from Space contract`,
        field: g,
      });
    }
  }

  // Locked Asset rule refs must be identical
  const spaceLocked = new Set(space.lockedAssetRuleRefs);
  const pkgLocked = new Set(packaging.lockedAssetRuleRefs);
  for (const l of spaceLocked) {
    if (!pkgLocked.has(l)) {
      diagnostics.push({
        code: 'PT_LOCKED_ASSET_RULE_MISSING',
        message: `Locked Asset rule "${l}" missing from Packaging contract`,
        field: l,
      });
    }
  }
  for (const l of pkgLocked) {
    if (!spaceLocked.has(l)) {
      diagnostics.push({
        code: 'PT_LOCKED_ASSET_RULE_MISSING',
        message: `Locked Asset rule "${l}" missing from Space contract`,
        field: l,
      });
    }
  }

  return diagnostics;
}

/**
 * Build the shared hard DNA set (Spec #31, #32):
 * 100% hard DNA preservation across Space and Packaging.
 */
export function buildSharedHardDNA(visualCanon: { visualDNA: { requiredElementIds: string[] } }): string[] {
  return [...visualCanon.visualDNA.requiredElementIds];
}

/**
 * Build the shared hard Grammar set:
 * Hard composition + hard asset usage + all forbidden combinations.
 */
export function buildSharedHardGrammar(visualCanon: {
  visualGrammar: {
    compositionRules: Array<{ id: string; invariantLevel: 'hard' | 'strong' | 'adaptive' }>;
    assetUsageRules: Array<{ id: string; invariantLevel: 'hard' | 'strong' | 'adaptive' }>;
    forbiddenCombinations: Array<{ id: string; invariantLevel: 'hard' | 'strong' | 'adaptive' }>;
  };
}): string[] {
  const all = [
    ...visualCanon.visualGrammar.compositionRules,
    ...visualCanon.visualGrammar.assetUsageRules,
    ...visualCanon.visualGrammar.forbiddenCombinations,
  ];
  return all.filter((r) => r.invariantLevel === 'hard').map((r) => r.id);
}
