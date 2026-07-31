import type {
  AnalysisDeliverable,
  MissingFieldIssue,
  RepairPlan,
  RepairPlanBatch,
} from './contracts.ts';
import { MAX_REPAIR_ATTEMPTS } from './contracts.ts';

function overlaps(left: string[], right: string[]): boolean {
  return left.some((item) => right.includes(item));
}

function buildAiBatches(issues: MissingFieldIssue[]): RepairPlanBatch[] {
  const groups: Array<{
    issues: MissingFieldIssue[];
    evidencePaths: string[];
    evidenceRefs: string[];
  }> = [];

  for (const issue of issues) {
    const existing = groups.find((group) => (
      overlaps(group.evidencePaths, issue.requiredEvidencePaths)
    ));
    if (existing) {
      existing.issues.push(issue);
      existing.evidencePaths = [...new Set([
        ...existing.evidencePaths,
        ...issue.requiredEvidencePaths,
      ])];
      existing.evidenceRefs = [...new Set([
        ...existing.evidenceRefs,
        ...issue.availableEvidenceRefs,
      ])];
      continue;
    }
    groups.push({
      issues: [issue],
      evidencePaths: [...issue.requiredEvidencePaths],
      evidenceRefs: [...issue.availableEvidenceRefs],
    });
  }

  return groups.map((group, index) => ({
    id: `repair-batch-${String(index + 1).padStart(2, '0')}`,
    strategy: 'ai_from_evidence',
    fieldPaths: group.issues.map((issue) => issue.path),
    evidencePaths: group.evidencePaths,
    evidenceRefs: group.evidenceRefs,
  }));
}

export function createRepairPlan(input: {
  deliverable: AnalysisDeliverable;
  attempt: number;
  issues: MissingFieldIssue[];
}): RepairPlan {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw Object.assign(new Error('Repair attempt must start at 1.'), {
      code: 'REPAIR_ATTEMPT_INVALID',
    });
  }
  if (input.attempt > MAX_REPAIR_ATTEMPTS) {
    throw Object.assign(
      new Error(`Repair attempts exhausted after ${MAX_REPAIR_ATTEMPTS} attempts.`),
      { code: 'REPAIR_ATTEMPTS_EXHAUSTED' },
    );
  }

  const byStrategy = <T extends MissingFieldIssue['repairStrategy']>(strategy: T) => (
    input.issues.filter((issue) => issue.repairStrategy === strategy)
  );
  const aiIssues = byStrategy('ai_from_evidence').filter((issue) => (
    issue.severity === 'repairable'
  ));

  return {
    deliverable: input.deliverable,
    attempt: input.attempt,
    deterministic: byStrategy('deterministic'),
    aiBatches: buildAiBatches(aiIssues),
    systemDefaults: byStrategy('system_default'),
    ignored: byStrategy('ignore_for_current_task'),
    requiresConfirmation: byStrategy('ask_user'),
    fatal: input.issues.filter((issue) => (
      issue.severity === 'fatal' || issue.repairStrategy === 'none'
    )),
  };
}
