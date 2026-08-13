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

  // P3-B3: resolve a canonical truth snapshot for a project
  // from the runtime-side authorities. The Web side never
  // fabricates Locked Assets; this resolver is the only place
  // the truth surface is constructed. When the project has
  // no configured truth yet, the resolver returns a snapshot
  // with empty canonical fields and a real `projectIdentity`
  // pulled from the project store. The view will then show
  // "未提供" for the empty fields (NOT a fake seed).
  //
  // P3-B3 truth mapping (LockedAsset.type → 7 canonical
  // Packaging fields per P3-A freeze report §12.2):
  //   brand_name                → brand.name
  //   logo                      → logo.present + usageMode
  //   product_category          → category.name
  //   packaging_structure       → structure.formFactor
  //   packaging_artwork         → productIdentity.name
  //   product_color             → productIdentity (color)
  //   product_arrangement       → productIdentity (arrangement)
  //   core_symbol               → mandatoryCopy.items
  //   required_visual_element   → mandatoryCopy.items
  //   forbidden_reference_content → confirmedComponents.items
  const resolveTruthSnapshot = async (projectId: string) => {
    const safeId = typeof projectId === 'string' ? projectId : '';
    if (!safeId) return null;
    let project: { id?: string; projectName?: string; industry?: string } | null = null;
    try {
      project = await projects.get(safeId);
    } catch {
      project = null;
    }
    // Best-effort Locked Asset list. If the project has no
    // configured Locked Assets, the list is empty and the
    // canonical fields stay empty (NOT a fake seed).
    let lockedAssetRecords: Array<{ type?: string; name?: string; thumbnail?: string }> = [];
    try {
      lockedAssetRecords = await lockedAssets.list(safeId);
    } catch {
      lockedAssetRecords = [];
    }
    const findByType = (type: string) =>
      lockedAssetRecords.find((record) => record && record.type === type);
    const collectByTypes = (types: string[]) =>
      lockedAssetRecords
        .filter((record) => record && types.includes(record.type || ''))
        .map((record) => record.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0);

    const brandRecord = findByType('brand_name');
    const logoRecord = findByType('logo');
    const categoryRecord = findByType('product_category');
    const structureRecord = findByType('packaging_structure');
    const artworkRecord = findByType('packaging_artwork');
    const colorRecord = findByType('product_color');
    const arrangementRecord = findByType('product_arrangement');
    const productIdentityName =
      artworkRecord?.name || colorRecord?.name || arrangementRecord?.name || '';
    const productIdentityThumb =
      artworkRecord?.thumbnail || colorRecord?.thumbnail || arrangementRecord?.thumbnail;
    const mandatoryCopyItems = collectByTypes(['core_symbol', 'required_visual_element']);
    const confirmedComponentsItems = collectByTypes(['forbidden_reference_content']);

    const projectIdentity = project
      ? { projectId: project.id || safeId, projectName: project.projectName || '' }
      : { projectId: safeId, projectName: '' };
    return {
      lockedAssets: {
        brand: { name: brandRecord?.name || '', locked: true },
        logo: {
          present: Boolean(logoRecord),
          // P3-A frozen contract restricts `usageMode` to
          // 'reserved' | 'rendered'. The P3-A default is
          // 'reserved' when no upstream value is available.
          usageMode: 'reserved',
          locked: true,
        },
        productIdentity: { name: productIdentityName, locked: true },
        category: { name: categoryRecord?.name || '', locked: true },
        structure: { formFactor: structureRecord?.name || '', locked: true },
        mandatoryCopy: { items: mandatoryCopyItems, locked: true },
        confirmedComponents: { items: confirmedComponentsItems, locked: true },
      },
      analysisContext: {
        detectedIndustry: project?.industry || '',
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
