import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createAnalysisOperations,
  createContextIntegrationOperations,
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createDocumentOperations,
  createImageGenerationOperations,
  createPackagingOperations,
  createProjectContextOperations,
  createProjectOperations,
  createReferenceOperations,
  createReportOperations,
  createSettingsOperations,
  createVisualMemoryOperations,
} from '@masterpiece/runtime-core';
import type { RuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import type {
  ProviderCredentials,
  SaveApiProfileInput,
  SaveSettingsInput,
} from '@masterpiece/runtime-core/application-contracts.ts';

export interface NodeSettingsAdapter {
  get: () => unknown;
  save: (input: SaveSettingsInput) => unknown;
  saveProfile: (input: SaveApiProfileInput) => unknown;
  deleteProfile: (profileId: string) => unknown;
  setDefaultProfile: (profileId: string) => unknown;
  setProfileEnabled: (profileId: string, enabled: boolean) => unknown;
  testProfile: (input: SaveApiProfileInput) => unknown;
}

export interface NodeRuntimeAdapters {
  settings: NodeSettingsAdapter;
  /**
   * Canonical credential resolver. P3-B2: the Packaging
   * `executeGeneration` operation needs the deps seam to be
   * filled with the real `apiKey` / `baseUrl` / `region`.
   * The credential secret NEVER crosses the Web RPC boundary;
   * it is resolved on the runtime side by the existing
   * `node-credential-store`.
   */
  readCredentials: (profileId?: string) => Promise<ProviderCredentials>;
}

export function createCurrentBusinessOperations(
  services: RuntimeServices,
  adapters: NodeRuntimeAdapters
) {
  const settings = adapters.settings;
  const readSettings = (settings.get as () => unknown) as () => Promise<unknown>;
  const readCredentials = adapters.readCredentials;
  const {
    projects, reports, pipeline, documentContext, projectContext, contextIntegration,
    referenceAnchor, imageGeneration, shortChainGeneration, creativeSessions,
    creativeDirections, styleProfiles, lockedAssets, visualMemory, anchorCandidates,
    visualCanons, referencePacks, creativeReading, creativeProductionBootstrap,
    quickStyleExtraction, creativeGeneration, anchorGeneration, visualExplorations,
    generationSeries, generationSeriesExecution, formalAssets,
    packaging,
  } = services;

  // P3-B2: resolve a canonical truth snapshot for a project
  // from the runtime-side authorities. The Web side never
  // fabricates Locked Assets; this resolver is the only place
  // the truth surface is constructed. When the project has
  // no configured truth yet, the resolver returns a snapshot
  // with empty canonical fields and a real `projectIdentity`
  // pulled from the project store. The view will then show
  // "未提供" for the empty fields (NOT a fake seed).
  const resolveTruthSnapshot = async (projectId: string) => {
    const safeId = typeof projectId === 'string' ? projectId : '';
    if (!safeId) return null;
    let project: { id?: string; projectName?: string } | null = null;
    try {
      project = await projects.get(safeId);
    } catch {
      project = null;
    }
    const projectIdentity = project
      ? { projectId: project.id || safeId, projectName: project.projectName || '' }
      : { projectId: safeId, projectName: '' };
    return {
      lockedAssets: {
        brand: { name: '', locked: true },
        logo: { present: false, usageMode: 'reserved', locked: true },
        productIdentity: { name: '', locked: true },
        category: { name: '', locked: true },
        structure: { formFactor: '', locked: true },
        mandatoryCopy: { items: [], locked: true },
        confirmedComponents: { items: [], locked: true },
      },
      analysisContext: {
        detectedIndustry: '',
        detectedProjectName: project?.projectName || '',
        confidence: 0,
      },
      projectIdentity,
    };
  };

  return Object.assign(
    {},
    createSettingsOperations(settings),
    createProjectOperations({ projects, pipeline }),
    createAnalysisOperations({ pipeline }),
    createReportOperations({ reports }),
    createProjectContextOperations({ projectContext }),
    createVisualMemoryOperations({ visualMemory, referencePacks }),
    createContextIntegrationOperations({ contextIntegration }),
    createDocumentOperations({ documentContext, readTextFile: (source: string) => fs.readFile(source, 'utf8') }),
    createReferenceOperations({ referenceAnchor }),
    createImageGenerationOperations({ service: imageGeneration, shortChainService: shortChainGeneration }),
    // P3-B2: Packaging Workspace RPC operations. The
    // Workspace service is held by `runtime-services.ts`; the
    // operations layer is a thin bridge to it.
    createPackagingOperations({
      service: packaging,
      readSettings: async () => readSettings(),
      readCredentials,
      resolveTruthSnapshot,
    }).operations,
    createCreativeSessionOperations({
      creativeSessions, creativeDirections, styleProfiles, visualCanons,
      imageGeneration, creativeReading, creativeGeneration,
    }),
    createCreativeProductionOperations({
      lockedAssets, creativeProductionBootstrap, quickStyleExtraction, styleProfiles,
      anchorGeneration, visualExplorations, anchorCandidates, visualCanons,
      generationSeries, generationSeriesExecution, formalAssets, imageGeneration,
      readTextFile: (source: string) => fs.readFile(source, 'utf8'),
      joinPath: path.join,
    }),
  );
}
