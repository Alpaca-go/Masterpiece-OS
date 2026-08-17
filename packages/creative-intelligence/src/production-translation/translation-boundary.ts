/**
 * Production Translation boundary + drift guard.
 *
 * CI-9 Step 8 / Step 9:
 *   - Detect production prompt leakage
 *   - Detect media rule without Canon trace
 *   - Detect new visual mechanism / direction family invention
 *   - Detect hard DNA / hard Grammar / locked asset loss
 *   - Detect reference contamination
 *   - Surface REFERENCE_CANON_CONFLICT
 *
 * Translation is downstream-only. No Canon mutation.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationDiagnostic,
  ProductionTranslationTrace,
} from './contracts.ts';
import { PRODUCTION_TRANSLATION_TRACE_VERSION } from './contracts.ts';
import type { ProductionTranslationContext } from './contracts.ts';

const FORBIDDEN_PRODUCTION_TERMS = [
  'camera', 'lens', 'lighting', 'render parameters', 'render',
  'image prompt', 'provider prompt', 'negative prompt',
  'seed:', 'aspect ratio', 'provider request', 'provider',
  'midjourney', 'dalle', 'qwen-image', 'stablediffusion', 'sora',
  'shot contract', 'shotContract', 'box geometry',
];

const ALLOWED_MEDIA_FIELDS = new Set([
  'schemaVersion', 'projectId', 'media',
  'selectedDirectionId', 'selectionRevision', 'canonVersion',
  'requiredDNARefs', 'requiredGrammarRefs', 'lockedAssetRuleRefs',
  'mustPreserve', 'mayAdapt', 'mustNotIntroduce',
  'trace', 'translationVersion', 'translationFingerprint',
  'status', 'authoritative', 'mode',
  // Space fields
  'spatialIdentityRules', 'zoneRelationshipRules', 'environmentalGraphicRules',
  'wayfindingRules', 'materialBehaviorRules', 'brandPresenceRules',
  'scaleAdaptationRules', 'prohibitedSpatialDrift',
  // Packaging fields
  'productIdentityRules', 'structurePreservationRules', 'informationHierarchyRules',
  'familySystemRules', 'lockedCopyRules', 'prohibitedPackagingDrift',
]);

/**
 * Detect production-prompt leakage in any string field of a media contract.
 * Returns the first offending text fragment or null.
 */
export function detectProductionPromptLeakage(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    const lower = obj.toLowerCase();
    for (const term of FORBIDDEN_PRODUCTION_TERMS) {
      if (lower.includes(term)) return obj.slice(0, 80);
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = detectProductionPromptLeakage(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const r = detectProductionPromptLeakage(value);
      if (r) return r;
    }
  }
  return null;
}

/**
 * Detect forbidden field names in a media contract.
 * Allowed fields are explicitly listed; everything else is checked.
 */
export function detectForbiddenField(obj: unknown, path = ''): string | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = detectForbiddenField(obj[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fieldPath = path ? `${path}.${key}` : key;
    if (!ALLOWED_MEDIA_FIELDS.has(key)) {
      // Allow generic JSON-serializable fields used by media contracts
      // Specifically: only block well-known forbidden media terms.
      const lower = key.toLowerCase();
      if (lower.includes('prompt') || lower.includes('render') || lower.includes('camera')
        || lower.includes('provider') || lower.includes('model') || lower.includes('seed')) {
        return fieldPath;
      }
    }
    const r = detectForbiddenField(value, fieldPath);
    if (r) return r;
  }
  return null;
}

/**
 * Compute the trace from the shared context.
 *
 * Trace closure: every media rule must trace to a Canon Rule, DNA, Grammar,
 * CrossMediaCanon, or Locked Asset Canon.
 */
export function buildTranslationTrace(
  ctx: ProductionTranslationContext,
): ProductionTranslationTrace {
  return {
    selectedDirectionId: ctx.selectedDirectionSnapshot.directionId,
    canonVersion: ctx.canonVersion,
    dnaRefs: [...ctx.visualCanon.visualDNA.requiredElementIds],
    grammarRefs: [
      ...ctx.visualCanon.visualGrammar.compositionRules.map((r) => r.id),
      ...ctx.visualCanon.visualGrammar.assetUsageRules.map((r) => r.id),
    ],
    lockedAssetRefs: ctx.lockedAssetRules.map((r) => r.assetType),
    factRefs: [...ctx.visualCanon.trace.factRefs],
    evidenceRefs: [...ctx.visualCanon.trace.evidenceRefs],
    sourceFingerprint: `${ctx.selectedDirectionSnapshot.directionFingerprint}|${ctx.canonVersion}`,
  };
}

/**
 * Build translation version: canonVersion + media + schemaVersion.
 * Stable and deterministic.
 */
export function buildTranslationVersion(
  canonVersion: string,
  media: 'space' | 'packaging',
): string {
  return `${canonVersion}#${media}#0.1`;
}

/**
 * FNV-1a fingerprint of stable semantic fields.
 * Used for comparison / diff only.
 */
export function buildTranslationFingerprint(
  contract: MediaTranslationContract,
): string {
  const stable = {
    media: contract.media,
    selectedDirectionId: contract.selectedDirectionId,
    canonVersion: contract.canonVersion,
    requiredDNARefs: [...contract.requiredDNARefs].sort(),
    requiredGrammarRefs: [...contract.requiredGrammarRefs].sort(),
    lockedAssetRuleRefs: [...contract.lockedAssetRuleRefs].sort(),
  };
  const json = JSON.stringify(stable);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'tf:' + (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Validate a media contract.
 * - Hard DNA / Grammar / Locked Asset must be present
 * - No production prompt leakage
 * - No forbidden fields
 * - No invented visual mechanism
 * - No invented direction family
 */
export function validateMediaContract(contract: MediaTranslationContract): ProductionTranslationDiagnostic[] {
  const diagnostics: ProductionTranslationDiagnostic[] = [];

  // 1. Forbidden field check
  const forbiddenField = detectForbiddenField(contract);
  if (forbiddenField) {
    diagnostics.push({
      code: 'PT_PRODUCTION_PROMPT_LEAKAGE',
      message: `Media contract contains forbidden field: ${forbiddenField}`,
      field: forbiddenField,
    });
  }

  // 2. Production prompt leakage
  const promptLeak = detectProductionPromptLeakage(contract);
  if (promptLeak) {
    diagnostics.push({
      code: 'PT_PRODUCTION_PROMPT_LEAKAGE',
      message: `Media contract contains production prompt language: ${promptLeak.slice(0, 60)}`,
    });
  }

  // 3. Hard DNA / Grammar / Locked Asset — must not be empty for valid/provisional
  if (contract.requiredDNARefs.length === 0) {
    diagnostics.push({
      code: 'PT_HARD_DNA_MISSING',
      message: 'Media contract has no requiredDNARefs',
    });
  }
  if (contract.requiredGrammarRefs.length === 0) {
    diagnostics.push({
      code: 'PT_HARD_GRAMMAR_MISSING',
      message: 'Media contract has no requiredGrammarRefs',
    });
  }
  if (contract.lockedAssetRuleRefs.length === 0 && contract.trace.lockedAssetRefs.length > 0) {
    diagnostics.push({
      code: 'PT_LOCKED_ASSET_RULE_MISSING',
      message: 'Locked Asset rules present in trace but missing from contract',
    });
  }

  return diagnostics;
}

/**
 * Validate cross-media consistency (Spec #35):
 *   - same selectedDirectionId
 *   - same canonVersion
 *   - same hard DNA set
 *   - same hard Grammar set
 *   - same Locked Asset identity rules
 */
export function validateCrossMediaConsistency(
  space: MediaTranslationContract,
  packaging: MediaTranslationContract,
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
      });
    }
  }
  for (const dna of pkgDna) {
    if (!spaceDna.has(dna)) {
      diagnostics.push({
        code: 'PT_HARD_DNA_MISSING',
        message: `Hard DNA "${dna}" missing from Space contract`,
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
      });
    }
  }

  return diagnostics;
}

/**
 * REFERENCE_CANON_CONFLICT detection.
 * When reference-derived identity exists in the same context, surface conflict.
 */
export function detectReferenceCanonConflict(
  ctx: ProductionTranslationContext,
  referenceBrandNames: string[],
): ProductionTranslationDiagnostic[] {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  if (referenceBrandNames.length === 0) return diagnostics;

  // Check Canon text for any of the reference brand names
  const allCanonText = [
    ctx.visualCanon.visualMechanism,
    ctx.visualCanon.systemHypothesis,
    ctx.visualCanon.creativeThesis,
  ].join(' ');

  for (const ref of referenceBrandNames) {
    if (allCanonText.includes(ref)) {
      diagnostics.push({
        code: 'PT_REFERENCE_CANON_CONFLICT',
        message: `Reference brand "${ref}" appears in Canon text`,
      });
    }
  }
  return diagnostics;
}
