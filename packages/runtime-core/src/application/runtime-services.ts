import type { AnalysisProgress, ImageGenerationSourceBundleV3, ProviderCredentials, PublicSettings } from '../shared/types.ts';
import { createAnchorCandidateService } from './anchor-candidate-service.ts';
import { createAnchorGenerationService } from './anchor-generation-service.ts';
import { createAnchorProductionService } from './anchor-production-service.ts';
import { createContextIntegrationService } from './context-integration-service.ts';
import { createCreativeDirectionService } from './creative-direction-service.ts';
import { createCreativeGenerationService } from './creative-generation-service.ts';
import { createCreativeProductionBootstrapService } from './creative-production-bootstrap-service.ts';
import { createCreativeReadingService } from './creative-reading-service.ts';
import { createCreativeSessionService } from './creative-session-service.ts';
import { createDocumentContextService } from './document-context-service.ts';
import { createFormalAssetsService } from './formal-assets-service.ts';
import { createGenerationBlueprintService } from './generation-blueprint-service.ts';
import { createGenerationPromptService } from './generation-prompt-service.ts';
import { createGenerationSeriesExecutionService } from './generation-series-execution-service.ts';
import { createGenerationSeriesService } from './generation-series-service.ts';
import { createFileContextLoader } from './image-generation/context-loader.ts';
import { createImageGenerationService } from './image-generation/service.ts';
import { createRunStore } from './image-generation/run-store.ts';
import { createDeliverableValidatorService } from './image-generation/deliverable-validator-service.ts';
import { createShortChainGenerationService } from './image-generation/short-chain-service.ts';
import { createLockedAssetsService } from './locked-assets-service.ts';
// P3-B2: Packaging Workspace service. Imported lazily via the
// `application/packaging/index.js` barrel (not the P2 frozen
// internals) so the Web UI / tests continue to see only the
// frozen P3-A public surface.
import { createPackagingWorkspaceService } from './packaging/index.js';
import { createPipelineService } from './pipeline-service.ts';
import { createProjectContextService, type SaveDialogResult } from './project-context-service.ts';
import { createProjectStore } from './project-store.ts';
import { createQuickStyleExtractionService } from './quick-style-extraction-service.ts';
import { createReferenceAnchorService } from './reference-anchor-service.ts';
import { createReferencePackService } from './reference-pack-service.ts';
import { createReportService } from './report-service.ts';
import { createStyleProfileService } from './style-profile-service.ts';
import { createVisualCanonService } from './visual-canon-service.ts';
import { createVisualExplorationService } from './visual-exploration-service.ts';
import { createVisualMemoryService } from './visual-memory-service.ts';
import { createVisualMigrationReferencePackService } from './visual-migration-reference-pack-service.ts';
import { createVisualMigrationCanonService } from './visual-migration-canon-service.ts';
import { createVisualMigrationReferencePolicyService } from './visual-migration-reference-policy-service.ts';
import { createVisualMigrationReferenceExecutionService } from './visual-migration-reference-execution-service.ts';
import { createVisualMigrationGenerationEvidenceService } from './visual-migration-generation-evidence-service.ts';
// CI-W1A: Creative Intelligence Runtime Application Layer.
import {
  createCreativeIntelligenceApplicationService,
  type CreativeIntelligenceApplicationService,
} from './creative-intelligence-application-service.ts';

export interface RuntimeServiceAdapters {
  dataPath: string;
  readSettings: () => Promise<PublicSettings>;
  readCredentials: (profileId?: string) => Promise<ProviderCredentials>;
  analysisRuntime: any;
  showSaveDialog?: (defaultPath: string) => Promise<SaveDialogResult | null>;
  openPath?: (targetPath: string) => Promise<void>;
  emitAnalysisProgress?: (progress: AnalysisProgress) => void;
  emitDocumentProgress?: (progress: any) => void;
  emitReferenceProgress?: (progress: any) => void;
  emitImageRunUpdated?: (progress: any) => void;
}

export function createRuntimeServices(adapters: RuntimeServiceAdapters) {
  const projects = createProjectStore(adapters.readSettings);
  const pipeline = createPipelineService(
    projects,
    adapters.readCredentials,
    adapters.readSettings,
    adapters.emitAnalysisProgress ?? (() => {}),
    adapters.analysisRuntime,
  );
  const documentContext = createDocumentContextService(
    adapters.readCredentials,
    adapters.readSettings,
    adapters.emitDocumentProgress ?? (() => {}),
  );
  const projectContext = createProjectContextService({
    projects,
    showSaveDialog: adapters.showSaveDialog,
  });
  const contextIntegration = createContextIntegrationService({
    readSettings: adapters.readSettings,
    projects,
    projectContext,
    documentContext,
    showSaveDialog: adapters.showSaveDialog,
  });
  const referenceAnchor = createReferenceAnchorService(adapters.readSettings, {
    projects,
    pipeline,
    projectContext,
    documentContext,
    contextIntegration,
    emitProgress: adapters.emitReferenceProgress,
  });

  const creativeSessions = createCreativeSessionService(projects);
  const creativeDirections = createCreativeDirectionService(projects, creativeSessions, adapters.readCredentials);
  const generationBlueprints = createGenerationBlueprintService(projects, creativeSessions, creativeDirections);
  const styleProfiles = createStyleProfileService(projects, creativeSessions);
  const lockedAssets = createLockedAssetsService(projects, creativeSessions);
  const visualMemory = createVisualMemoryService(projects, creativeSessions, creativeDirections, lockedAssets);
  const anchorCandidates = createAnchorCandidateService(projects, creativeSessions, styleProfiles, lockedAssets);
  const visualCanons = createVisualCanonService(projects, creativeSessions, styleProfiles, lockedAssets, anchorCandidates);
  const referencePacks = createReferencePackService(projects, visualMemory, visualCanons);
  const visualMigrationReferencePacks = createVisualMigrationReferencePackService(projects, referenceAnchor);
  const visualMigrationCanons = createVisualMigrationCanonService(projects, visualMigrationReferencePacks);
  const visualMigrationReferencePolicies = createVisualMigrationReferencePolicyService(
    projects,
    creativeSessions,
    visualMigrationCanons,
    lockedAssets,
  );
  const visualMigrationReferenceExecution = createVisualMigrationReferenceExecutionService({
    projects,
    referencePolicies: visualMigrationReferencePolicies,
    referencePacks: visualMigrationReferencePacks,
    lockedAssets,
  });
  const visualMigrationGenerationEvidence = createVisualMigrationGenerationEvidenceService({
    visualMigrationCanons,
    referencePacks: visualMigrationReferencePacks,
    referencePolicies: visualMigrationReferencePolicies,
    referenceExecution: visualMigrationReferenceExecution,
    imageGenerationRunStoreResolver: (projectId) => createRunStore(adapters.dataPath, projectId),
  });
  const generationPrompts = createGenerationPromptService(
    projects,
    creativeSessions,
    styleProfiles,
    lockedAssets,
    visualCanons,
    creativeDirections,
    generationBlueprints,
    visualMemory,
    referencePacks,
  );
  const creativeReading = createCreativeReadingService(
    projects,
    creativeSessions,
    lockedAssets,
    adapters.readCredentials,
    creativeDirections,
  );
  const generationSeries = createGenerationSeriesService(projects, creativeSessions, styleProfiles, lockedAssets, visualCanons);
  const formalAssets = createFormalAssetsService(projects);
  const creativeProductionBootstrap = createCreativeProductionBootstrapService(
    projects,
    creativeSessions,
    lockedAssets,
    styleProfiles,
    creativeDirections,
    visualMemory,
    referencePacks,
  );
  const quickStyleExtraction = createQuickStyleExtractionService(
    referenceAnchor,
    creativeSessions,
    lockedAssets,
    styleProfiles,
    visualMigrationReferencePacks,
    visualMigrationCanons,
  );

  let imageGeneration: ReturnType<typeof createImageGenerationService>;
  imageGeneration = createImageGenerationService({
    readSettings: adapters.readSettings,
    readCredentials: adapters.readCredentials,
    loadContext: createFileContextLoader(adapters.dataPath, projects).loadContext,
    dataPath: adapters.dataPath,
    emitRunUpdated: adapters.emitImageRunUpdated,
    openRunFolder: async (runId) => {
      const root = await imageGeneration.runRoot(runId);
      if (!root) throw new Error('运行记录不存在。');
      if (!adapters.openPath) throw new Error('RUNTIME_OPEN_PATH_ADAPTER_MISSING');
      await adapters.openPath(root);
    },
  });
  const deliverableValidator = createDeliverableValidatorService(
    projects,
    () => imageGeneration,
    adapters.readSettings,
    adapters.readCredentials,
    projectContext,
  );
  const shortChainGeneration = createShortChainGenerationService(
    projects,
    projectContext,
    () => imageGeneration,
    () => deliverableValidator,
  );
  const creativeGeneration = createCreativeGenerationService(generationPrompts, imageGeneration, creativeSessions);
  const anchorGeneration = createAnchorGenerationService(
    styleProfiles,
    lockedAssets,
    anchorCandidates,
    imageGeneration,
    creativeDirections,
    generationBlueprints,
    visualMemory,
    referencePacks,
  );
  const visualExplorations = createVisualExplorationService(projects, creativeSessions, creativeDirections, styleProfiles, imageGeneration);
  const generationSeriesExecution = createGenerationSeriesExecutionService(generationSeries, creativeGeneration, formalAssets);

  // P3-B2: Packaging Workspace service is created ONCE per
  // runtime process and held in the frozen services object.
  // The session Map inside the Workspace service keeps the
  // canonical session authority; the Web UI never holds the
  // service instance (it consumes the view model over RPC
  // only). The factory defaults to the real P2 frozen
  // prepare/execute functions; no test stubs are wired in
  // production.
  const packaging = createPackagingWorkspaceService();

  // CI-W1A: Creative Intelligence Runtime Application Service.
  // Reuses documentContext for the ONE fact-extraction call (which already
  // exists). All other stages are deterministic CI-1..CI-9 pipelines.
  //
  // CI-W2: Anchor Production sub-run is wired through the existing
  // image-generation runtime via a thin adapter. The CI service does
  // NOT directly call the provider; it goes through the orchestrator +
  // the existing imageGenerationService.
  const submitAnchorGeneration: import('./anchor-production-service.ts').SubmitAnchorGeneration = async (input) => {
    // CI-W1C.0.2: V3 image-generation contract requires `compileRunId`
    // (the V3 path throws COMPILE_INPUT_STALE otherwise). The previous
    // implementation skipped compile and called `imageGeneration.start`
    // directly with a V3 sourcePreset, which the V3 path rejected.
    // The canonical flow is: compile first (dry-run, returns a
    // persisted `compileRunId`) then start with `compileRunId`.
    //
    // CI-W1C.1 PART B: model authority. The orchestrator's `input.modelId`
    // is the ANALYSIS model id (from `parent.model`); passing it as an
    // explicit `modelId` to imageGeneration.compile/start made the
    // V3 path resolve to the analysis provider (dashscope + qwen3.6-plus)
    // which has no image capability and rejected the run with
    // `ASPECT_OR_SIZE_UNSUPPORTED`. Per CI-W1C.1 PART B rule
    // "image profile is the sole authority for the image modelId",
    // we OMIT `modelId` from both compile and start. The V3 path
    // then calls `readCredentials(apiProfileId)` which returns
    // `credentials.model` (the profile's real image model id) and
    // `credentials.provider` (the image provider). For the Seedream
    // profile this resolves to volcengine + doubao-seedream-5-0-pro-260628.
    if (!input.apiProfileId) {
      throw Object.assign(new Error('CI_ANCHOR_IMAGE_PROFILE_REQUIRED: Anchor Production requires an explicit imageApiProfileId; analysis profile fallback is forbidden.'), { code: 'CI_ANCHOR_IMAGE_PROFILE_REQUIRED' });
    }
    const compileSources: ImageGenerationSourceBundleV3 = {
      schemaVersion: '3.0',
      // CI-W1C.6 PART E (deferred): the dedicated
      // `creative_intelligence` source preset has been added to the
      // V3 enum (see image-generation-contracts + V3 schema) but the
      // V2 path's source loader mapping is unchanged. To avoid
      // breaking the live CI Anchor path, we continue to use
      // `visual_analysis` (which the V2 path maps to
      // `visual_extension`). The PART E dedicated route will be
      // activated in a follow-up phase that wires the V2 path's
      // source loader for `creative_intelligence` (returning empty
      // references per PART F reference gate).
      //
      // CI-W1C.6 PART B (active): the demoted visual evidence
      // (VisualEvidenceContribution → preservation Need +
      // constraint_only coverage) prevents legacy visual descriptors
      // from being promoted into positive future-style Need /
      // Concept / Direction / Anchor prompt text. The CI Anchor
      // prompt is now planning-first authoritative (compiledPrompt
      // contains the human-readable Direction text, not opaque DNA
      // / Grammar IDs).
      sourcePreset: 'visual_analysis',
      deliverable: 'anchor_image',
      purpose: 'creative_anchor',
      projectId: input.projectId ?? undefined,
      userIntent: {
        prompt: input.compiledPrompt,
        aspectRatio: input.aspectRatio,
      },
    };
    // CI-W1C.1 PART G: Size / capability. The 16:9 Anchor size must
    // be one that the resolved image model actually supports. The
    // V3 path's static capability table
    // (`DASHSCOPE_CAPABILITIES.supportedSizes`) lists 16:9 sizes
    // (e.g. Seedream: 2048*1152). We use 2048*1152 (16:9) as the
    // Anchor default; the V3 path's gate still validates against
    // the resolved image profile and BLOCKS if the resolved model
    // does not support this size. The previous hardcoded
    // `2560*1440` was outside the capability table and caused
    // `ASPECT_OR_SIZE_UNSUPPORTED` regardless of model authority.
    const ANCHOR_SIZE_16_9 = '2048*1152';
    const compileResult = await imageGeneration.compile({
      sources: compileSources,
      projectId: input.projectId ?? undefined,
      apiProfileId: input.apiProfileId,
      // modelId intentionally omitted (CI-W1C.1 PART B)
      size: ANCHOR_SIZE_16_9,
      dryRun: false,
    });
    const compileRunId = compileResult.run.runId;
    // CI-W1C.1 PART H: Each call to imageGeneration.start produces
    // ONE image (the V3 path's `maxOutputCount: 1` cap from the
    // static capability table). Anchor Production requires up to
    // N candidates (default 3, max 4). To produce N candidates we
    // submit N independent start() calls against the same
    // compileRunId. Each call generates one image with a fresh
    // providerTaskId; the V3 path's compile fingerprint check
    // ensures all calls share the same compiled prompt / source
    // bundle. This is the documented V3 path: a single compile
    // may be replayed N times to produce N candidates.
    const targetCount = input.candidateIds.length;
    const allImages: Array<{ imageId: string; relativePath: string; sha256: string; runId: string }> = [];
    let lastRun = null as null | Awaited<ReturnType<typeof imageGeneration.start>>;
    for (let i = 0; i < targetCount; i += 1) {
      const subRun = await imageGeneration.start({
        sources: compileSources,
        compileRunId,
        projectId: input.projectId ?? undefined,
        apiProfileId: input.apiProfileId,
        // modelId intentionally omitted (CI-W1C.1 PART B)
        size: ANCHOR_SIZE_16_9,
        dryRun: false,
      });
      lastRun = subRun;
      const subImages = subRun.images ?? [];
      if (subImages.length === 0) {
        // No image returned for this candidate slot; abort the
        // loop and surface a partial candidate set. The
        // orchestrator will mark the sub-run as failed via its
        // catch handler (line below).
        break;
      }
      const first = subImages[0]!;
      allImages.push({
        imageId: first.imageId,
        relativePath: first.relativePath,
        sha256: first.sha256 ?? '',
        runId: subRun.runId,
      });
    }
    if (allImages.length === 0 && lastRun) {
      // Surface a descriptive error if the provider returned
      // nothing for any of the candidate slots.
      const code = lastRun.errorCode ?? 'CI_ANCHOR_GENERATION_FAILED';
      const message = lastRun.errorMessage ?? 'imageGeneration.start returned no images';
      throw Object.assign(new Error(`${code}: ${message}`), { code });
    }
    const images = allImages;
    const run = lastRun!;
    return {
      imageGenerationRunId: run.runId,
      providerId: run.providerId,
      modelId: run.modelId,
      candidates: images.slice(0, targetCount).map((image, index) => ({
        candidateId: input.candidateIds[index]!,
        imageId: image.imageId,
        imagePath: image.relativePath,
        thumbnailPath: null,
        imageFingerprint: image.sha256,
        sourceFingerprint: input.contract.sourceFingerprint,
        aspectRatio: input.aspectRatio,
      })),
    };
  };

  const submitAnchorRetryGeneration: import('./anchor-production-service.ts').SubmitAnchorRetryGeneration = async (input) => {
    const result = await submitAnchorGeneration(input);
    return { ...result, retriedCandidateIds: input.retriedCandidateIds };
  };

  const cancelAnchorGeneration: import('./anchor-production-service.ts').CancelAnchorGeneration = async (imageGenerationRunId) => {
    try {
      await imageGeneration.cancel(imageGenerationRunId);
    } catch (err) {
      // The image runtime is best-effort for cancel; we never let
      // it block the orchestrator's cancellation flow.
      // eslint-disable-next-line no-console
      console.warn?.(`CI anchor: image runtime cancel failed for ${imageGenerationRunId}: ${(err as Error).message}`);
    }
  };

  const resolveLockedAssetKeys = async (projectId: string | null): Promise<string[]> => {
    if (!projectId) return [];
    try {
      const items = await lockedAssets.list(projectId);
      return items
        .filter((item) => item && item.type && item.name)
        .map((item) => `${item.type}:${item.name}`);
    } catch {
      return [];
    }
  };

  const resolveProjectBrandIdentityRefs = async (projectId: string | null): Promise<string[]> => {
    if (!projectId) return [];
    try {
      const record = await projects.get(projectId);
      if (!record) return [];
      const refs: string[] = [];
      if (record.brandName) refs.push(`brand:${record.brandName}`);
      if (record.industry) refs.push(`industry:${record.industry}`);
      return refs;
    } catch {
      return [];
      }
  };

  const anchorProduction = createAnchorProductionService({
    readDataDir: async () => adapters.dataPath,
    submitAnchorGeneration,
    submitAnchorRetryGeneration,
    cancelAnchorGeneration,
    resolveLockedAssetKeys: (projectId, _ciRunId) => resolveLockedAssetKeys(projectId),
    resolveProjectBrandIdentityRefs: (projectId, _ciRunId) => resolveProjectBrandIdentityRefs(projectId),
    log: (level, message) => {
      // eslint-disable-next-line no-console
      console[level]?.(message);
    },
  });

  const creativeIntelligence: CreativeIntelligenceApplicationService = createCreativeIntelligenceApplicationService({
    readSettings: adapters.readSettings,
    readCredentials: async (profileId) => {
      if (!profileId) {
        throw new Error('CI_APP_PROFILE_REQUIRED');
      }
      const creds = await adapters.readCredentials(profileId);
      return {
        apiKey: creds.apiKey,
        model: creds.model,
        provider: creds.provider,
        baseUrl: creds.baseUrl,
      };
    },
    resolveProfile: async (profileId) => {
      const settings = await adapters.readSettings();
      const profile = settings.profiles.find((p) => p.id === profileId);
      if (!profile) return null;
      return { id: profile.id, provider: profile.provider, modelId: profile.modelId };
    },
    // Bridge: delegate to the existing documentContext service so the
    // CI application reuses the legacy fact-extraction pipeline. The
    // DocumentVisualContext returned has a real sourceRunId (the
    // documentContextRun.id) and survives the CI-3 / Truth adapter.
    runDocumentIntake: async (input) => {
      const run = await documentContext.start(input.paths, input.profileId);
      // The legacy contract returns when status reaches
      // awaiting_confirmation (after the model call + repair + dedupe).
      const finalRun = await waitForFactConfirmation(run.id, documentContext);
      const dvc = await documentContext.getExtracted(finalRun.id);
      return {
        documentRunId: finalRun.id,
        sourceRunId: dvc?.sourceRunId ?? finalRun.id,
        dvc,
      };
    },
    loadProjectRecord: async (projectId) => {
      if (!projectId) return null;
      try {
        const record = await projects.get(projectId);
        return record;
      } catch {
        return null;
      }
    },
    // CI-W1C.5 PART E: bridge vnext to the CI application service so
    // NICE / Concept / Direction can read per-item visual evidence.
    // Best-effort: returns null when the project has no ready vnext.
    loadProjectVNext: async (projectId) => {
      if (!projectId) return null;
      try {
        return await projectContext.getShortChain(projectId);
      } catch {
        return null;
      }
    },
    anchorProduction,
    log: (level, message) => {
      // eslint-disable-next-line no-console
      console[level]?.(message);
    },
  });

  return Object.freeze({
    projects, reports: createReportService(projects), pipeline, documentContext, projectContext,
    contextIntegration, referenceAnchor, imageGeneration, shortChainGeneration,
    creativeSessions, creativeDirections, generationBlueprints, styleProfiles, lockedAssets,
    visualMemory, anchorCandidates, visualCanons, referencePacks, visualMigrationReferencePacks, visualMigrationCanons,
    visualMigrationReferencePolicies, visualMigrationReferenceExecution,
    visualMigrationGenerationEvidence, generationPrompts,
    creativeReading, generationSeries, formalAssets, creativeProductionBootstrap,
    quickStyleExtraction, creativeGeneration, anchorGeneration, visualExplorations,
    generationSeriesExecution,
    // P3-B2: exposed on the runtime services surface so the
    // packaging-operations RPC layer can bind it. Web consumers
    // never receive this instance over RPC.
    packaging,
    // CI-W1A: Creative Intelligence Runtime Application Layer.
    // Web consumers receive operations only (creative-intelligence:*).
    creativeIntelligence,
  });
}

/**
 * Helper: poll a documentContext run until it reaches
 * awaiting_confirmation (or fails/cancels). Returns the final run.
 */
async function waitForFactConfirmation(
  runId: string,
  documentContext: {
    getRun: (id: string) => Promise<{ id: string; status: string }>;
  },
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<{ id: string; status: string }> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const pollMs = options.pollMs ?? 250;
  const start = Date.now();
  let current: { id: string; status: string };
  do {
    current = await documentContext.getRun(runId);
    if (current.status === 'awaiting_confirmation' || current.status === 'failed' || current.status === 'cancelled') {
      return current;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('document intake timeout');
    }
    await new Promise((r) => setTimeout(r, pollMs));
  } while (true);
}

export type RuntimeServices = ReturnType<typeof createRuntimeServices>;
