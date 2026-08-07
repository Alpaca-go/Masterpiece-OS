import { createVNextTaskContract } from './task-contract.js';
import { routeVNextTemplates } from './template-router.js';
import { compileVNextPrompt } from './prompt-compiler.js';
import { createSeedreamVNextAdapter } from './seedream-adapter.js';
import { runPromptPreflightGate } from '../gates/prompt-preflight-gate.js';
import {
  compilePhase9bSpacePrompt,
  runSpaceQualityGate,
} from './space-quality/index.js';
import { measurePromptBudget } from './space-quality/prompt-budget.js';

// Feature flag (recovery doc §10.1):
//   MASTERPIECE_SPACE_COMPILER_MODE=phase9b_quality | vnext_legacy
// Default stays vnext_legacy until the real-provider A/B (R6) passes; R7 flips
// the default. Packaging always uses the existing compiler.
export const SPACE_COMPILER_MODES = Object.freeze({
  PHASE9B_QUALITY: 'phase9b_quality',
  VNEXT_LEGACY: 'vnext_legacy',
});

export function resolveSpaceCompilerMode(env = process.env) {
  const raw = (env.MASTERPIECE_SPACE_COMPILER_MODE || '').trim();
  if (raw === SPACE_COMPILER_MODES.PHASE9B_QUALITY) return SPACE_COMPILER_MODES.PHASE9B_QUALITY;
  return SPACE_COMPILER_MODES.VNEXT_LEGACY;
}

export function compileVNextImageGeneration(input) {
  const started = performance.now();
  const adapter = input.adapter || createSeedreamVNextAdapter({ model: input.model });
  const packetLogoAssetIds = input.projectContext?.visualDecisionPacket?.lockedAssets
    ?.filter((item) => item?.type === 'logo')
    .map((item) => item.assetId)
    || [];
  const logoAssetIds = packetLogoAssetIds.length
    ? packetLogoAssetIds
    : input.projectContext?.promptSourceObject?.lockedAssets?.logoAssetIds
    || input.projectContext?.lockedAssets?.logoAssetIds
    || [];
  const preferredLogoAssetId = packetLogoAssetIds[0]
    || input.projectContext?.promptSourceObject?.lockedAssets?.preferredLogoAssetId
    || logoAssetIds[0]
    || null;
  const inferredLogoUsageMode = preferredLogoAssetId ? 'post_composite' : 'blank_area';
  const logoUsageMode = input.task?.logoUsageMode || inferredLogoUsageMode;
  if (preferredLogoAssetId && logoUsageMode !== 'post_composite') {
    throw Object.assign(new Error(
      'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: confirmed Logo must use post-composite mode.',
    ), { code: 'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED' });
  }
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds)
    ? input.task.referenceAssetIds
    : [];
  const referenceAssetIds = logoUsageMode === 'reference' && preferredLogoAssetId
    ? [...new Set([preferredLogoAssetId, ...requestedReferenceIds])]
    : requestedReferenceIds.filter((assetId) => !logoAssetIds.includes(assetId));
  const taskContract = createVNextTaskContract({
    ...input.task,
    logoUsageMode,
    referenceAssetIds,
  }, { now: input.now });
  const route = routeVNextTemplates(taskContract, { model: adapter.id });

  const spaceMode = taskContract.deliverableFamily === 'space'
    ? resolveSpaceCompilerMode()
    : null;

  let compiledPrompt;
  if (spaceMode === SPACE_COMPILER_MODES.PHASE9B_QUALITY) {
    compiledPrompt = compilePhase9bSpaceGeneration({
      input,
      taskContract,
      adapter,
      referenceAssetIds,
      preferredLogoAssetId,
      started,
    });
  } else {
    compiledPrompt = compileVNextPrompt({
      projectContext: input.projectContext,
      taskContract,
      route,
      adapter,
      projectPromptAsset: input.projectPromptAsset,
      approvedCreativeDecision: input.approvedCreativeDecision,
      userConfirmedVisualDecision: input.userConfirmedVisualDecision,
    });
    compiledPrompt.preflightReport = runPromptPreflightGate({
      finalPrompt: compiledPrompt.finalPrompt,
      taskContract,
      projectContract: compiledPrompt.projectGenerationContract,
      packagingTranslation: compiledPrompt.packagingTranslation,
      spatialTranslation: compiledPrompt.spatialTranslation,
      requireProjectContract: Boolean(input.projectContext?.visualDecisionPacket),
    });
  }

  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}

// Compile a space deliverable through the Phase 9B-quality building-led
// compiler. Returns a compiledPrompt shaped compatibly with the vNext compiler
// (finalPrompt/editablePrompt/blocks/trace/referenceAssetIds/logoUsageMode) so
// downstream service code and the adapter don't need a separate branch.
function compilePhase9bSpaceGeneration({ input, taskContract, adapter, referenceAssetIds, preferredLogoAssetId, started }) {
  const packet = input.projectContext?.visualDecisionPacket;
  if (!packet) {
    throw Object.assign(
      new Error('SPACE_PHASE9B_SOURCE_INSUFFICIENT: Phase 9B quality mode requires a V5 VisualDecisionPacket'),
      { code: 'SPACE_PHASE9B_SOURCE_INSUFFICIENT' },
    );
  }
  const result = compilePhase9bSpacePrompt({
    packet,
    taskContract,
    projectContext: input.projectContext,
    brandKey: input.brandKey || input.projectContext?.brandKey || null,
    anchorCriteria: input.anchorCriteria,
    adapter,
    referencePolicy: { mode: SPACE_COMPILER_MODES.PHASE9B_QUALITY },
  });

  // The Phase 9B golden prompt runs ~9.5k chars for JZMX; assert the budget
  // (which blocks above the adapter limit) instead of relying on the legacy
  // compiler's 13-block length assumptions.
  const budget = result.budget;
  if (budget.status === 'blocked') {
    throw Object.assign(
      new Error(`SPACE_PROMPT_BUDGET_BLOCKED: ${budget.findings.map((f) => f.code).join(', ')}`),
      { code: 'SPACE_PROMPT_BUDGET_BLOCKED', budget },
    );
  }

  // R5 quality gate — architecture/ordering/positive-density checks run at
  // compile time with a reference bypass (the actual reference count is only
  // known after the service resolves user/implicit/architecture-anchor refs).
  // The SPACE_REFERENCE_MISSING rule is enforced at start() time in
  // vnext-service via the reference policy.
  const blocksById = Object.fromEntries(result.blocks.map((b) => [b.id, b]));
  const qualityGate = runSpaceQualityGate({
    finalPrompt: result.finalPrompt,
    blockIds: result.blockIds,
    blocksById,
    referenceCount: 0,
    hasExplicitReferenceBypass: true,
  });
  const blocking = qualityGate.findings.filter((f) => f.severity === 'block');
  if (blocking.length) {
    throw Object.assign(
      new Error(`SPACE_QUALITY_GATE_BLOCKED: ${blocking.map((f) => f.code).join(', ')}`),
      { code: 'SPACE_QUALITY_GATE_BLOCKED', findings: qualityGate.findings },
    );
  }

  const logoUsageMode = preferredLogoAssetId ? 'post_composite' : 'blank_area';

  return {
    schemaVersion: '1.0',
    taskContract,
    // Phase 9B path does not use the vNext template router.
    route: { familyTemplateId: null, subtypeTemplateId: null, shotTemplateId: null, templateVersions: [] },
    blocks: result.blocks,
    sourceMap: Object.fromEntries(result.blocks.map((b) => [b.id, result.trace.blockSources?.[b.id] ?? []])),
    projectGenerationContract: null,
    spatialTranslation: result.layers?._raw || null,
    // Phase 9B path enforces its own fail-closed source adapter + prompt
    // budget at compile time. R5 adds dedicated SPACE_* quality findings into
    // this report; the SPACE_REFERENCE_MISSING finding is populated at start()
    // time by vnext-service once the actual reference count is known.
    preflightReport: {
      schemaVersion: '1.0',
      status: qualityGate.status,
      findings: qualityGate.findings,
      checkedAt: qualityGate.checkedAt,
    },
    effectiveVisualDecisionPacket: packet,
    userConfirmedVisualDecision: null,
    completeness: {
      complete: true,
      requiredBlockIds: result.blockIds,
      missingBlockIds: [],
      conflictCount: 0,
      coverage: { phase9b: 1, architectureFirst: 1 },
    },
    finalPrompt: result.finalPrompt,
    editablePrompt: result.editablePrompt,
    negativeConstraints: result.layers?.negatives || [],
    referenceAssetIds,
    logoUsageMode,
    compiledAt: new Date().toISOString(),
    phase9b: {
      compilerId: result.compilerId,
      compilerVersion: result.compilerVersion,
      sourceAdapterVersion: result.sourceAdapterVersion,
      anchorIds: result.anchors.map((a) => a.id),
      referenceImages: result.referenceImages,
      architectureContextIncluded: result.blockIds.includes('architecture_context'),
      budget: {
        chars: budget.chars,
        positiveRatio: budget.positiveRatio,
        negativeRatio: budget.negativeRatio,
      },
    },
    trace: {
      compilerId: result.trace.compilerId,
      compilerVersion: result.trace.compilerVersion,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      sourceFingerprint: result.trace.sourceFingerprint,
      blockIds: result.blockIds,
      promptCharacters: budget.chars,
      compileDurationMs: Number((performance.now() - started).toFixed(3)),
      phase9b: true,
      anchorIds: result.trace.anchorIds,
    },
  };
}
