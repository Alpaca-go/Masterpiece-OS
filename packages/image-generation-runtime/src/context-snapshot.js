// @masterpiece/image-generation-runtime/context-snapshot
// §7.3 上下文快照：创建任务时把用到的上游结果冻结为只读快照。
// 后续上游文件变化不得影响已创建的 Run（快照是纯数据变换，不做文件 IO）。

/**
 * 从上游上下文构造 SourceContextSnapshot。
 * @param {object} input
 * @param {import('@masterpiece/project-contracts').ResolvedProjectContext} input.resolvedContext
 * @param {import('@masterpiece/project-contracts').ReferenceStyleCapsule} input.capsule
 * @param {string} input.referenceAnchorRunId
 * @param {string} [input.visualRunId]
 * @param {string} [input.documentRunId]
 * @param {Record<string,string>} [input.upstreamFileHashes]
 * @param {string} input.capturedAt  ISO 时间（由调用方注入，保证可测试与确定性）
 * @returns {import('@masterpiece/image-generation-contracts').SourceContextSnapshot}
 */
export function buildSourceContextSnapshot(input) {
  const {
    resolvedContext,
    capsule,
    referenceAnchorRunId,
    visualRunId,
    documentRunId,
    upstreamFileHashes = {},
    capturedAt,
  } = input ?? {};

  const identity = resolvedContext?.identity ?? {};
  const products = Array.isArray(resolvedContext?.products) ? resolvedContext.products : [];
  const services = Array.isArray(resolvedContext?.services) ? resolvedContext.services : [];

  return {
    schemaVersion: '1.0',
    capturedAt: capturedAt ?? new Date(0).toISOString(),

    brandName: identity.brandName ?? '',
    industry: identity.industry ?? '',
    productsOrServices: [...products, ...services],

    lockedAssets: resolvedContext?.lockedAssets?.lockedFacts ?? [],
    allowedChanges: resolvedContext?.visualPreferences ?? [],
    prohibitedChanges: resolvedContext?.prohibitedDirections ?? [],

    approvedReferenceDirection: capsule?.anchorGoal ?? '',
    inheritedPreferences: capsule?.userPreference ? [capsule.userPreference] : [],
    userAvoidance: capsule?.userAvoidance ?? [],

    upstreamRunIds: {
      visualRunId,
      documentRunId,
      referenceAnchorRunId: referenceAnchorRunId ?? '',
    },

    upstreamFileHashes,
  };
}
