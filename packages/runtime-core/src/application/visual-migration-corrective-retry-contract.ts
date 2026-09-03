import type { VisualMigrationCanonV1 } from '@masterpiece/project-contracts/index.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
} from './visual-migration-reference-pack-contract.ts';
import type { VisualMigrationFailureClass } from './visual-migration-audit-contract.ts';

export const VISUAL_MIGRATION_CORRECTIVE_RETRY_SCHEMA =
  'visual-migration-corrective-retry-plan/v1' as const;
export const VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE = 'VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE';
export const VISUAL_MIGRATION_CORRECTIVE_RETRY_LIMIT_REACHED = 'VISUAL_MIGRATION_CORRECTIVE_RETRY_LIMIT_REACHED';
export const VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED = 'VISUAL_MIGRATION_CORRECTIVE_AUTHORITY_CHANGED';
export const VISUAL_MIGRATION_CORRECTIVE_CAPABILITY_CHANGED = 'VISUAL_MIGRATION_CORRECTIVE_CAPABILITY_CHANGED';
export const VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED = 'VISUAL_MIGRATION_CORRECTIVE_REFERENCE_SET_CHANGED';
export const VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT = 'VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT';
export const VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED = 'VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED';

export type VisualMigrationCorrectionAction = 'strengthen_source_identity'
  | 'restore_target_content_hierarchy' | 'restore_structure'
  | 'strengthen_palette_alignment' | 'strengthen_graphic_language'
  | 'strengthen_transfer_system' | 'suppress_reference_identity'
  | 'increase_variation_distance';

export interface VisualMigrationCorrectiveRetryPlanV1 {
  schemaVersion: typeof VISUAL_MIGRATION_CORRECTIVE_RETRY_SCHEMA;
  correctionPlanId: string;
  correctionPlanFingerprint: string;
  projectId: string;
  sourceRunId: string;
  sourceAuditId: string;
  parentSnapshotId: string;
  parentSnapshotFingerprint: string;
  policyId: string;
  canonId: string;
  capabilityFingerprint: string;
  selectedCandidateIds: string[];
  failureClasses: VisualMigrationFailureClass[];
  correctionActions: VisualMigrationCorrectionAction[];
  canonRulesUsed: string[];
  promptOverlay: string;
  retryConstraints: {
    samePolicyRequired: true;
    sameCapabilityRequired: true;
    exactReferenceSetRequired: true;
    maximumAutomaticRetryDepth: 1;
  };
  createdAt: string;
}

const ACTIONS: Record<Exclude<VisualMigrationFailureClass, 'REFERENCE_CONFLICT'>, VisualMigrationCorrectionAction[]> = {
  SOURCE_IDENTITY_LOSS: ['strengthen_source_identity'],
  TARGET_IDENTITY_LOSS: ['restore_target_content_hierarchy'],
  STRUCTURE_DRIFT: ['restore_structure'],
  PALETTE_DRIFT: ['strengthen_palette_alignment'],
  GRAPHIC_LANGUAGE_DRIFT: ['strengthen_graphic_language'],
  STYLE_DRIFT: ['strengthen_transfer_system'],
  NEAR_COPY_RISK: ['suppress_reference_identity', 'increase_variation_distance'],
};

function error(code: string, message: string): Error { return Object.assign(new Error(message), { code }); }
function statements(rules: Array<{ statement: string }> | undefined): string {
  return (rules ?? []).map((rule) => rule.statement.trim()).filter(Boolean).join('; ');
}

export function correctionCanonRulesUsed(
  actions: VisualMigrationCorrectionAction[],
  canon: VisualMigrationCanonV1,
): string[] {
  const rules: string[] = [];
  const add = (values: string[]) => {
    for (const value of values.map((item) => item.trim()).filter(Boolean)) {
      if (!rules.includes(value)) rules.push(value);
    }
  };
  if (actions.includes('strengthen_source_identity')) add([
    ...canon.projectIdentity.requiredIdentityRules.map((rule) => rule.statement),
    ...canon.projectIdentity.lockedFacts,
    ...canon.projectIdentity.lockedAssetIds,
  ]);
  if (actions.includes('strengthen_palette_alignment')) add(canon.transferSystem.color.map((rule) => rule.statement));
  if (actions.includes('strengthen_graphic_language')) add(canon.transferSystem.graphicLanguage.map((rule) => rule.statement));
  if (actions.includes('strengthen_transfer_system')) add([
    ...canon.transferSystem.color, ...canon.transferSystem.layoutAndTypography,
    ...canon.transferSystem.graphicLanguage, ...canon.transferSystem.materialAndPhotography,
    ...canon.transferSystem.extensionMechanism,
  ].map((rule) => rule.statement));
  if (actions.includes('suppress_reference_identity')) add([
    ...canon.prohibitedTransfer.referenceBrandNames, ...canon.prohibitedTransfer.referenceLogos,
    ...canon.prohibitedTransfer.referenceSlogans, ...canon.prohibitedTransfer.referenceSignatureGraphics,
    ...canon.prohibitedTransfer.referenceProprietaryPatterns, ...canon.prohibitedTransfer.prohibitedMutations,
  ]);
  return rules;
}

export function correctionActionsFor(failures: VisualMigrationFailureClass[]): VisualMigrationCorrectionAction[] {
  if (!failures.length || failures.includes('REFERENCE_CONFLICT')) {
    throw error(VISUAL_MIGRATION_CORRECTIVE_NOT_ELIGIBLE, 'The audit is not eligible for automatic correction.');
  }
  const result: VisualMigrationCorrectionAction[] = [];
  for (const failure of failures) {
    if (failure === 'REFERENCE_CONFLICT') continue;
    for (const action of ACTIONS[failure]) if (!result.includes(action)) result.push(action);
  }
  return result;
}

export function renderVisualMigrationCorrectionOverlay(input: {
  actions: VisualMigrationCorrectionAction[];
  canon: VisualMigrationCanonV1;
  targetContentRules?: string[];
  structureRules?: string[];
}): string {
  const lines = ['[VISUAL MIGRATION CORRECTIVE OVERLAY v1]', 'Apply only these bounded corrections; preserve the original task and evidence set.'];
  const { actions, canon } = input;
  if (actions.includes('strengthen_source_identity')) lines.push(`Preserve current-project identity: ${statements(canon.projectIdentity.requiredIdentityRules)}. Locked facts/assets: ${[...canon.projectIdentity.lockedFacts, ...canon.projectIdentity.lockedAssetIds].join('; ')}.`);
  if (actions.includes('restore_target_content_hierarchy')) {
    const content = (input.targetContentRules ?? []).map((item) => item.trim()).filter(Boolean);
    lines.push(content.length
      ? `Restore required target content hierarchy: ${content.join('; ')}.`
      : 'Restore only the target content hierarchy explicitly required by the original compiled prompt.');
  }
  if (actions.includes('restore_structure')) {
    const structure = (input.structureRules ?? []).map((item) => item.trim()).filter(Boolean);
    lines.push(structure.length
      ? `Restore only the required existing structure: ${structure.join('; ')}.`
      : 'Restore only the structure explicitly required by the original compiled prompt; do not introduce any new structure.');
  }
  if (actions.includes('strengthen_palette_alignment')) lines.push(`Strengthen transferable color behavior: ${statements(canon.transferSystem.color)}.`);
  if (actions.includes('strengthen_graphic_language')) lines.push(`Strengthen transferable graphic language: ${statements(canon.transferSystem.graphicLanguage)}.`);
  if (actions.includes('strengthen_transfer_system')) lines.push(`Strengthen abstract transferable visual principles: ${[
    ...canon.transferSystem.color, ...canon.transferSystem.layoutAndTypography,
    ...canon.transferSystem.graphicLanguage, ...canon.transferSystem.materialAndPhotography,
    ...canon.transferSystem.extensionMechanism,
  ].map((rule) => rule.statement).join('; ')}.`);
  if (actions.includes('suppress_reference_identity')) lines.push(`Remove foreign logo/text/identity and do not reproduce signature motifs. Prohibited reference transfer: ${[
    ...canon.prohibitedTransfer.referenceBrandNames, ...canon.prohibitedTransfer.referenceLogos,
    ...canon.prohibitedTransfer.referenceSlogans, ...canon.prohibitedTransfer.referenceSignatureGraphics,
    ...canon.prohibitedTransfer.referenceProprietaryPatterns, ...canon.prohibitedTransfer.prohibitedMutations,
  ].join('; ')}.`);
  if (actions.includes('increase_variation_distance')) lines.push('Preserve only abstract transferable principles; change composition and motif arrangement sufficiently to avoid a near copy.');
  return lines.join('\n');
}

export function buildVisualMigrationCorrectiveRetryPlan(input: {
  projectId: string; sourceRunId: string; sourceAuditId: string;
  parentSnapshotId: string; parentSnapshotFingerprint: string;
  policyId: string; canon: VisualMigrationCanonV1; capabilityFingerprint: string;
  selectedCandidateIds: string[]; failureClasses: VisualMigrationFailureClass[];
  targetContentRules?: string[]; structureRules?: string[]; createdAt: string;
}): VisualMigrationCorrectiveRetryPlanV1 {
  const correctionActions = correctionActionsFor(input.failureClasses);
  const canonRulesUsed = correctionCanonRulesUsed(correctionActions, input.canon);
  const promptOverlay = renderVisualMigrationCorrectionOverlay({ actions: correctionActions, canon: input.canon, targetContentRules: input.targetContentRules, structureRules: input.structureRules });
  const semantic = { projectId: input.projectId, sourceRunId: input.sourceRunId, sourceAuditId: input.sourceAuditId,
    parentSnapshotId: input.parentSnapshotId, parentSnapshotFingerprint: input.parentSnapshotFingerprint,
    policyId: input.policyId, canonId: input.canon.canonId, capabilityFingerprint: input.capabilityFingerprint,
    selectedCandidateIds: input.selectedCandidateIds, failureClasses: input.failureClasses, correctionActions, canonRulesUsed, promptOverlay };
  const digest = sha256Fingerprint(canonicalSerializeVisualMigrationValue(semantic));
  const withoutFingerprint: Omit<VisualMigrationCorrectiveRetryPlanV1, 'correctionPlanFingerprint'> = {
    schemaVersion: VISUAL_MIGRATION_CORRECTIVE_RETRY_SCHEMA,
    correctionPlanId: `vmcrp-${digest.slice('sha256:'.length, 'sha256:'.length + 32)}`,
    ...semantic,
    retryConstraints: { samePolicyRequired: true, sameCapabilityRequired: true, exactReferenceSetRequired: true, maximumAutomaticRetryDepth: 1 },
    createdAt: input.createdAt,
  };
  return { ...withoutFingerprint, correctionPlanFingerprint: sha256Fingerprint(canonicalSerializeVisualMigrationValue(withoutFingerprint)) };
}

export function computeVisualMigrationCorrectionPlanFingerprint(
  value: Omit<VisualMigrationCorrectiveRetryPlanV1, 'correctionPlanFingerprint'> | VisualMigrationCorrectiveRetryPlanV1,
): string {
  const { correctionPlanFingerprint: _ignored, ...payload } = value as VisualMigrationCorrectiveRetryPlanV1;
  return sha256Fingerprint(canonicalSerializeVisualMigrationValue(payload));
}

export function validateVisualMigrationCorrectiveRetryPlanV1(value: unknown): VisualMigrationCorrectiveRetryPlanV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error(VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT, 'Correction Plan must be an object.');
  const plan = value as VisualMigrationCorrectiveRetryPlanV1;
  if (plan.schemaVersion !== VISUAL_MIGRATION_CORRECTIVE_RETRY_SCHEMA
    || !/^vmcrp-[a-f0-9]{32}$/u.test(plan.correctionPlanId)
    || !/^sha256:[a-f0-9]{64}$/u.test(plan.correctionPlanFingerprint)
    || computeVisualMigrationCorrectionPlanFingerprint(plan) !== plan.correctionPlanFingerprint
    || !plan.projectId || !plan.sourceRunId || !plan.sourceAuditId
    || !Array.isArray(plan.selectedCandidateIds) || new Set(plan.selectedCandidateIds).size !== plan.selectedCandidateIds.length
    || !Array.isArray(plan.failureClasses) || !Array.isArray(plan.correctionActions) || !Array.isArray(plan.canonRulesUsed)
    || !plan.promptOverlay.startsWith('[VISUAL MIGRATION CORRECTIVE OVERLAY v1]')
    || plan.retryConstraints?.maximumAutomaticRetryDepth !== 1
    || !Number.isFinite(Date.parse(plan.createdAt))) {
    throw error(VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT, 'Correction Plan integrity validation failed.');
  }
  return plan;
}
