import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertInside } from '@masterpiece/runtime-core/application/analysis-contract.ts';
import {
  createAnalysisOperations,
  createContextIntegrationOperations,
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createCreativeIntelligenceOperations,
  createCreativeDirectionOperations,
  createCreativeResearchOperations,
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
import { createCreativeResearchAnalysisAdapter } from '@masterpiece/runtime-core/application/creative-research-analysis-adapter.ts';
import { createCreativeResearchDesignBriefService } from '@masterpiece/runtime-core/application/creative-research-design-brief-service.ts';
import { createCreativeResearchDirectionBoardService } from '@masterpiece/runtime-core/application/creative-research-direction-board-service.ts';
import { createCreativeResearchDirectionBoardStore } from '@masterpiece/runtime-core/application/creative-research-direction-board-store.ts';
import { createCreativeDirectionContextStore } from '@masterpiece/runtime-core/application/creative-research-direction-context-store.ts';
import { createCreativeResearchDirectionService } from '@masterpiece/runtime-core/application/creative-research-direction-service.ts';
import { createCreativeResearchDocumentAdapter } from '@masterpiece/runtime-core/application/creative-research-document-adapter.ts';
import {
  BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID,
  createBaiduReferenceSearchGateway,
} from '@masterpiece/runtime-core/application/creative-research-reference-search-baidu.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';
import { createCreativeResearchReferenceImageCache } from '@masterpiece/runtime-core/application/creative-research-reference-image-cache.ts';
import { createCreativeResearchSearchRefinementAdapter } from '@masterpiece/runtime-core/application/creative-research-search-refinement-adapter.ts';
import { createCreativeResearchSearchRefinementService } from '@masterpiece/runtime-core/application/creative-research-search-refinement-service.ts';
import { createCreativeResearchSearchStrategyService } from '@masterpiece/runtime-core/application/creative-research-search-strategy-service.ts';
import { createCreativeResearchReanalysisAdapter } from '@masterpiece/runtime-core/application/creative-research-reanalysis-adapter.ts';
import { createCreativeResearchReanalysisService } from '@masterpiece/runtime-core/application/creative-research-reanalysis-service.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import { createCreativeResearchSelectionService } from '@masterpiece/runtime-core/application/creative-research-selection-service.ts';
import { createCreativeResearchPreferenceAnalysisAdapter } from '@masterpiece/runtime-core/application/creative-research-preference-analysis-adapter.ts';
import { createCreativeResearchPreferenceAnalysisService } from '@masterpiece/runtime-core/application/creative-research-preference-analysis-service.ts';
import { createCreativeResearchPreferenceStore } from '@masterpiece/runtime-core/application/creative-research-preference-store.ts';
import { createCreativeResearchPlannerAdapter } from '@masterpiece/runtime-core/application/creative-research-planner-adapter.ts';
import { createCreativeResearchPlannerService } from '@masterpiece/runtime-core/application/creative-research-planner-service.ts';
import { createCreativeResearchReferenceGuideStore } from '@masterpiece/runtime-core/application/creative-research-reference-guide-store.ts';
import { createCreativeResearchReferenceGuideService } from '@masterpiece/runtime-core/application/creative-research-reference-guide-service.ts';
import { createCreativeResearchCuratedReferenceService } from '@masterpiece/runtime-core/application/creative-research-curated-reference-service.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { createCreativeDirectionStore } from '@masterpiece/runtime-core/application/creative-direction-store.ts';
import { createCreativeDirectionApplicationService } from '@masterpiece/runtime-core/application/creative-direction-application-service.ts';
import type { RuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import type {
  ProviderCredentials,
  ProjectRecord,
  ProjectVisualContextShortChain,
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
  searchCredential: {
    has(credentialId: string): Promise<boolean>;
    read(credentialId: string): Promise<string>;
    write(credentialId: string, value: string): Promise<void>;
    remove(credentialId: string): Promise<void>;
  };
}

/**
 * P3-C4.1 narrow corrective projection.
 *
 * Each field is copied from its existing canonical owner. This is deliberately
 * not a fallback chain: ProjectRecord owns project/display identity, the
 * canonical Project Visual Context owns the evidence-backed brand role, and
 * the existing Locked Assets projection owns product identity.
 */
export function projectCanonicalIdentityFromAuthorities(input: {
  projectId: string;
  project: ProjectRecord | null;
  projectVisualContext: ProjectVisualContextShortChain;
  productIdentityName: string;
}) {
  const projectFacts = input.projectVisualContext.promptSourceObject?.projectFacts;
  return Object.freeze({
    projectId: input.project?.id || input.projectId,
    projectName: input.project?.projectName || '',
    brandName: input.project?.brandName || '',
    industry: input.project?.industry || '',
    brandRole: typeof projectFacts?.brandRole === 'string' ? projectFacts.brandRole.trim() : '',
    productIdentity: input.productIdentityName,
  });
}

// CI-W1B.1 follow-up — browser document intake for Creative Intelligence.
// The `document-context:choose-documents` bridge is env-var driven for
// smoke/E2E runs; real browsers have no host file dialog. This channel
// receives document bytes (base64, from a browser <input type=file>) and
// persists them under <userData>/documents-intake/<batch>/ so the CI
// runtime can consume the returned absolute paths exactly like paths
// chosen by the host bridge.
const DOCUMENT_IMPORT_EXTENSIONS = new Set(['.pdf', '.docx', '.md', '.markdown', '.txt']);
const DOCUMENT_IMPORT_MAX_FILES = 30;
const DOCUMENT_IMPORT_MAX_FILE_BYTES = 32 * 1024 * 1024;

function sanitizeImportName(rawName: unknown): string {
  const base = path.basename(String(rawName ?? '')).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim();
  return base || 'document.txt';
}

async function importDocumentBatch(input: unknown, intakeRoot: string): Promise<string[]> {
  const payload = (input && typeof input === 'object' ? input : {}) as { documents?: Array<{ name?: unknown; content?: unknown; size?: unknown }> };
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  if (documents.length === 0) throw new Error('WEB_DOCUMENT_IMPORT_EMPTY: 没有可导入的文档');
  if (documents.length > DOCUMENT_IMPORT_MAX_FILES) throw new Error(`WEB_DOCUMENT_IMPORT_TOO_MANY: 一次最多导入 ${DOCUMENT_IMPORT_MAX_FILES} 份文档`);
  const batchRoot = assertInside(intakeRoot, path.join(intakeRoot, randomUUID()));
  await fs.mkdir(batchRoot, { recursive: true });
  const paths: string[] = [];
  try {
    for (const document of documents) {
      const name = sanitizeImportName(typeof document?.name === 'string' ? document.name : '');
      const extension = path.extname(name).toLowerCase();
      if (!DOCUMENT_IMPORT_EXTENSIONS.has(extension)) {
        throw new Error(`WEB_DOCUMENT_IMPORT_UNSUPPORTED: 仅支持 PDF / DOCX / Markdown / TXT（收到 ${extension || '无扩展名'}）`);
      }
      const content = typeof document?.content === 'string' ? document.content : '';
      if (!content) throw new Error(`WEB_DOCUMENT_IMPORT_EMPTY: 「${name}」内容为空`);
      let buffer: Buffer;
      try {
        buffer = Buffer.from(content, 'base64');
      } catch {
        throw new Error(`WEB_DOCUMENT_IMPORT_TRANSPORT_FAILED: 「${name}」内容编码无效`);
      }
      if (buffer.length === 0) throw new Error(`WEB_DOCUMENT_IMPORT_EMPTY: 「${name}」内容为空`);
      if (buffer.length > DOCUMENT_IMPORT_MAX_FILE_BYTES) {
        throw new Error(`WEB_DOCUMENT_IMPORT_TOO_LARGE: 「${name}」超过 32 MiB 上限`);
      }
      const declaredSize = typeof document?.size === 'number' ? document.size : buffer.length;
      if (declaredSize !== buffer.length) {
        throw new Error(`WEB_DOCUMENT_IMPORT_TRANSPORT_FAILED: 「${name}」内容与声明大小不一致`);
      }
      const destination = assertInside(batchRoot, path.join(batchRoot, name));
      await fs.writeFile(destination, buffer);
      paths.push(destination);
    }
    return paths;
  } catch (error) {
    await fs.rm(batchRoot, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

const VISUAL_IMPORT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.zip']);
const VISUAL_IMPORT_MAX_FILES = 30;
const VISUAL_IMPORT_MAX_FILE_BYTES = 48 * 1024 * 1024;

interface StagedVisualBatch {
  root: string;
  paths: string[];
}

async function stageVisualBatch(input: unknown, intakeRoot: string): Promise<StagedVisualBatch> {
  const payload = (input && typeof input === 'object' ? input : {}) as {
    files?: Array<{ name?: unknown; content?: unknown; size?: unknown }>;
  };
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (files.length === 0) throw new Error('WEB_VISUAL_IMPORT_EMPTY: 没有可导入的视觉素材');
  if (files.length > VISUAL_IMPORT_MAX_FILES) {
    throw new Error(`WEB_VISUAL_IMPORT_TOO_MANY: 一次最多导入 ${VISUAL_IMPORT_MAX_FILES} 个文件`);
  }
  const batchRoot = assertInside(intakeRoot, path.join(intakeRoot, randomUUID()));
  await fs.mkdir(batchRoot, { recursive: true });
  const paths: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const name = sanitizeImportName(typeof file?.name === 'string' ? file.name : '');
      const extension = path.extname(name).toLowerCase();
      if (!VISUAL_IMPORT_EXTENSIONS.has(extension)) {
        throw new Error(`WEB_VISUAL_IMPORT_UNSUPPORTED: 仅支持 ZIP / JPG / JPEG / PNG / WEBP / PDF（收到 ${extension || '无扩展名'}）`);
      }
      const content = typeof file?.content === 'string' ? file.content : '';
      if (!content) throw new Error(`WEB_VISUAL_IMPORT_EMPTY: 「${name}」内容为空`);
      const buffer = Buffer.from(content, 'base64');
      const declaredSize = typeof file?.size === 'number' ? file.size : buffer.length;
      if (!buffer.length || declaredSize !== buffer.length) {
        throw new Error(`WEB_VISUAL_IMPORT_TRANSPORT_FAILED: 「${name}」内容与声明大小不一致`);
      }
      if (buffer.length > VISUAL_IMPORT_MAX_FILE_BYTES) {
        throw new Error(`WEB_VISUAL_IMPORT_TOO_LARGE: 「${name}」超过 48 MiB 上限`);
      }
      const fileRoot = assertInside(batchRoot, path.join(batchRoot, String(index)));
      await fs.mkdir(fileRoot, { recursive: true });
      const destination = assertInside(fileRoot, path.join(fileRoot, name));
      await fs.writeFile(destination, buffer);
      paths.push(destination);
    }
    return { root: batchRoot, paths };
  } catch (error) {
    await fs.rm(batchRoot, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
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
  const creativeResearchStore = createCreativeResearchStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchResearchStore = createCreativeResearchResearchStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchDocumentAdapter = createCreativeResearchDocumentAdapter();
  const creativeResearchBriefs = createCreativeResearchDesignBriefService({
    ...creativeResearchStore,
    documentAdapter: creativeResearchDocumentAdapter,
    analysisAdapter: createCreativeResearchAnalysisAdapter({
      readCredentials: async (profileId) => readCredentials(profileId),
    }),
  });
  const creativeResearchPlanner = createCreativeResearchPlannerService({
    ...creativeResearchStore,
    plans: creativeResearchResearchStore.plans,
    adapter: createCreativeResearchPlannerAdapter({
      readCredentials: async (profileId) => readCredentials(profileId),
    }),
  });
  const creativeResearchGuideStore = createCreativeResearchReferenceGuideStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchGuide = createCreativeResearchReferenceGuideService({
    sessions: creativeResearchStore.sessions,
    briefs: creativeResearchStore.briefs,
    guides: creativeResearchGuideStore,
    createGroups: (sessionId, input) => creativeResearchPlanner.createReferenceGuideGroups(sessionId, input),
  });
  const creativeResearchCurated = createCreativeResearchCuratedReferenceService({
    readDefaultDataPath: async () => dataPath,
    sessions: creativeResearchStore.sessions,
    references: creativeResearchResearchStore.references,
  });
  const creativeResearchSearch = createCreativeResearchReferenceSearchService({
    ...creativeResearchStore,
    ...creativeResearchResearchStore,
    gateway: createBaiduReferenceSearchGateway({
      readCredential: () => adapters.searchCredential.read(BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID),
    }),
    imageCache: createCreativeResearchReferenceImageCache({ readDefaultDataPath: async () => dataPath }),
  });
  const creativeResearchSelection = createCreativeResearchSelectionService({
    references: creativeResearchResearchStore.references,
    sessions: creativeResearchStore.sessions,
  });
  const creativeResearchPreferenceStore = createCreativeResearchPreferenceStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchPreferences = createCreativeResearchPreferenceAnalysisService({
    briefs: creativeResearchStore.briefs,
    references: creativeResearchResearchStore.references,
    insights: creativeResearchPreferenceStore,
    sessions: creativeResearchStore.sessions,
    adapter: createCreativeResearchPreferenceAnalysisAdapter({
      readCredentials: async (profileId) => readCredentials(profileId),
    }),
  });
  const creativeResearchRefinement = createCreativeResearchSearchRefinementService({
    ...creativeResearchStore,
    ...creativeResearchResearchStore,
    insights: creativeResearchPreferenceStore,
    adapter: createCreativeResearchSearchRefinementAdapter({ readCredentials: async (profileId) => readCredentials(profileId) }),
  });
  const creativeResearchStrategy = createCreativeResearchSearchStrategyService({
    ...creativeResearchStore,
    ...creativeResearchResearchStore,
  });
  const creativeResearchReanalysis = createCreativeResearchReanalysisService({
    ...creativeResearchStore,
    ...creativeResearchResearchStore,
    insights: creativeResearchPreferenceStore,
    documentAdapter: creativeResearchDocumentAdapter,
    adapter: createCreativeResearchReanalysisAdapter({ readCredentials: async (profileId) => readCredentials(profileId) }),
  });
  const creativeResearchDirectionBoards = createCreativeResearchDirectionBoardStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchDirectionContexts = createCreativeDirectionContextStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchDirectionBoardService = createCreativeResearchDirectionBoardService({
    references: creativeResearchResearchStore.references,
    insights: creativeResearchPreferenceStore,
    boards: creativeResearchDirectionBoards,
  });
  const creativeResearchDirection = createCreativeResearchDirectionService({
    sessions: creativeResearchStore.sessions,
    briefs: creativeResearchStore.briefs,
    references: creativeResearchResearchStore.references,
    insights: creativeResearchPreferenceStore,
    boards: creativeResearchDirectionBoards,
    contexts: creativeResearchDirectionContexts,
    boardService: creativeResearchDirectionBoardService,
  });
  const creativeDirectionStore = createCreativeDirectionStore({ readDefaultDataPath: async () => dataPath });
  const creativeResearchIntakeRoot = path.resolve(dataPath, '..', 'documents-intake');
  const creativeResearchBrowserBriefs = {
    ...creativeResearchBriefs,
    createSession: async (input: { projectId: string; sourceDocumentIds: string[] }) => {
      const sourceDocumentIds = input.sourceDocumentIds.map((source) =>
        assertInside(creativeResearchIntakeRoot, path.resolve(String(source || ''))));
      return creativeResearchBriefs.createSession({ ...input, sourceDocumentIds });
    },
  };
  const {
    projects, reports, pipeline, documentContext, projectContext, contextIntegration,
    referenceAnchor, imageGeneration, shortChainGeneration, creativeSessions,
    creativeDirections, styleProfiles, lockedAssets, visualMemory, anchorCandidates,
    visualCanons, referencePacks, creativeReading, creativeProductionBootstrap,
    quickStyleExtraction, creativeGeneration, anchorGeneration, visualExplorations,
    generationSeries, generationSeriesExecution, formalAssets,
    packaging,
    // CI-W1A: Creative Intelligence Runtime Application Layer.
    creativeIntelligence,
  } = services;
  const creativeDirection = createCreativeDirectionApplicationService({
    store: creativeDirectionStore,
    loadStrategy: (runId) => creativeIntelligence.getWorkspace(runId),
    loadVisualResearch: async (sessionId) => {
      const [session, boardResult, contextResult] = await Promise.all([
        creativeResearchStore.sessions.get(sessionId),
        creativeResearchDirection.getDirectionBoard(sessionId),
        creativeResearchDirection.getDirectionContext(sessionId),
      ]);
      if (!session) throw new Error(`CREATIVE_RESEARCH_SESSION_NOT_FOUND: ${sessionId}`);
      return { session, board: boardResult.board, context: contextResult.context };
    },
  });

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

    const projectIdentity = projectCanonicalIdentityFromAuthorities({
      projectId: safeId,
      project,
      projectVisualContext,
      productIdentityName,
    });
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
    {
      // CI-W1B.1 follow-up: browser document intake. Lives here (not in
      // node-native-operations) so the Web Host frozen-surface diff keeps
      // its existing file set: current-operation-graph.ts already carries
      // the Node document pipeline wiring.
      'document-context:import-documents': async (_context: unknown, input: unknown) =>
        importDocumentBatch(input, path.resolve(dataPath, '..', 'documents-intake')),
      'projects:create-from-browser-files': async (_context: unknown, input: unknown) => {
        const payload = (input && typeof input === 'object' ? input : {}) as { apiProfileId?: unknown };
        const staged = await stageVisualBatch(input, path.resolve(dataPath, '..', 'visual-intake'));
        try {
          return await projects.create({
            sourcePaths: staged.paths,
            apiProfileId: typeof payload.apiProfileId === 'string' ? payload.apiProfileId : '',
          });
        } finally {
          await fs.rm(staged.root, { recursive: true, force: true }).catch(() => undefined);
        }
      },
      'projects:import-browser-files': async (_context: unknown, input: unknown) => {
        const payload = (input && typeof input === 'object' ? input : {}) as { projectId?: unknown };
        const staged = await stageVisualBatch(input, path.resolve(dataPath, '..', 'visual-intake'));
        try {
          return await projects.importFiles(
            typeof payload.projectId === 'string' ? payload.projectId : '',
            staged.paths,
            'assets',
          );
        } finally {
          await fs.rm(staged.root, { recursive: true, force: true }).catch(() => undefined);
        }
      },
    },
    createReferenceOperations({ referenceAnchor }),
    createImageGenerationOperations({ service: imageGeneration, shortChainService: shortChainGeneration }),
    // CI-W1A: Creative Intelligence Runtime Application Layer operations.
    // Bound to the same kebab-case RPC channels the Web side expects
    // (creative-intelligence:list-runs, etc.). The Web never imports
    // the application service directly.
    createCreativeIntelligenceOperations({ creativeIntelligence }),
    createCreativeDirectionOperations({ creativeDirection }),
    createCreativeResearchOperations({
      briefs: creativeResearchBrowserBriefs,
      search: creativeResearchSearch,
      planner: creativeResearchPlanner,
      guide: creativeResearchGuide,
      curated: creativeResearchCurated,
      importCuratedFiles: async (sessionId, input) => {
        const staged = await stageVisualBatch(input, path.resolve(dataPath, '..', 'reference-intake'));
        try {
          const payload = (input && typeof input === 'object' ? input : {}) as { files?: Array<{ name?: unknown; sourceUrl?: unknown; sourceLabel?: unknown }> };
          return await creativeResearchCurated.importCuratedReferences(sessionId, staged.paths.map((filePath, index) => ({
            path: filePath,
            originalFileName: typeof payload.files?.[index]?.name === 'string' ? payload.files[index]!.name as string : path.basename(filePath),
            ...(typeof payload.files?.[index]?.sourceUrl === 'string' ? { sourceUrl: payload.files[index]!.sourceUrl as string } : {}),
            ...(typeof payload.files?.[index]?.sourceLabel === 'string' ? { sourceLabel: payload.files[index]!.sourceLabel as string } : {}),
          })));
        } finally {
          await fs.rm(staged.root, { recursive: true, force: true }).catch(() => undefined);
        }
      },
      history: creativeResearchResearchStore.history,
      selection: creativeResearchSelection,
      preferences: creativeResearchPreferences,
      direction: creativeResearchDirection,
      refinement: creativeResearchRefinement,
      strategy: creativeResearchStrategy,
      reanalysis: creativeResearchReanalysis,
      listSessions: (projectId) => creativeResearchStore.sessions.listByProject(projectId),
      deleteSession: (sessionId) => creativeResearchStore.sessions.delete(sessionId),
      credential: {
        has: () => adapters.searchCredential.has(BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID),
        save: (value) => adapters.searchCredential.write(BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID, value),
        remove: () => adapters.searchCredential.remove(BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID),
      },
    }),
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
