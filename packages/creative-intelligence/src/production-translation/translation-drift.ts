/**
 * Translation Drift Guard.
 *
 * CI-9 Step 9: detect drift in media translation against the canonical
 * Visual Canon. The translation must NOT introduce:
 *   - new Visual Mechanism
 *   - new Direction Family
 *   - missing hard DNA
 *   - missing hard Grammar
 *   - Locked Asset loss
 *   - brand drift
 *   - reference contamination
 *   - ungrounded media rule
 *   - prompt leakage
 *   - Canon/version mismatch
 *
 * All comparisons are deterministic (set / string equality). No model call.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationContext,
  ProductionTranslationDiagnostic,
} from './contracts.ts';

const FORBIDDEN_TOKENS = [
  'camera', 'lens', 'lighting', 'render', 'image prompt',
  'provider prompt', 'negative prompt', 'seed:', 'aspect ratio',
  'midjourney', 'dalle', 'qwen-image', 'stablediffusion', 'sora',
  'shot contract', 'shotContract', 'box geometry',
];

function findForbiddenText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const t of FORBIDDEN_TOKENS) {
    if (lower.includes(t.toLowerCase())) return t;
  }
  return null;
}

export function detectTranslationDrift(
  ctx: ProductionTranslationContext,
  contract: MediaTranslationContract,
): ProductionTranslationDiagnostic[] {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  const c = ctx.visualCanon;

  // 1. Canon/version mismatch
  if (contract.canonVersion !== ctx.canonVersion) {
    diagnostics.push({
      code: 'PT_CANON_STALE',
      message: `Translation canonVersion (${contract.canonVersion}) != context canonVersion (${ctx.canonVersion})`,
    });
  }
  if (contract.selectedDirectionId !== c.selectedDirectionId) {
    diagnostics.push({
      code: 'PT_SELECTION_MISMATCH',
      message: `Translation selectedDirectionId (${contract.selectedDirectionId}) != VisualCanon selectedDirectionId (${c.selectedDirectionId})`,
    });
  }

  // 2. Hard DNA preservation
  const canonHardDNA = new Set([
    ...c.visualDNA.requiredElementIds,
    ...c.visualDNA.structuralDNA.map((d) => d.id),
    ...c.visualDNA.identityDNA.map((d) => d.id),
    ...c.visualDNA.relationDNA.map((d) => d.id),
  ]);
  for (const dna of canonHardDNA) {
    if (!contract.requiredDNARefs.includes(dna)) {
      diagnostics.push({
        code: 'PT_HARD_DNA_MISSING',
        message: `Hard DNA "${dna}" missing from ${contract.media} translation`,
        field: dna,
      });
    }
  }

  // 3. Hard Grammar preservation
  const canonHardGrammar = new Set([
    ...c.visualGrammar.compositionRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
    ...c.visualGrammar.assetUsageRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
  ]);
  for (const g of canonHardGrammar) {
    if (!contract.requiredGrammarRefs.includes(g)) {
      diagnostics.push({
        code: 'PT_HARD_GRAMMAR_MISSING',
        message: `Hard Grammar "${g}" missing from ${contract.media} translation`,
        field: g,
      });
    }
  }

  // 4. Locked Asset preservation
  const canonLocked = new Set(ctx.lockedAssetRules.map((r) => r.assetType));
  for (const l of canonLocked) {
    if (!contract.lockedAssetRuleRefs.includes(l)) {
      diagnostics.push({
        code: 'PT_LOCKED_ASSET_RULE_MISSING',
        message: `Locked Asset rule "${l}" missing from ${contract.media} translation`,
        field: l,
      });
    }
  }

  // 5. Forbidden tokens in any text field
  const allText = [
    ...contract.mustPreserve,
    ...contract.mayAdapt,
    ...contract.mustNotIntroduce,
  ];
  for (const text of allText) {
    const token = findForbiddenText(text);
    if (token) {
      diagnostics.push({
        code: 'PT_PRODUCTION_PROMPT_LEAKAGE',
        message: `${contract.media} translation contains forbidden token "${token}"`,
        field: token,
      });
    }
  }

  // 6. Reference contamination: mustPreserve / mayAdapt must not contain "reference:" token
  for (const text of contract.mustPreserve) {
    if (text.toLowerCase().startsWith('reference:') || text.toLowerCase().includes('reference identity')) {
      diagnostics.push({
        code: 'PT_REFERENCE_CONTAMINATION',
        message: `${contract.media} translation has reference-derived identity in mustPreserve`,
        field: 'mustPreserve',
      });
      break;
    }
  }

  return diagnostics;
}

/**
 * Detect media rule without Canon trace.
 * Every media adaptation rule's sourceRef must resolve to a Canon rule
 * (CanonRule.id, LockedAssetCanonRule.assetType, VisualDNAElement.id,
 * or GrammarRule.id).
 */
export function detectUngroundedMediaRules(
  ctx: ProductionTranslationContext,
  ruleIds: string[],
  ruleSourceRefs: string[],
): ProductionTranslationDiagnostic[] {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  const validSourceIds = new Set<string>([
    ...ctx.visualCanon.visualDNA.requiredElementIds,
    ...ctx.visualCanon.visualDNA.structuralDNA.map((d) => d.id),
    ...ctx.visualCanon.visualDNA.identityDNA.map((d) => d.id),
    ...ctx.visualCanon.visualDNA.rhythmDNA.map((d) => d.id),
    ...ctx.visualCanon.visualDNA.hierarchyDNA.map((d) => d.id),
    ...ctx.visualCanon.visualDNA.relationDNA.map((d) => d.id),
    ...ctx.visualCanon.visualGrammar.compositionRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.hierarchyRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.repetitionRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.transformationRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.assetUsageRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.crossMediaAdaptationRules.map((r) => r.id),
    ...ctx.visualCanon.visualGrammar.forbiddenCombinations.map((r) => r.id),
    ...ctx.lockedAssetRules.map((r) => r.assetType),
    ctx.selectedDirectionSnapshot.directionId,
  ]);

  for (let i = 0; i < ruleIds.length; i++) {
    const id = ruleIds[i];
    const src = ruleSourceRefs[i];
    if (!src) {
      diagnostics.push({
        code: 'PT_MEDIA_RULE_UNGROUNDED',
        message: `Media rule "${id}" has no sourceRef`,
        field: id,
      });
      continue;
    }
    if (!validSourceIds.has(src) && src !== ctx.selectedDirectionSnapshot.directionId) {
      diagnostics.push({
        code: 'PT_MEDIA_RULE_UNGROUNDED',
        message: `Media rule "${id}" has sourceRef "${src}" not in Canon`,
        field: id,
      });
    }
  }

  return diagnostics;
}
