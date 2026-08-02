import type {
  AnalysisDeliverable,
  MissingFieldIssue,
  SchemaValidationIssue,
} from './contracts.ts';
import { repairPolicyForPath } from './field-repair-policy.ts';
import { collectEvidenceRefs } from './path-utils.ts';

export function classifyMissingFields(input: {
  packet: unknown;
  deliverable: AnalysisDeliverable;
  issues: SchemaValidationIssue[];
}): MissingFieldIssue[] {
  return input.issues.map((issue) => {
    const policy = repairPolicyForPath(issue.path);
    if (!policy) {
      return {
        path: issue.path,
        code: issue.code,
        severity: 'fatal',
        repairStrategy: 'none',
        appliesTo: [input.deliverable],
        requiredEvidencePaths: [],
        availableEvidenceRefs: issue.availableEvidenceRefs ?? [],
        message: issue.message,
      };
    }
    const relevant = policy.appliesTo.includes(input.deliverable);
    const availableEvidenceRefs = issue.availableEvidenceRefs
      ?? collectEvidenceRefs(input.packet, policy.requiredEvidencePaths);
    const evidenceRequiredButUnavailable = relevant
      && policy.severity === 'repairable'
      && policy.repairStrategy === 'ai_from_evidence'
      && availableEvidenceRefs.length === 0;
    const severity = evidenceRequiredButUnavailable
      ? 'requires_confirmation'
      : relevant ? policy.severity : 'optional';
    const repairStrategy = evidenceRequiredButUnavailable
      ? 'ask_user'
      : relevant
      ? policy.repairStrategy
      : 'ignore_for_current_task';
    return {
      path: issue.path,
      code: relevant ? issue.code || policy.code : 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE',
      severity,
      repairStrategy,
      appliesTo: [...policy.appliesTo],
      requiredEvidencePaths: [...policy.requiredEvidencePaths],
      availableEvidenceRefs,
      message: evidenceRequiredButUnavailable
        ? `${issue.message} Current project evidence is insufficient for automatic repair.`
        : issue.message,
    };
  });
}
