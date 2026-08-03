export function createPackagingGenerationDebug(input) {
  const finalStatus = input.terminalStatus === 'unverified' ? 'unverified'
    : input.terminalStatus === 'failed' ? 'failed'
      : input.automaticRetryCount ? 'passed_after_repair' : 'passed_first_render';
  return {
    schemaVersion: '1.0',
    taskId: input.taskId,
    shotId: input.shotId,
    analysisStatus: input.analysisStatus ?? 'unavailable',
    lockedAssetIds: [...new Set(input.lockedAssetIds ?? [])],
    passes: structuredClone(input.passes ?? []),
    ...(input.initialEvaluation ? { initialEvaluation: structuredClone(input.initialEvaluation) } : {}),
    ...(input.correctionEvaluation ? { correctionEvaluation: structuredClone(input.correctionEvaluation) } : {}),
    selfHealingDecision: structuredClone(input.selfHealingDecision),
    finalStatus,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
