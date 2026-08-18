import type { AnalysisProgress, ProviderCredentials, PublicSettings } from '../shared/types.ts';
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
  const quickStyleExtraction = createQuickStyleExtractionService(referenceAnchor, creativeSessions, lockedAssets, styleProfiles);

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
    const run = await imageGeneration.start({
      sources: {
        schemaVersion: '3.0',
        sourcePreset: 'integrated_context',
        deliverable: 'free_concept',
        purpose: 'creative_anchor',
        projectId: input.projectId ?? undefined,
        userIntent: {
          prompt: input.compiledPrompt,
          aspectRatio: input.aspectRatio,
        },
      },
      projectId: input.projectId ?? undefined,
      apiProfileId: input.apiProfileId,
      modelId: input.modelId,
      size: '2560*1440',
      dryRun: false,
    });
    const images = run.images ?? [];
    return {
      imageGenerationRunId: run.runId,
      providerId: run.providerId,
      modelId: run.modelId,
      candidates: images.slice(0, input.candidateIds.length).map((image, index) => ({
        candidateId: input.candidateIds[index]!,
        imageId: image.imageId,
        imagePath: image.relativePath,
        thumbnailPath: null,
        imageFingerprint: image.sha256 ?? '',
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
    readDataDir: async () => dataPath,
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
        return record as unknown as Record<string, unknown>;
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
    visualMemory, anchorCandidates, visualCanons, referencePacks, generationPrompts,
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
