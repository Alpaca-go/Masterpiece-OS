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
    const severity = relevant ? policy.severity : 'optional';
    const repairStrategy = relevant
      ? policy.repairStrategy
      : 'ignore_for_current_task';
    return {
      path: issue.path,
      code: relevant ? issue.code || policy.code : 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE',
      severity,
      repairStrategy,
      appliesTo: [...policy.appliesTo],
      requiredEvidencePaths: [...policy.requiredEvidencePaths],
      availableEvidenceRefs: issue.availableEvidenceRefs
        ?? collectEvidenceRefs(input.packet, policy.requiredEvidencePaths),
      message: issue.message,
    };
  });
}
