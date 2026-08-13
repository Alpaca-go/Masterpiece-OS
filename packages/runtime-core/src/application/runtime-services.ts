import type { AnalysisProgress, ProviderCredentials, PublicSettings } from '../shared/types.ts';
import { createAnchorCandidateService } from './anchor-candidate-service.ts';
import { createAnchorGenerationService } from './anchor-generation-service.ts';
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
  });
}

export type RuntimeServices = ReturnType<typeof createRuntimeServices>;
