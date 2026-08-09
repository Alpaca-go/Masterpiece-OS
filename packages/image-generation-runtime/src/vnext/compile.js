import { createVNextTaskContract } from './task-contract.js';
import { routeVNextTemplates } from './template-router.js';
import { compileVNextPrompt } from './prompt-compiler.js';
import { createSeedreamVNextAdapter } from './seedream-adapter.js';
import { runPromptPreflightGate } from '../gates/prompt-preflight-gate.js';
import {
  assertSpaceGenerationRouteIntegrity,
  compilePhase9bSpacePrompt,
  runSpaceQualityGate,
  validateSpatialSemantics,
} from '../space/index.js';
import crypto from 'node:crypto';

// Feature flag (R9 Productionization):
//   MASTERPIECE_SPACE_COMPILER_MODE=r8_6_golden | phase9b_quality | vnext_legacy
// r8_6_golden is the canonical R9 production mode; phase9b_quality is kept as
// a compatibility alias for the same frozen R8.6-equivalent compiler so
// existing scripts/env keep working. vnext_legacy forces the old vNext
// compiler (debugging/fallback only). Packaging always uses the existing
// packaging compiler (deliverable-family router, R9 §17).
export const SPACE_COMPILER_MODES = Object.freeze({
  R8_6_GOLDEN: 'r8_6_golden',
  PHASE9B_QUALITY: 'phase9b_quality',
  VNEXT_LEGACY: 'vnext_legacy',
});

// Every non-legacy mode resolves to the same frozen R8.6-equivalent compiler
// module (src/space). Default is r8_6_golden (R9.10, after real-provider
// parity PASS); phase9b_quality stays a valid alias for backward compat and
// vnext_legacy is the debugging fallback.
export function resolveSpaceCompilerMode(env = process.env) {
  const raw = (env.MASTERPIECE_SPACE_COMPILER_MODE || '').trim();
  if (raw === SPACE_COMPILER_MODES.VNEXT_LEGACY) return SPACE_COMPILER_MODES.VNEXT_LEGACY;
  if (raw === SPACE_COMPILER_MODES.PHASE9B_QUALITY) return SPACE_COMPILER_MODES.PHASE9B_QUALITY;
  return SPACE_COMPILER_MODES.R8_6_GOLDEN;
}

// True when the resolved space mode uses the frozen R8.6 production compiler
// (both r8_6_golden and the phase9b_quality alias).
export function isProductionSpaceMode(mode) {
  return mode === SPACE_COMPILER_MODES.R8_6_GOLDEN
    || mode === SPACE_COMPILER_MODES.PHASE9B_QUALITY;
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
  if (spaceMode !== null && isProductionSpaceMode(spaceMode)) {
    // R9 deliverable-family router: space -> production Space Compiler
    // (src/space, frozen R8.6-equivalent).
    compiledPrompt = compilePhase9bSpaceGeneration({
      input,
      taskContract,
      adapter,
      referenceAssetIds,
      preferredLogoAssetId,
      started,
      compilerMode: spaceMode,
      enforceSpatialSemantics: input.task?.generationBasis === 'standard'
        || input.task?.generationBasis === 'reference_first',
    });
  } else {
    // Non-space (packaging / vi / poster) -> existing vNext compiler
    // (packaging keeps its own compiler; legacy space debug uses this path).
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
function compilePhase9bSpaceGeneration({ input, taskContract, adapter, referenceAssetIds, preferredLogoAssetId, started, compilerMode = SPACE_COMPILER_MODES.R8_6_GOLDEN, enforceSpatialSemantics = false }) {
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
    referencePolicy: { mode: compilerMode },
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

  const spatialSemanticReport = enforceSpatialSemantics
    ? validateSpatialSemantics(packet.mediaTranslations?.spatial ?? {})
    : { status: 'pass', findings: [], skipped: 'legacy_contract_without_generation_basis' };
  const compiledPrompt = {
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
      // R9 §20 trace schema: every space run records a structured
      // spaceGeneration block for image-level regression tracing.
      spaceGeneration: {
        compilerId: result.trace.compilerId,
        compilerVersion: result.trace.compilerVersion,
        sourceAdapterVersion: result.sourceAdapterVersion,
        semanticSeparationVersion: result.layers?.semantic?.provenance?.version ?? null,
        architectureAnchorIds: result.anchors.map((a) => a.id),
        // R10.2 §27: generationBasis is the UI-facing route; referenceMode is
        // its runtime equivalent (standard <-> text_only, reference_first <->
        // reference_assisted). Both are recorded for traceability.
        generationBasis: taskContract.generationBasis,
        referenceMode: taskContract.generationBasis === 'reference_first'
          ? 'reference_assisted'
          : 'text_only',
        referenceIds: referenceAssetIds,
        referenceSources: [],
        promptCharacters: budget.chars,
        architectureCharacters: countCharsForBlocks(result.blocks, ARCHITECTURE_BLOCK_IDS),
        brandCharacters: countCharsForBlocks(result.blocks, BRAND_BLOCK_IDS),
        negativeCharacters: countCharsForBlocks(result.blocks, NEGATIVE_BLOCK_IDS),
        promptHash: sha256Hex(result.finalPrompt),
        provider: 'seedream',
        model: input.model ?? null,
      },
    },
  };
  const integrity = assertSpaceGenerationRouteIntegrity({
    taskContract,
    compilerMode,
    trace: compiledPrompt.trace,
    blockIds: result.blockIds,
    providerReferenceCount: referenceAssetIds.length,
    referenceMode: compiledPrompt.trace.spaceGeneration.referenceMode,
    referenceSources: referenceAssetIds.map(() => 'user_explicit'),
    spatialSemanticReport,
  });
  compiledPrompt.trace.spaceGeneration.canonicalCompilerMode = integrity.canonicalCompilerMode;
  compiledPrompt.trace.spaceGeneration.blockIds = result.blockIds;
  compiledPrompt.trace.spaceGeneration.spatialSemanticReport = spatialSemanticReport;
  compiledPrompt.trace.spaceGeneration.routeIntegrity = integrity.routeIntegrity;
  return compiledPrompt;
}

// R9 §20 trace helpers: substantive character counts per block group.
const ARCHITECTURE_BLOCK_IDS = Object.freeze([
  'spatial_intent',
  'architecture_language',
  'architecture_context',
  'architecture_function_bridge',
  'architectural_concept',
  'architecture_dna',
]);
const BRAND_BLOCK_IDS = Object.freeze(['brand_translation']);
const NEGATIVE_BLOCK_IDS = Object.freeze(['negative_constraints']);

function sha256Hex(text) {
  return crypto.createHash('sha256').update(Buffer.from(String(text ?? ''), 'utf8')).digest('hex');
}

function countCharsForBlocks(blocks, ids) {
  let count = 0;
  for (const b of blocks) {
    if (!ids.includes(b.id)) continue;
    const text = String(b.text ?? '');
    count += [...text.replace(/^#.*$/gmu, '')].length;
  }
  return count;
}
