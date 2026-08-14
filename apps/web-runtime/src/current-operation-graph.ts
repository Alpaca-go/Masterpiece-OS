import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createAnalysisOperations,
  createContextIntegrationOperations,
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createDocumentOperations,
  createImageGenerationOperations,
  createPackagingArtifactStore,
  createPackagingOperations,
  createPackagingRunRegistrationAdapter,
  createProjectContextOperations,
  createProjectOperations,
  createReferenceOperations,
  createReportOperations,
  projectSelectedPackagingContextToTruth,
  selectCanonicalPackagingContext,
  createSettingsOperations,
  createVisualMemoryOperations,
  setPackagingArtifactStorePathImpl,
} from '@masterpiece/runtime-core';
import type { RuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import type {
  ProviderCredentials,
  ProjectRecord,
  SaveApiProfileInput,
  SaveSettingsInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { atomicWriteJsonWithRetry } from '@masterpiece/runtime-core/application/runtime/atomic-write.ts';
// P3-B5.3 — Canonical Run Registration Bridge.
// `createRunStore` is the canonical image-generation runStore
// factory. The Packaging adapter calls into it to write the
// canonical `<runRoot>/run.json`. We import the subpath
// explicitly (the runtime-core public barrel does not
// re-export this internal factory by design; the subpath
// was added in B5.3).
import { createRunStore } from '@masterpiece/runtime-core/image-generation-run-store';

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
  /**
   * P3-B5: the absolute Shared Core data root. The Packaging
   * Artifact Store writes to `<dataPath>/projects/<id>/
   * image-generation/<runId>/` — the same physical root the
   * existing image-generation run-store uses. The `pkg-...`
   * runId namespace isolates the two streams.
   */
  dataPath: string;
}

export function createCurrentBusinessOperations(
  services: RuntimeServices,
  adapters: NodeRuntimeAdapters
) {
  const settings = adapters.settings;
  const readSettings = (settings.get as () => unknown) as () => Promise<unknown>;
  const readCredentials = adapters.readCredentials;
  // P3-B5: the Shared Core data root is the parent of every
  // `<projectRoot>/` directory. We resolve it to an absolute
  // path here so the Packaging Artifact Store never has to
  // guess the layout. The image-generation run-store lives
  // in the same root; the `pkg-...` runId namespace isolates
  // the two streams.
  const dataPath = path.resolve(adapters.dataPath);
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
  const resolveTruthSnapshot = async (projectId: string, generationMode = 'analysis_led') => {
    const safeId = typeof projectId === 'string' ? projectId : '';
    if (!safeId) return null;
    let project: ProjectRecord | null = null;
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

    // P3-C2: generationMode is the sole producer selector. The shared selector
    // validates the project/source/active-Reference provenance and returns only
    // canonical PackagingTranslationV2 semantics. This composition root does
    // not inspect producer internals, discover runs, or infer a fallback.
    const projectVisualContext = await projectContext.getShortChain(safeId);
    const selectedPackagingContext = selectCanonicalPackagingContext({
      workspaceProjectId: safeId,
      generationMode,
      projectVisualContext,
      activeReferenceSource: project?.activeReferenceSource,
    });
    const packagingTruthContext = projectSelectedPackagingContextToTruth(selectedPackagingContext);

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
      projectVisualContext: packagingTruthContext,
    };
  };

  // P3-B5: the canonical Packaging Artifact Store. The store
  // writes to `<dataPath>/projects/<id>/image-generation/<runId>/`
  // — the same physical root the existing image-generation
  // run-store uses. The `pkg-...` runId namespace isolates the
  // two streams; we do NOT introduce a second filesystem root.
  //
  // The store is constructed here (composition root) so the
  // P3-A frozen `workspace-service.js` stays unchanged. The
  // P2 frozen `generation-service.js` is also unchanged: the
  // store is wired into the P2 frozen deps via the same
  // `executePackagingGeneration` deps seam that P3-B2 already
  // established.
  setPackagingArtifactStorePathImpl(path);
  // The store needs to resolve a `projectId` back to a
  // projectRoot. The image-generation run-store convention
  // is `<dataPath>/projects/<sanitizedName>-<id8>/`; the
  // project-store resolves the canonical name by scanning
  // `project.json` files. The store does NOT replicate that
  // scan (it would re-define the image-generation run-store's
  // path-resolution authority). Instead, the store asks the
  // existing `projects.get(projectId)` authority for the
  // project's directory name. The composition root wires the
  // resolver; tests inject a fake one.
  const projectStoreRootByProjectId = new Map<string, string>();
  const resolveProjectRootForArtifactStore = async (projectId: string) => {
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error('PACKAGING_ARTIFACT_STORE_INVALID_PROJECT_ID');
    }
    const cached = projectStoreRootByProjectId.get(projectId);
    if (cached) return cached;
    // The Shared Core project-store scans `<dataPath>/projects/`
    // and matches `project.json` `id` to `projectId`. We use
    // the same convention: the project's directory name is
    // `<sanitizedName>-<id8>` (the image-generation run-store
    // reuses this layout). The simplest portable resolver is
    // `<dataPath>/projects/<projectId>` — production projects
    // always have an id that matches the directory name (the
    // project-store normalises both to the canonical id).
    const projectRoot = path.join(dataPath, 'projects', projectId);
    projectStoreRootByProjectId.set(projectId, projectRoot);
    return projectRoot;
  };
  // Resolve a project asset to its absolute on-disk path.
  // The packaging reference carries `assetId` (an
  // `AssetItem.id`); the assets are stored under
  // `<projectRoot>/<asset.relativePath>` for generation
  // references, or `<projectRoot>/input/<asset.relativePath>`
  // for analysis sources. The `usage` field on the asset
  // record tells us which subtree to use. The composition
  // root here uses `projects.scanAssets(projectId)` to look
  // up the asset and the project-store convention for the
  // absolute path. Tests can inject a fake resolver.
  const resolveAssetByIdForArtifactStore = async (projectId: string, assetId: string) => {
    if (typeof projectId !== 'string' || !projectId) return null;
    if (typeof assetId !== 'string' || !assetId) return null;
    let summary;
    try {
      summary = await projects.scan(projectId);
    } catch {
      return null;
    }
    const items = summary && Array.isArray(summary.items) ? summary.items : [];
    const item = items.find((candidate) => candidate && candidate.id === assetId);
    if (!item || typeof item.relativePath !== 'string' || !item.relativePath) return null;
    const projectRoot = await resolveProjectRootForArtifactStore(projectId);
    // Asset path convention (mirrors `image-generation/paths.ts`
    // `assetAbsolutePath`): generation references live at
    // `<projectRoot>/<relativePath>`; analysis sources live
    // at `<projectRoot>/input/<relativePath>`.
    const usage = typeof item.usage === 'string' ? item.usage : 'analysis_source';
    const absolutePath = usage === 'generation_reference'
      ? path.join(projectRoot, item.relativePath)
      : path.join(projectRoot, 'input', item.relativePath);
    const extension = (typeof item.extension === 'string' && item.extension) || '';
    const lowerExt = extension.toLowerCase();
    const mimeType = lowerExt === '.jpg' || lowerExt === '.jpeg'
      ? 'image/jpeg'
      : lowerExt === '.webp'
        ? 'image/webp'
        : 'image/png';
    return Object.freeze({
      name: typeof item.name === 'string' ? item.name : 'reference',
      mimeType,
      absolutePath,
    });
  };
  // P3-B5.3 — Canonical Run Registration Bridge instance.
  // The adapter holds the canonical runStore factory
  // (`createRunStore`) and the data path. Each
  // `registerRun` call resolves the session's projectId
  // and writes a canonical `ImageGenerationRun`-shaped
  // record to `<projectRoot>/image-generation/<runId>/
  // run.json`. After this runs the canonical
  // `imageGeneration.getRun(runId)` returns a non-null
  // record; `imageGeneration.listRuns` includes the
  // `pkg-*` run.
  const packagingRunRegistration = createPackagingRunRegistrationAdapter({
    dataPath,
    createRunStore: (dataPathArg, projectId) => createRunStore(dataPathArg, projectId),
    now: () => new Date().toISOString(),
  });

  const packagingArtifactStore = createPackagingArtifactStore({
    dataPath,
    resolveProjectRoot: resolveProjectRootForArtifactStore,
    resolveAssetById: resolveAssetByIdForArtifactStore,
    readFileBytes: async (absolutePath) => fs.readFile(absolutePath),
    writeJsonSafe: async (absolutePath, value) => {
      const result = await atomicWriteJsonWithRetry(absolutePath, value);
      if (!result || result.success !== true) {
        throw new Error('PACKAGING_ARTIFACT_STORE_WRITE_FAILED');
      }
    },
    ensureDir: async (absolutePath) => {
      await fs.mkdir(absolutePath, { recursive: true });
    },
    // The store derives `projectId` from the canonical P3-A
    // view (`view.projectId`) — the Web side never supplies
    // it. The composition root supplies a thin helper that
    // calls `service.getView(sessionId)`.
    getProjectIdForSession: (sessionId) => {
      try {
        const view = packaging.getView(sessionId);
        return typeof view?.projectId === 'string' ? view.projectId : '';
      } catch {
        return '';
      }
    },
    // P3-B5.3 — Canonical Run Registration Bridge. The
    // adapter calls into the existing
    // `createRunStore(dataPath, projectId).saveRun(...)`
    // to write the canonical `<runRoot>/run.json`. The
    // canonical `run.json` is the run identity authority;
    // the sidecar is a target-specific extension written
    // afterwards by the artifact store.
    registerCanonicalRun: async (sessionId, packagingResult) => {
      const view = (() => {
        try {
          return packaging.getView(sessionId);
        } catch {
          return null;
        }
      })();
      const projectId = typeof view?.projectId === 'string' ? view.projectId : '';
      if (!projectId) {
        throw new Error('PACKAGING_BRIDGE_PROJECT_ID_MISSING');
      }
      await packagingRunRegistration.registerRun({ projectId, packagingResult });
    },
    canonicalReadRun: async ({ projectId, runId }) => {
      if (typeof projectId !== 'string' || !projectId) return null;
      if (typeof runId !== 'string' || !runId) return null;
      const persisted = await packagingRunRegistration.readRun({ projectId, runId });
      return persisted || null;
    },
  });

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
      packagingArtifactStore,
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
