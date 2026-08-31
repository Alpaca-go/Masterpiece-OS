import { createHash } from 'node:crypto';
import type { CreativeDirectionSourceFingerprint, StrategyContribution, VisualContribution } from './creative-direction-contracts.ts';

export function buildCreativeDirectionSourceFingerprint(input: {
  contextRevision: number;
  strategy: StrategyContribution | null;
  visual: VisualContribution | null;
}): CreativeDirectionSourceFingerprint {
  const authority = {
    contextRevision: input.contextRevision,
    strategy: input.strategy ? {
      runId: input.strategy.sourceRunId,
      revision: input.strategy.sourceRevision,
      fingerprint: input.strategy.sourceFingerprint,
    } : undefined,
    visualResearch: input.visual ? {
      sessionId: input.visual.sourceSessionId,
      revision: input.visual.sourceRevision,
      fingerprint: input.visual.sourceFingerprint,
    } : undefined,
  };
  return {
    ...authority,
    digest: createHash('sha256').update(JSON.stringify(authority)).digest('hex'),
  };
}

export function sameCreativeDirectionSourceFingerprint(
  left: CreativeDirectionSourceFingerprint | undefined,
  right: CreativeDirectionSourceFingerprint,
): boolean {
  return Boolean(left?.digest) && left?.digest === right.digest;
}
