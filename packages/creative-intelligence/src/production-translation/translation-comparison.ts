/**
 * Translation Comparison Adapter.
 *
 * CI-9 Step 10: compare the CURRENT production input (the input that
 * existing Space / Packaging chains actually consume) against the
 * Canon-derived translation. Produce a comparison report that
 *   - lists preserved fields
 *   - lists added Canon requirements
 *   - surfaces conflicts
 *   - emits warnings
 *   - estimates behaviorChangeRisk
 *   - determines readyForConsumerSwitch (always false in CI-9 shadow)
 *
 * CI-9 does NOT switch consumers. readyForConsumerSwitch MUST be false
 * in this phase.
 *
 * The "current production input" is captured structurally — it is the
 * set of stable identity fields the existing chain reads (brand,
 * logo, productIdentity, category, structure, mandatoryCopy,
 * confirmedComponents, lockedAssetRefs, etc.). The CI never imports
 * the actual production chain code; it compares semantically.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationDiagnostic,
  TranslationComparisonReport,
  TranslationConflict,
  ComparisonReadiness,
  TargetMedia,
} from './contracts.ts';

export interface CurrentInputSnapshot {
  /** Stable brand identity. */
  brandName?: string;
  /** Locked asset references. */
  lockedAssetRefs?: string[];
  /** Product identity. */
  productIdentity?: string[];
  /** Category. */
  category?: string;
  /** Structure. */
  structure?: string;
  /** Mandatory copy (locked). */
  mandatoryCopy?: string[];
  /** Confirmed components. */
  confirmedComponents?: string[];
  /** Selected direction id (existing chain may have its own). */
  directionId?: string;
  /** Existing analysis-led input fields. */
  analysisFields?: string[];
  /** Existing reference-first input fields. */
  referenceFields?: string[];
  /** Frozen shot contract refs (Packaging only). */
  shotContractRefs?: string[];
  /** Generic current input fingerprint for diff. */
  fingerprint?: string;
}

export interface BuildComparisonInput {
  media: TargetMedia;
  canonVersion: string;
  translated: MediaTranslationContract;
  current?: CurrentInputSnapshot;
}

function fingerprintCurrentInput(current: CurrentInputSnapshot | undefined): string | undefined {
  if (!current) return undefined;
  const stable = {
    brandName: current.brandName ?? null,
    lockedAssetRefs: [...(current.lockedAssetRefs ?? [])].sort(),
    productIdentity: [...(current.productIdentity ?? [])].sort(),
    category: current.category ?? null,
    structure: current.structure ?? null,
    mandatoryCopy: [...(current.mandatoryCopy ?? [])].sort(),
    confirmedComponents: [...(current.confirmedComponents ?? [])].sort(),
    directionId: current.directionId ?? null,
    analysisFields: [...(current.analysisFields ?? [])].sort(),
    referenceFields: [...(current.referenceFields ?? [])].sort(),
    shotContractRefs: [...(current.shotContractRefs ?? [])].sort(),
  };
  return JSON.stringify(stable);
}

function setDiff(a: string[], b: string[]): string[] {
  const sb = new Set(b);
  return a.filter((x) => !sb.has(x));
}

function setIntersect(a: string[], b: string[]): string[] {
  const sb = new Set(b);
  return a.filter((x) => sb.has(x));
}

export function buildTranslationComparison(
  input: BuildComparisonInput,
): { report: TranslationComparisonReport; diagnostics: ProductionTranslationDiagnostic[] } {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  const { media, canonVersion, translated, current } = input;

  if (!current) {
    // No current input captured: comparison cannot run.
    const report: TranslationComparisonReport = {
      media,
      canonVersion,
      currentInputFingerprint: undefined,
      translatedInputFingerprint: translated.translationFingerprint,
      preservedFields: [],
      addedCanonRequirements: [],
      conflicts: [],
      warnings: ['No current production input snapshot provided; comparison skipped'],
      behaviorChangeRisk: 'none',
      readyForConsumerSwitch: false,
      comparisonReadiness: 'not_ready',
    };
    return { report, diagnostics };
  }

  const currentFingerprint = fingerprintCurrentInput(current);
  const translatedFingerprint = translated.translationFingerprint;

  // Preserved fields: those the existing chain already carries.
  const currentAllFields = [
    ...(current.lockedAssetRefs ?? []),
    ...(current.productIdentity ?? []),
    ...(current.mandatoryCopy ?? []),
    ...(current.confirmedComponents ?? []),
    ...(current.analysisFields ?? []),
    ...(current.referenceFields ?? []),
    ...(current.shotContractRefs ?? []),
  ];
  const requiredCanon = [
    ...translated.requiredDNARefs,
    ...translated.requiredGrammarRefs,
    ...translated.lockedAssetRuleRefs,
  ];

  const preservedFields = setIntersect(currentAllFields, requiredCanon);
  const addedCanonRequirements = setDiff(requiredCanon, currentAllFields);

  // Conflicts: existing fields not in Canon, or Canon fields that contradict existing.
  const conflicts: TranslationConflict[] = [];
  if (current.directionId && current.directionId !== translated.selectedDirectionId) {
    conflicts.push({
      field: 'selectedDirectionId',
      currentValue: current.directionId,
      canonRequirement: translated.selectedDirectionId,
      severity: 'high',
      description: 'Current production input is bound to a different selected Direction',
    });
  }
  for (const locked of current.lockedAssetRefs ?? []) {
    if (!translated.lockedAssetRuleRefs.includes(locked)) {
      conflicts.push({
        field: `lockedAsset.${locked}`,
        currentValue: locked,
        canonRequirement: 'must be in lockedAssetRuleRefs',
        severity: 'high',
        description: `Locked asset ${locked} in current input is missing from Canon lockedAssetRuleRefs`,
      });
    }
  }
  for (const copy of current.mandatoryCopy ?? []) {
    if (!translated.mustPreserve.some((mp) => mp.includes(copy))) {
      // Only emit conflict if it's not a generic "Mandatory copy" mention.
      const hasMandatoryCopyRule = translated.mustPreserve.some(
        (mp) => /mandatory copy|locked copy/i.test(mp),
      );
      if (!hasMandatoryCopyRule) {
        conflicts.push({
          field: `mandatoryCopy.${copy}`,
          currentValue: copy,
          severity: 'medium',
          description: 'Mandatory copy not covered by translation mustPreserve',
        });
      }
    }
  }

  const warnings: string[] = [];
  if (current.referenceFields && current.referenceFields.length > 0) {
    warnings.push('Current input includes reference-first fields; ensure reference identity does not override Canon');
  }
  if (addedCanonRequirements.length > 0) {
    warnings.push(`Translation adds ${addedCanonRequirements.length} new Canon requirements not in current input`);
  }

  const behaviorChangeRisk: TranslationComparisonReport['behaviorChangeRisk'] =
    conflicts.some((c) => c.severity === 'high') ? 'high'
    : conflicts.some((c) => c.severity === 'medium') ? 'medium'
    : addedCanonRequirements.length > 0 ? 'low'
    : 'none';

  const comparisonReadiness: ComparisonReadiness =
    conflicts.length === 0 ? 'comparison_clean'
    : 'comparison_conflicted';

  diagnostics.push({
    code: 'PT_CONSUMER_SWITCH_FORBIDDEN',
    message: `CI-9 is shadow-only; readyForConsumerSwitch must be false (${media})`,
  });

  const report: TranslationComparisonReport = {
    media,
    canonVersion,
    currentInputFingerprint: currentFingerprint,
    translatedInputFingerprint: translatedFingerprint,
    preservedFields: [...preservedFields].sort(),
    addedCanonRequirements: [...addedCanonRequirements].sort(),
    conflicts,
    warnings,
    behaviorChangeRisk,
    readyForConsumerSwitch: false,
    comparisonReadiness,
  };

  return { report, diagnostics };
}
