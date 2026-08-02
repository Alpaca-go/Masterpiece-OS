import type {
  AnalysisDeliverable,
  FieldRepairPolicy,
} from './contracts.ts';
import {
  requiredFieldRulesForDeliverable,
  type RequiredFieldRule,
} from './deliverable-sufficiency.ts';
import { FIELD_REPAIR_POLICIES } from './field-repair-policy.ts';

export interface SelfHealingContractViolation {
  deliverable: AnalysisDeliverable;
  path: string;
  code: string;
  reason:
    | 'missing_policy'
    | 'code_mismatch'
    | 'deliverable_not_covered'
    | 'non_repairing_strategy'
    | 'repairable_without_evidence'
    | 'confirmation_strategy_mismatch';
}

export function validateSelfHealingContractCoverage(input: {
  deliverables?: AnalysisDeliverable[];
  rulesForDeliverable?: (deliverable: AnalysisDeliverable) => readonly RequiredFieldRule[];
  policies?: readonly FieldRepairPolicy[];
} = {}): SelfHealingContractViolation[] {
  const deliverables = input.deliverables ?? ['space', 'packaging', 'poster', 'vi'];
  const rulesForDeliverable = input.rulesForDeliverable ?? requiredFieldRulesForDeliverable;
  const policies = input.policies ?? FIELD_REPAIR_POLICIES;
  const violations: SelfHealingContractViolation[] = [];

  for (const deliverable of deliverables) {
    for (const rule of rulesForDeliverable(deliverable)) {
      const policy = policies.find((candidate) => candidate.path === rule.path);
      if (!policy) {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'missing_policy' });
        continue;
      }
      if (policy.code !== rule.code) {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'code_mismatch' });
      }
      if (!policy.appliesTo.includes(deliverable)) {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'deliverable_not_covered' });
      }
      if (policy.repairStrategy === 'none' || policy.repairStrategy === 'ignore_for_current_task') {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'non_repairing_strategy' });
      }
      if (policy.severity === 'repairable'
        && policy.repairStrategy === 'ai_from_evidence'
        && policy.requiredEvidencePaths.length === 0) {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'repairable_without_evidence' });
      }
      if (policy.severity === 'requires_confirmation' && policy.repairStrategy !== 'ask_user') {
        violations.push({ deliverable, path: rule.path, code: rule.code, reason: 'confirmation_strategy_mismatch' });
      }
    }
  }
  return violations;
}
