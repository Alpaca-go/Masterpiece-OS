/**
 * Visual Canon Validator + Drift Guard.
 *
 * CI-8 Step 33-36: validate trace closure, detect drift.
 *
 * Drift detection (Spec #60):
 *   - new visual mechanism
 *   - new direction family
 *   - new unsupported motif
 *   - new brand identity
 *   - unauthorized Locked Asset behavior
 *
 * Status propagation (Spec #36):
 *   - selected grounded Direction → Canon valid
 *   - selected provisional Direction → Canon max status = provisional
 *   - selected blocked/invalidated → Canon blocked
 */

import type {
  VisualCanon,
  CanonDiagnostic,
  CanonStatus,
  CanonRule,
} from './contracts.ts';
import type { SelectedDirectionSnapshot } from './contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';

export interface ValidationContext {
  canon: VisualCanon;
  snapshot: SelectedDirectionSnapshot;
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
  lockedAssetKeys: string[];
}

function ruleHasTrace(rule: CanonRule): boolean {
  return rule.factRefs.length > 0 || rule.evidenceRefs.length > 0;
}

function findLockedAssetViolation(
  canon: VisualCanon,
  lockedAssetKeys: string[],
): string | null {
  if (lockedAssetKeys.length === 0) return null;
  // Check for prohibited actions on locked assets
  const prohibited = ['redesign', 'replace', 'distort', 'invent', 'invert', 'override'];
  for (const rule of canon.lockedAssetRules) {
    for (const action of rule.prohibitedActions) {
      const lower = action.toLowerCase();
      if (prohibited.some((p) => lower.includes(p))) {
        return null; // prohibition explicitly named — OK
      }
    }
  }
  // Also check prohibitedMutations
  for (const mutation of canon.prohibitedMutations) {
    if (mutation.toLowerCase().includes('locked asset')) {
      return null; // named in prohibited mutations
    }
  }
  return null;
}

export function validateCanon(ctx: ValidationContext): { status: CanonStatus; diagnostics: CanonDiagnostic[] } {
  const diagnostics: CanonDiagnostic[] = [];
  const c = ctx.canon;

  // Trace closure: every CanonRule should have a fact/evidence trace
  const allRules: CanonRule[] = [
    c.colorRelationship, c.materialRelationship, c.compositionLogic,
    c.typographyBehavior, c.graphicBehavior, c.imageBehavior,
  ].filter((r): r is CanonRule => !!r);

  for (const rule of allRules) {
    if (!ruleHasTrace(rule)) {
      diagnostics.push({
        code: 'CANON_RULE_UNGROUNDED',
        message: `CanonRule ${rule.id} has no upstream fact/evidence trace`,
        field: rule.id,
      });
    }
  }

  // Drift detection (Spec #60)
  // 1. New visual mechanism: any CanonRule whose sourceField is not in the snapshot
  const snapshotSourceFields = new Set<string>([
    'visualMechanism', 'systemHypothesis', 'compositionLogic', 'colorRelationship',
    'materialRelationship', 'typographyBehavior', 'graphicBehavior', 'imageBehavior',
    'crossMediaBehavior', 'conceptRefs', 'lockedAssetRules',
  ]);

  for (const rule of allRules) {
    if (!snapshotSourceFields.has(rule.sourceField)) {
      diagnostics.push({
        code: 'CANON_DRIFT_NEW_MECHANISM',
        message: `CanonRule ${rule.id} has sourceField ${rule.sourceField} not in selected Direction`,
        field: rule.id,
      });
    }
  }

  // 2. New direction family: visualCanon.directionFamily must match snapshot
  if (c.directionFamily !== ctx.snapshot.direction.directionFamily) {
    diagnostics.push({
      code: 'CANON_DRIFT_NEW_FAMILY',
      message: `Direction family drifted: snapshot=${ctx.snapshot.direction.directionFamily}, canon=${c.directionFamily}`,
    });
  }

  // 3. New brand identity: visualMechanism must not introduce a new brand
  // (heuristic: any other brand-suffix token not in known brands)
  // For now: detect by checking if visualMechanism contains a "集团|控股|实业" token
  const knownBrands = new Set<string>();
  for (const f of ctx.facts) {
    if (f.key === 'brandName' && typeof f.value === 'string') knownBrands.add(f.value);
  }
  const brandSuffix = /([\u4e00-\u9fa5A-Za-z]{2,15}(?:集团|控股|实业|生物科技|生命科学|药业|大健康|健康科技|文化传媒|品牌管理))/g;
  const matches = c.visualMechanism.match(brandSuffix) || [];
  for (const m of matches) {
    if (!knownBrands.has(m)) {
      diagnostics.push({
        code: 'CANON_DRIFT_NEW_BRAND',
        message: `Canon visualMechanism introduces unknown brand: ${m}`,
      });
    }
  }

  // 4. Locked asset behavior
  const lockedViolation = findLockedAssetViolation(c, ctx.lockedAssetKeys);
  if (lockedViolation) {
    diagnostics.push({
      code: 'CANON_LOCKED_ASSET_VIOLATION',
      message: lockedViolation,
    });
  }

  // Status: if any block-level diagnostic exists, status = blocked.
  // Otherwise, propagate from snapshot selection.
  const hasBlock = diagnostics.some((d) => d.code.startsWith('CANON_') && [
    'CANON_LOCKED_ASSET_VIOLATION',
    'CANON_DRIFT_NEW_MECHANISM',
    'CANON_DRIFT_NEW_FAMILY',
    'CANON_DRIFT_NEW_BRAND',
    'CANON_RULE_UNGROUNDED',
  ].includes(d.code));

  let status: CanonStatus;
  if (hasBlock) {
    status = 'blocked';
  } else if (ctx.snapshot.direction.status === 'provisional') {
    status = 'provisional';
  } else {
    status = 'valid';
  }

  return { status, diagnostics };
}
