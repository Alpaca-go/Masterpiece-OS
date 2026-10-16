import { createShortChainTaskContract } from "./task-contract.js";
import { routeShortChainTemplates } from "./template-router.js";
import { compileShortChainPrompt } from "./prompt-compiler.js";
import { createSeedreamShortChainAdapter } from "./seedream-adapter.js";
import { runPromptPreflightGate } from "../gates/prompt-preflight-gate.js";
import {
  assertSpaceGenerationRouteIntegrity,
  compileSpacePrompt,
  createSpaceContinuationContract,
  runSpaceQualityGate,
  validateSpaceGenerationModeSemantics,
  validateSpatialSemantics
} from "../space/index.js";
import crypto from "node:crypto";
const SPACE_COMPILER_MODES = Object.freeze({
  R8_6_GOLDEN: "r8_6_golden",
  PHASE9B_QUALITY: "phase9b_quality",
  VNEXT_LEGACY: "vnext_legacy"
});
function resolveSpaceCompilerMode() {
  return SPACE_COMPILER_MODES.R8_6_GOLDEN;
}
function isProductionSpaceMode(mode) {
  return mode === SPACE_COMPILER_MODES.R8_6_GOLDEN || mode === SPACE_COMPILER_MODES.PHASE9B_QUALITY;
}
function compileShortChainGeneration(input) {
  const started = performance.now();
  const adapter = input.adapter || createSeedreamShortChainAdapter({ model: input.model });
  const packetLogoAssetIds = input.projectContext?.visualDecisionPacket?.lockedAssets?.filter((item) => item?.type === "logo").map((item) => item.assetId) || [];
  const logoAssetIds = packetLogoAssetIds.length ? packetLogoAssetIds : input.projectContext?.promptSourceObject?.lockedAssets?.logoAssetIds || input.projectContext?.lockedAssets?.logoAssetIds || [];
  const preferredLogoAssetId = packetLogoAssetIds[0] || input.projectContext?.promptSourceObject?.lockedAssets?.preferredLogoAssetId || logoAssetIds[0] || null;
  const inferredLogoUsageMode = preferredLogoAssetId ? "post_composite" : "blank_area";
  const logoUsageMode = input.task?.logoUsageMode || inferredLogoUsageMode;
  if (preferredLogoAssetId && logoUsageMode !== "post_composite") {
    throw Object.assign(new Error(
      "LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: confirmed Logo must use post-composite mode."
    ), { code: "LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED" });
  }
  const requestedReferenceIds = Array.isArray(input.task?.referenceAssetIds) ? input.task.referenceAssetIds : [];
  const referenceAssetIds = logoUsageMode === "reference" && preferredLogoAssetId ? [.../* @__PURE__ */ new Set([preferredLogoAssetId, ...requestedReferenceIds])] : requestedReferenceIds.filter((assetId) => !logoAssetIds.includes(assetId));
  const taskContract = createShortChainTaskContract({
    ...input.task,
    logoUsageMode,
    referenceAssetIds
  }, { now: input.now });
  let continuation = taskContract.continuation;
  if (taskContract.generationBasis === "continuation" && continuation && (!continuation.targetFunctionalProgram || !continuation.continuationBoundary)) {
    const enriched = createSpaceContinuationContract({
      projectId: taskContract.projectId,
      confirmedSourceAssetId: continuation.confirmedSourceAssetId ?? continuation.sourceAssetId,
      sourceRunId: continuation.sourceRunId,
      sourceScene: continuation.sourceScene,
      targetScene: continuation.targetScene,
      targetSceneLabel: continuation.targetSceneLabel,
      userRequirement: continuation.userRequirement,
      confirmedAt: continuation.confirmedAt,
      customSceneDescription: continuation.customSceneDescription
    });
    continuation = {
      ...continuation,
      referenceRole: "world_consistency",
      targetFunctionalProgram: enriched.targetFunctionalProgram,
      continuationBoundary: enriched.continuationBoundary
    };
    taskContract.continuation = continuation;
  }
  const route = routeShortChainTemplates(taskContract, { model: adapter.id });
  const spaceMode = taskContract.deliverableFamily === "space" ? resolveSpaceCompilerMode() : null;
  let compiledPrompt;
  if (spaceMode !== null && isProductionSpaceMode(spaceMode)) {
    compiledPrompt = compileSpaceGeneration({
      input,
      taskContract,
      adapter,
      referenceAssetIds,
      preferredLogoAssetId,
      started,
      compilerMode: spaceMode,
      enforceSpatialSemantics: input.task?.generationBasis === "standard" || input.task?.generationBasis === "reference_first"
    });
  } else {
    compiledPrompt = compileShortChainPrompt({
      projectContext: input.projectContext,
      taskContract,
      route,
      adapter,
      projectPromptAsset: input.projectPromptAsset,
      approvedCreativeDecision: input.approvedCreativeDecision,
      userConfirmedVisualDecision: input.userConfirmedVisualDecision
    });
    compiledPrompt.preflightReport = runPromptPreflightGate({
      finalPrompt: compiledPrompt.finalPrompt,
      taskContract,
      projectContract: compiledPrompt.projectGenerationContract,
      packagingTranslation: compiledPrompt.packagingTranslation,
      spatialTranslation: compiledPrompt.spatialTranslation,
      requireProjectContract: Boolean(input.projectContext?.visualDecisionPacket)
    });
  }
  const payload = adapter.compile(compiledPrompt);
  compiledPrompt.trace.promptCharacters = [...compiledPrompt.finalPrompt].length;
  compiledPrompt.trace.compileDurationMs = Number((performance.now() - started).toFixed(3));
  return { taskContract, route, compiledPrompt, payload };
}
function compileSpaceGeneration({ input, taskContract, adapter, referenceAssetIds, preferredLogoAssetId, started, compilerMode = SPACE_COMPILER_MODES.R8_6_GOLDEN, enforceSpatialSemantics = false }) {
  const packet = input.projectContext?.visualDecisionPacket;
  if (!packet) {
    throw Object.assign(
      new Error("SPACE_PHASE9B_SOURCE_INSUFFICIENT: Phase 9B quality mode requires a V5 VisualDecisionPacket"),
      { code: "SPACE_PHASE9B_SOURCE_INSUFFICIENT" }
    );
  }
  const result = compileSpacePrompt({
    packet,
    taskContract,
    projectContext: input.projectContext,
    brandKey: input.brandKey || null,
    anchorCriteria: input.anchorCriteria,
    adapter,
    referencePolicy: { mode: compilerMode }
  });
  const budget = result.budget;
  if (budget.status === "blocked") {
    throw Object.assign(
      new Error(`SPACE_PROMPT_BUDGET_BLOCKED: ${budget.findings.map((f) => f.code).join(", ")}`),
      { code: "SPACE_PROMPT_BUDGET_BLOCKED", budget }
    );
  }
  const blocksById = Object.fromEntries(result.blocks.map((b) => [b.id, b]));
  const qualityGate = runSpaceQualityGate({
    finalPrompt: result.finalPrompt,
    blockIds: result.blockIds,
    blocksById,
    referenceCount: 0,
    hasExplicitReferenceBypass: true
  });
  const blocking = qualityGate.findings.filter((f) => f.severity === "block");
  if (blocking.length) {
    throw Object.assign(
      new Error(`SPACE_QUALITY_GATE_BLOCKED: ${blocking.map((f) => f.code).join(", ")}`),
      { code: "SPACE_QUALITY_GATE_BLOCKED", findings: qualityGate.findings }
    );
  }
  const logoUsageMode = preferredLogoAssetId ? "post_composite" : "blank_area";
  const spatialSemanticReport = enforceSpatialSemantics ? validateSpatialSemantics(packet.mediaTranslations?.spatial ?? {}) : { status: "pass", findings: [], skipped: "legacy_contract_without_generation_basis" };
  const compiledPrompt = {
    schemaVersion: "1.0",
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
      schemaVersion: "1.0",
      status: qualityGate.status,
      findings: qualityGate.findings,
      checkedAt: qualityGate.checkedAt
    },
    effectiveVisualDecisionPacket: packet,
    userConfirmedVisualDecision: null,
    completeness: {
      complete: true,
      requiredBlockIds: result.blockIds,
      missingBlockIds: [],
      conflictCount: 0,
      coverage: { phase9b: 1, architectureFirst: 1 }
    },
    finalPrompt: result.finalPrompt,
    editablePrompt: result.editablePrompt,
    negativeConstraints: result.layers?.negatives || [],
    referenceAssetIds,
    logoUsageMode,
    compiledAt: (/* @__PURE__ */ new Date()).toISOString(),
    phase9b: {
      compilerId: result.compilerId,
      compilerVersion: result.compilerVersion,
      sourceAdapterVersion: result.sourceAdapterVersion,
      anchorIds: result.anchors.map((a) => a.id),
      referenceImages: result.referenceImages,
      architectureContextIncluded: result.anchors.length > 0,
      budget: {
        chars: budget.chars,
        positiveRatio: budget.positiveRatio,
        negativeRatio: budget.negativeRatio,
        providerLimit: budget.providerLimit,
        qualityBudgetExceeded: budget.qualityBudgetExceeded
      }
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
      decisionTrace: result.layers.decisionTrace,
      // R9 §20 trace schema: every space run records a structured
      // spaceGeneration block for image-level regression tracing.
      spaceGeneration: {
        compilerId: result.trace.compilerId,
        compilerVersion: result.trace.compilerVersion,
        sourceAdapterVersion: result.sourceAdapterVersion,
        semanticSeparationVersion: result.layers?.semantic?.provenance?.version ?? null,
        architectureAnchorIds: result.anchors.map((a) => a.id),
        // R10.2 §27: generationBasis is the UI-facing route; referenceMode is
        // its runtime equivalent (standard <-> text_only, reference_first /
        // continuation <-> reference_assisted). Both are recorded for trace.
        generationBasis: taskContract.generationBasis,
        referenceMode: taskContract.generationBasis === "reference_first" || taskContract.generationBasis === "continuation" ? "reference_assisted" : "text_only",
        referenceIds: referenceAssetIds,
        referenceSources: [],
        // r2.0 §4.10 / B-3: Reference Boundary text block status. The v1
        // seedream-adapter path appends the block; the Phase 9B path now
        // also appends it (without disturbing the frozen R8.6 block order).
        // Either way the trace must record what was applied so the F-4
        // evidence scanner + audit pipeline can reason about it consistently.
        referenceBoundary: {
          applied: Boolean(result.trace?.referenceBoundary?.applied),
          version: result.trace?.referenceBoundary?.version ?? null,
          providerStrengthControl: result.trace?.referenceBoundary?.providerStrengthControl ?? "unsupported",
          promptCharacters: result.trace?.referenceBoundary?.promptCharacters ?? 0
        },
        targetSceneAuthority: result.trace?.targetSceneAuthority ?? null,
        promptCharacters: budget.chars,
        // r10.4 regression repair: quality-budget overflow is recorded on the
        // trace (monitoring) while the Provider hard limit stays fail-closed.
        providerLimit: budget.providerLimit,
        qualityBudgetExceeded: budget.qualityBudgetExceeded,
        architectureCharacters: countCharsForBlocks(result.blocks, ARCHITECTURE_BLOCK_IDS),
        brandCharacters: countCharsForBlocks(result.blocks, BRAND_BLOCK_IDS),
        negativeCharacters: countCharsForBlocks(result.blocks, NEGATIVE_BLOCK_IDS),
        promptHash: sha256Hex(result.finalPrompt),
        provider: "seedream",
        model: input.model ?? null,
        // R11.1 v1.1 lineage: record the confirmed source binding, the
        // world-consistency reference role, the preserve/regenerate boundary,
        // and the target functional program id so a run can be audited.
        ...taskContract.generationBasis === "continuation" && taskContract.continuation ? {
          continuation: {
            sourceAssetId: taskContract.continuation.sourceAssetId,
            sourceRunId: taskContract.continuation.sourceRunId,
            sourceScene: taskContract.continuation.sourceScene,
            targetScene: taskContract.continuation.targetScene,
            confirmedAt: taskContract.continuation.confirmedAt,
            confirmationSource: taskContract.continuation.confirmationSource,
            referenceSource: "confirmed_generated_output",
            referenceRole: taskContract.continuation.referenceRole ?? "world_consistency",
            targetFunctionalProgramId: taskContract.continuation.targetFunctionalProgram?.sceneId ?? null,
            targetViewStrategy: taskContract.continuation.targetFunctionalProgram?.viewStrategy ?? null,
            sourceProgramDropTags: taskContract.continuation.targetFunctionalProgram?.sourceProgramDropTags ?? [],
            preserve: taskContract.continuation.continuationBoundary?.preserve ?? [],
            regenerate: taskContract.continuation.continuationBoundary?.regenerate ?? [],
            parentRunId: taskContract.continuation.sourceRunId,
            sourceProgramLeakageGate: "pass"
          }
        } : {}
      }
    }
  };
  const integrity = assertSpaceGenerationRouteIntegrity({
    taskContract,
    compilerMode,
    trace: compiledPrompt.trace,
    blockIds: result.blockIds,
    providerReferenceCount: referenceAssetIds.length,
    referenceMode: compiledPrompt.trace.spaceGeneration.referenceMode,
    // R11.1: a continuation task's reference source is the confirmed generated
    // output, not a user_explicit upload. Standard stays text-only.
    referenceSources: taskContract.generationBasis === "continuation" ? referenceAssetIds.map(() => "confirmed_generated_output") : referenceAssetIds.map(() => "user_explicit"),
    spatialSemanticReport
  });
  validateSpaceGenerationModeSemantics({
    generationBasis: taskContract.generationBasis,
    referenceRole: taskContract.generationBasis === "continuation" ? taskContract.continuation?.referenceRole ?? "world_consistency" : "high_fidelity_visual_reference",
    referenceSources: taskContract.generationBasis === "continuation" ? ["confirmed_generated_output"] : ["user_explicit"],
    referenceCount: referenceAssetIds.length,
    finalPrompt: result.finalPrompt,
    sourceScene: taskContract.continuation?.sourceScene,
    targetScene: taskContract.continuation?.targetScene
  });
  compiledPrompt.trace.spaceGeneration.canonicalCompilerMode = integrity.canonicalCompilerMode;
  compiledPrompt.trace.spaceGeneration.blockIds = result.blockIds;
  compiledPrompt.trace.spaceGeneration.spatialSemanticReport = spatialSemanticReport;
  compiledPrompt.trace.spaceGeneration.routeIntegrity = integrity.routeIntegrity;
  return compiledPrompt;
}
const ARCHITECTURE_BLOCK_IDS = Object.freeze([
  "spatial_intent",
  "architecture_language",
  "architecture_context",
  "architecture_function_bridge",
  "architectural_concept",
  "architecture_dna"
]);
const BRAND_BLOCK_IDS = Object.freeze(["brand_translation"]);
const NEGATIVE_BLOCK_IDS = Object.freeze(["negative_constraints"]);
function sha256Hex(text) {
  return crypto.createHash("sha256").update(Buffer.from(String(text ?? ""), "utf8")).digest("hex");
}
function countCharsForBlocks(blocks, ids) {
  let count = 0;
  for (const b of blocks) {
    if (!ids.includes(b.id)) continue;
    const text = String(b.text ?? "");
    count += [...text.replace(/^#.*$/gmu, "")].length;
  }
  return count;
}
export {
  SPACE_COMPILER_MODES,
  compileShortChainGeneration,
  isProductionSpaceMode,
  resolveSpaceCompilerMode
};
