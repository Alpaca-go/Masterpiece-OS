import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ImageGenerationRun,
  VNextCompiledPrompt,
  VNextConfirmedGeneratedOutput,
  VNextCreativeSession,
  VNextDeliverableFamily,
  VNextModelPromptPayload,
  VNextTaskContract,
  VNextProjectPromptAsset,
  VNextValidatedGenerationResult,
  VNextGenerationFlowState,
  VNextValidatedGenerationImageRef,
} from '@masterpiece/image-generation-contracts/index.ts';
import {
  compileVNextCorrectionPrompt,
  compileVNextImageGeneration,
  listVNextTemplateOptions,
  deriveGenerationFlowState,
} from '@masterpiece/image-generation-runtime/vnext/index.js';
import {
  assertSpaceGenerationRouteGateA,
  assertProviderPromptGateB,
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  resolveContinuationReference,
  runSpaceQualityGate,
  validateSpatialSemantics,
  resolveEffectiveMaxReferences,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';
import { createSeedreamVNextAdapter } from '@masterpiece/image-generation-runtime/vnext/seedream-adapter.js';
import {
  resolveReferenceAssets,
  type ResolvedReferenceAsset,
  type ReferenceResolutionFailure,
} from '../reference-asset-resolver.ts';
import type { ProjectContextService } from '../project-context-service.ts';
import type { ProjectStore } from '../project-store.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';
import type { VNextDeliverableValidatorService } from './vnext-deliverable-validator-service.ts';
import {
  postCompositeConfirmedLogo,
  type NormalizedPlacement,
  type PixelRect,
} from './logo-post-composite.ts';

export interface CompileVNextGenerationInput {
  projectId: string;
  model?: string;
  task: Omit<VNextTaskContract, 'schemaVersion' | 'taskId' | 'projectId' | 'createdAt'> & {
    taskId?: string;
  };
}

export interface CompileVNextGenerationResult {
  taskContract: VNextTaskContract;
  compiledPrompt: VNextCompiledPrompt;
  payload: VNextModelPromptPayload;
  artifactDirectory: string;
}

// R11.A0 / Phase A0 (r2.0 §4.11): the previous `flatMap` returned `[]` for any
// reference asset ID that the static `sourceAssetRefs` did not know, which made
// post-analysis uploads fail silently with `SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED`.
// A0 is the smallest possible fix: surface the missing IDs immediately at
// generation time. The full resolver + UI preflight lives in Phase C; this
// helper only guarantees we never silently drop a user-selected reference.
//
// Exported for unit testing; not part of the public IPC surface.
export function assertReferenceAssetsResolvable(
  explicitIds: readonly string[],
  sourceAssetRefs: ReadonlyArray<{ assetId: string }>,
  projectId: string,
): void {
  if (!explicitIds || explicitIds.length === 0) return;
  const known = new Set(sourceAssetRefs.map((ref) => ref.assetId));
  const missing = explicitIds.filter((id) => !known.has(id));
  if (missing.length === 0) return;
  const err = new Error(
    `REFERENCE_ASSET_NOT_FOUND: ${missing.length} reference asset(s) not found in project ${projectId}: `
      + `${missing.join(', ')}. `
      + 'Re-upload the asset(s) or rebuild the project analysis context.',
  );
  Object.assign(err, {
    code: 'REFERENCE_ASSET_NOT_FOUND',
    missingAssetIds: [...missing],
    projectId,
  });
  throw err;
}

// r2.0 §4.11 / Phase C-2: wrap the Reference Asset Resolver so the
// vnext-service.start() path can fail closed with a single typed Error
// per call site. The wrapper is intentionally Main-process only — it
// touches projects (ProjectStore), so it does NOT belong in the pure
// resolver module.
async function resolveExplicitReferencesOrThrow(
  explicitIds: string[],
  projectId: string,
  projects: ProjectStore,
): Promise<
  Array<{ assetId: string; role: string; relativePath: string }>
> {
  if (!explicitIds || explicitIds.length === 0) return [];
  const [projectPaths, project] = await Promise.all([
    projects.paths(projectId),
    projects.get(projectId),
  ]);
  // Skip the SHA recompute: the project store records the SHA at import
  // time, and post-import tampering is a separate concern (the resolver
  // exposes REFERENCE_ASSET_SHA_MISMATCH when verifySha256 is true).
  const { resolved, failures } = await resolveReferenceAssets(
    explicitIds,
    { projectRoot: projectPaths.root, verifySha256: false },
    project.assets,
  );
  if (failures.length > 0) {
    const first = failures[0]!;
    throw Object.assign(
      new Error(`${first.code}: ${first.message}`),
      { code: first.code, referenceAssetId: first.assetId, failures },
    );
  }
  return resolved.map((record) => ({
    assetId: record.assetId,
    role: record.role,
    relativePath: record.relativePath,
  }));
}

export interface StartVNextGenerationInput {
  projectId: string;
  taskId: string;
  apiProfileId?: string;
  editedPrompt?: string;
  dryRun?: boolean;
}

export interface StartValidatedVNextGenerationInput extends StartVNextGenerationInput {
  validatorProfileId?: string;
}

export interface PostCompositeVNextLogoInput {
  projectId: string;
  runId: string;
  imageId: string;
  logoAssetId: string;
  confirmedByUser: true;
  sourceCrop: PixelRect;
  placement: NormalizedPlacement;
  removeBackground?: {
    enabled: boolean;
    tolerance?: number;
  };
}

export interface SaveVNextProjectPromptAssetInput {
  projectId: string;
  deliverableFamily: VNextDeliverableFamily;
  name: string;
  promptFragments: string[];
  negativeConstraints?: string[];
}

const SESSION_FILENAME = 'creative-session.json';

function aspectSize(aspectRatio: VNextTaskContract['aspectRatio']): string {
  return {
    '1:1': '2048*2048',
    '4:3': '2048*1536',
    '3:4': '1536*2048',
    '16:9': '2560*1440',
    '9:16': '1440*2560',
  }[aspectRatio];
}

function promptBlockIds(prompt: string, blocks: Array<{ id: string; title?: string }>): string[] {
  return blocks
    .filter((block) => block.title && prompt.includes(`# ${block.title}`))
    .map((block) => block.id);
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage ?? `Failed to write ${path.basename(filename)}`), {
      code: 'VNEXT_COMPILE_ARTIFACT_WRITE_FAILED',
    });
  }
}

export function createVNextImageGenerationService(
  projects: ProjectStore,
  projectContext: ProjectContextService,
  getImageGeneration: () => ImageGenerationService,
  getValidator?: () => VNextDeliverableValidatorService,
) {
  async function vnextRoot(projectId: string): Promise<string> {
    return path.join((await projects.paths(projectId)).root, 'image-generation-vnext');
  }

  async function readSession(projectId: string): Promise<VNextCreativeSession> {
    const root = await vnextRoot(projectId);
    const stored = await fs.readFile(path.join(root, SESSION_FILENAME), 'utf8')
      .then((value) => JSON.parse(value) as VNextCreativeSession)
      .catch(() => null);
    if (stored?.schemaVersion === '1.0' && stored.projectId === projectId) return stored;
    const now = new Date().toISOString();
    return {
      schemaVersion: '1.0',
      projectId,
      currentTask: null,
      history: [],
      implicitAnchors: {},
      projectPromptAssets: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  async function saveSession(session: VNextCreativeSession): Promise<VNextCreativeSession> {
    await writeJson(path.join(await vnextRoot(session.projectId), SESSION_FILENAME), session);
    return session;
  }

  async function readCompilation(
    projectId: string,
    taskId: string,
  ): Promise<CompileVNextGenerationResult> {
    const directory = path.join(await vnextRoot(projectId), 'compilations', path.basename(taskId));
    const [taskContract, compiledPrompt, payload] = await Promise.all([
      fs.readFile(path.join(directory, 'task-contract.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(directory, 'compiled-prompt.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(directory, 'model-payload.json'), 'utf8').then(JSON.parse),
    ]) as [VNextTaskContract, VNextCompiledPrompt, VNextModelPromptPayload];
    if (taskContract.projectId !== projectId || taskContract.taskId !== taskId) {
      throw Object.assign(new Error('vNext compilation does not belong to this project/task'), {
        code: 'VNEXT_COMPILE_ARTIFACT_INVALID',
      });
    }
    return { taskContract, compiledPrompt, payload, artifactDirectory: directory };
  }

  async function compile(input: CompileVNextGenerationInput): Promise<CompileVNextGenerationResult> {
    const context = await projectContext.getVNext(input.projectId)
      .catch(() => projectContext.rebuildVNext(input.projectId));
    const packetLogoAssetIds = context.visualDecisionPacket?.lockedAssets
      .filter((item) => item.type === 'logo')
      .map((item) => item.assetId)
      ?? [];
    const logoAssetIds = packetLogoAssetIds.length
      ? packetLogoAssetIds
      : context.promptSourceObject?.lockedAssets.logoAssetIds.length
        ? context.promptSourceObject.lockedAssets.logoAssetIds
        : context.lockedAssets.logoAssetIds;
    const preferredLogoAssetId = packetLogoAssetIds[0]
      || context.promptSourceObject?.lockedAssets.preferredLogoAssetId
      || logoAssetIds[0]
      || null;
    const logoUsageMode = input.task.logoUsageMode
      || (preferredLogoAssetId ? 'post_composite' : 'blank_area');
    if (preferredLogoAssetId && logoUsageMode !== 'post_composite') {
      throw Object.assign(
        new Error('LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: confirmed Logo must use post-composite mode.'),
        { code: 'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED' },
      );
    }
    if (logoUsageMode === 'post_composite' && !preferredLogoAssetId) {
      throw Object.assign(
        new Error(`${logoUsageMode} Logo mode requires a confirmed Logo asset`),
        { code: 'VNEXT_LOGO_REFERENCE_MISSING' },
      );
    }
    const logoAssetIdSet = new Set(logoAssetIds);
    const requestedReferenceIds = input.task.referenceAssetIds ?? [];
    const referenceAssetIds = logoUsageMode === 'reference'
      ? [...new Set([preferredLogoAssetId!, ...requestedReferenceIds])]
      : requestedReferenceIds.filter((assetId) => !logoAssetIdSet.has(assetId));
    const paths = await projects.paths(input.projectId);
    const approvedCreativeDecision = await fs.readFile(
      path.join(paths.root, 'outputs', 'creative_decision.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as Record<string, unknown>).catch(() => undefined);
    const userConfirmedVisualDecision = await fs.readFile(
      path.join(paths.root, 'project-context', 'user-confirmed-visual-decision.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as Record<string, unknown>).catch(() => undefined);
    const projectPromptAsset = await fs.readFile(
      path.join(
        paths.root,
        'image-generation-vnext',
        'prompt-assets',
        `${input.task.deliverableFamily}.json`,
      ),
      'utf8',
    ).then((value) => JSON.parse(value) as VNextProjectPromptAsset).catch(() => undefined);
    const result = compileVNextImageGeneration({
      projectContext: context,
      model: input.model,
      projectPromptAsset,
      approvedCreativeDecision,
      userConfirmedVisualDecision,
      task: {
        ...input.task,
        projectId: input.projectId,
        logoUsageMode,
        referenceAssetIds,
      },
    }) as Omit<CompileVNextGenerationResult, 'artifactDirectory'> & {
      route: unknown;
    };
    const artifactDirectory = path.join(
      paths.root,
      'image-generation-vnext',
      'compilations',
      result.taskContract.taskId,
    );
    await fs.mkdir(artifactDirectory, { recursive: true });
    await Promise.all([
      writeJson(path.join(artifactDirectory, 'task-contract.json'), result.taskContract),
      writeJson(path.join(artifactDirectory, 'compiled-prompt.json'), result.compiledPrompt),
      writeJson(path.join(artifactDirectory, 'model-payload.json'), result.payload),
      writeJson(path.join(artifactDirectory, 'provider-payload-preview.json'), result.payload),
      ...(result.compiledPrompt.effectiveVisualDecisionPacket ? [
        writeJson(
          path.join(artifactDirectory, 'effective-visual-decision-packet.json'),
          result.compiledPrompt.effectiveVisualDecisionPacket,
        ),
      ] : []),
      writeJson(path.join(artifactDirectory, 'trace.json'), {
        projectId: input.projectId,
        taskId: result.taskContract.taskId,
        contextVersion: result.compiledPrompt.projectContextVersion,
        contextFingerprint: context.provenance.sourceFingerprint,
        route: result.compiledPrompt.route,
        trace: result.compiledPrompt.trace,
        spaceGeneration: (result.compiledPrompt.trace as unknown as {
          spaceGeneration?: Record<string, unknown>;
        }).spaceGeneration,
        compiledAt: result.compiledPrompt.compiledAt,
      }),
      ...(logoUsageMode === 'post_composite' ? [
        writeJson(path.join(artifactDirectory, 'logo-post-composite-plan.json'), {
          schemaVersion: '1.0',
          projectId: input.projectId,
          taskId: result.taskContract.taskId,
          logoAssetId: preferredLogoAssetId,
          status: 'awaiting_generation_and_placement',
          source: packetLogoAssetIds.includes(preferredLogoAssetId || '')
            ? 'visual_decision_packet.lockedAssets'
            : 'project_context.lockedAssets',
          createdAt: result.compiledPrompt.compiledAt,
        }),
      ] : []),
      fs.writeFile(
        path.join(artifactDirectory, 'compiled-prompt.md'),
        `${result.compiledPrompt.editablePrompt}\n`,
        'utf8',
      ),
    ]);
    console.info(JSON.stringify({
      event: 'VNEXT_IMAGE_PROMPT_COMPILED',
      projectId: input.projectId,
      taskId: result.taskContract.taskId,
      deliverableFamily: result.taskContract.deliverableFamily,
      subtype: result.taskContract.subtype,
      shot: result.taskContract.shot,
      contextVersion: result.compiledPrompt.projectContextVersion,
      templateIds: Object.keys(result.compiledPrompt.route.templateVersions),
      adapterId: result.compiledPrompt.trace.adapterId,
      promptCharacters: result.compiledPrompt.trace.promptCharacters,
      compileDurationMs: result.compiledPrompt.trace.compileDurationMs,
    }));
    const session = await readSession(input.projectId);
    await saveSession({
      ...session,
      currentTask: result.taskContract,
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: 'compiled',
        taskId: result.taskContract.taskId,
        deliverableFamily: result.taskContract.deliverableFamily,
        subtype: result.taskContract.subtype,
        shot: result.taskContract.shot,
        promptFingerprint: result.compiledPrompt.trace.sourceFingerprint,
        createdAt: result.compiledPrompt.compiledAt,
      }],
      updatedAt: new Date().toISOString(),
    });
    return {
      taskContract: result.taskContract,
      compiledPrompt: result.compiledPrompt,
      payload: result.payload,
      artifactDirectory,
    };
  }

  async function start(input: StartVNextGenerationInput): Promise<ImageGenerationRun> {
    let compilation = await readCompilation(input.projectId, input.taskId);
    let preflight = (compilation.compiledPrompt as VNextCompiledPrompt & {
      preflightReport?: { status?: string; findings?: Array<{ code?: string }> };
    }).preflightReport;
    if (preflight?.status !== 'pass') {
      // The cached `preflightReport` was produced at compile time. When
      // the vNext preflight rules are tightened or relaxed (or when a
      // stale build is loaded after a Desktop upgrade), a previously
      // passing compile can suddenly appear blocked, or a previously
      // blocked compile can become passing. Trusting the cached value
      // blindly would force every user to re-click "查看最终 Prompt"
      // after every code change. Instead, transparently re-compile the
      // task using the stored `task-contract.json` + any user-edited
      // prompt, then re-check the preflight against the current code.
      // Only when the *fresh* compile still blocks do we surface the
      // error to the user.
      try {
        const task = compilation.taskContract;
        const apiProfileId = (await projects.get(input.projectId)).apiProfileId;
        // Reuse the existing `taskId` so the recompile overwrites the
        // exact same compile artifact directory; otherwise the new run
        // would land next to the old one and `start` would keep reading
        // the stale `compiled-prompt.json` on the next attempt.
        compilation = await compile({
          projectId: input.projectId,
          task: {
            taskId: task.taskId,
            deliverableFamily: task.deliverableFamily,
            subtype: task.subtype,
            shot: task.shot,
            count: task.count,
            aspectRatio: task.aspectRatio,
            currentInstruction: task.currentInstruction,
            generationBasis: task.generationBasis,
            mustInclude: [...task.mustInclude],
            mustAvoid: [...task.mustAvoid],
            referenceAssetIds: [...task.referenceAssetIds],
            logoUsageMode: task.logoUsageMode,
          },
          ...(apiProfileId ? { apiProfileId } : {}),
        });
        preflight = (compilation.compiledPrompt as VNextCompiledPrompt & {
          preflightReport?: { status?: string; findings?: Array<{ code?: string }> };
        }).preflightReport;
      } catch (recompileError) {
        // Re-compile failed for some other reason; fall through to the
        // original blocked report so the user still sees the underlying
        // finding codes.
        preflight = (compilation.compiledPrompt as VNextCompiledPrompt & {
          preflightReport?: { status?: string; findings?: Array<{ code?: string }> };
        }).preflightReport;
      }
    }
    if (preflight?.status !== 'pass') {
      throw Object.assign(new Error(
        `PROMPT_PREFLIGHT_BLOCKED: ${(preflight?.findings || [])
          .map((item) => item.code)
          .filter(Boolean)
          .join(', ')}`,
      ), {
        code: preflight?.findings?.[0]?.code || 'PROMPT_PREFLIGHT_BLOCKED',
        findings: preflight?.findings || [],
      });
    }
    if (compilation.taskContract.count !== 1) {
      throw Object.assign(new Error('vNext formal-first generation starts with exactly one image'), {
        code: 'VNEXT_FORMAL_FIRST_COUNT_INVALID',
      });
    }
    const currentContext = await projectContext.getVNext(input.projectId);
    const lockedLogoAssetIds = new Set([
      ...(currentContext.visualDecisionPacket?.lockedAssets
        .filter((item) => item.type === 'logo')
        .map((item) => item.assetId) ?? []),
      ...(currentContext.promptSourceObject?.lockedAssets.logoAssetIds ?? []),
      ...currentContext.lockedAssets.logoAssetIds,
    ]);
    const traceFile = JSON.parse(
      await fs.readFile(path.join(compilation.artifactDirectory, 'trace.json'), 'utf8'),
    ) as { contextFingerprint?: string };
    if (traceFile.contextFingerprint !== currentContext.provenance.sourceFingerprint) {
      throw Object.assign(new Error('Project context changed after compilation; compile the task again'), {
        code: 'VNEXT_COMPILE_INPUT_STALE',
      });
    }
    const session = await readSession(input.projectId);
    const implicitAnchor = session.implicitAnchors[compilation.taskContract.deliverableFamily];
    const explicitIds = compilation.taskContract.referenceAssetIds;
    const generationBasis = compilation.taskContract.generationBasis
      ?? (explicitIds.length ? 'reference_first' : 'standard');
    const isSpace = compilation.taskContract.deliverableFamily === 'space';
    const phase9b = (compilation.compiledPrompt as unknown as {
      phase9b?: {
        compilerId?: string;
        referenceImages?: Array<{ anchorId: string; imagePath: string | null }>;
      };
    }).phase9b;
    // R4/R5 reference + quality gates apply ONLY to the Phase 9B-quality space
    // route. Legacy vNext space generations (MASTERPIECE_SPACE_COMPILER_MODE
    // unset or `vnext_legacy`) keep their previous reference semantics.
    const isPhase9bSpace = isSpace && Boolean(phase9b?.compilerId);

    let references: Array<{
      id: string;
      role: 'core_reference' | 'identity_reference' | 'structure_reference';
      projectRelativePath: string;
      source?: string;
    }>;
    let referenceTrace: Record<string, unknown> | null = null;
    let spaceQualityGate: Record<string, unknown> | null = null;
    // r2.0 §4.13 / Phase D: actualPrompt / isEditedPrompt are hoisted
    // to the outer scope so the post-Gate-B block (and the corrected
    // prompt path) can re-use them without re-derivation. Default value
    // is the compiled prompt; the Phase 9B space branch may override
    // with `input.editedPrompt` after passing it through Gate A + Gate B.
    let actualPrompt: string = compilation.compiledPrompt.finalPrompt;
    let isEditedPrompt = false;

    if (isPhase9bSpace) {
      // R11.2.2 §17-§18: Continuation binds the ORIGINAL confirmed generated
      // output (provenance, not a user-upload copy). Resolve its on-disk image
      // from the source run so the provider receives the actual generated file.
      let resolved: {
        references: Array<{
          id: string;
          role: 'core_reference' | 'identity_reference' | 'structure_reference';
          projectRelativePath: string;
          source: string;
        }>;
        trace: Record<string, unknown>;
      };
      if (generationBasis === 'continuation') {
        const continuationAssetId = explicitIds[0];
        const confirmed = continuationAssetId
          ? session.confirmedGeneratedOutputs?.[continuationAssetId]
          : null;
        const sourceRun = confirmed
          ? await getImageGeneration().getRun(confirmed.sourceRunId)
          : null;
        const sourceImage = continuationAssetId
          ? sourceRun?.images?.find((img) => img.imageId === continuationAssetId.split('-').pop())
            ?? sourceRun?.images?.[0]
          : null;
        if (!continuationAssetId
          || !confirmed
          || confirmed.confirmationState !== 'confirmed'
          || confirmed.projectId !== input.projectId
          || !sourceRun
          || !sourceImage) {
          throw Object.assign(
            new Error('SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires the original confirmed generated output.'),
            { code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED' },
          );
        }
        resolved = resolveContinuationReference({
          confirmed,
          projectRelativePath: `image-generation/${sourceRun.runId}/${sourceImage.relativePath}`,
          targetScene: compilation.taskContract.continuation?.targetScene,
          viewStrategy: compilation.taskContract.continuation?.targetFunctionalProgram?.viewStrategy,
        }) as typeof resolved;
      } else {
        // Recovery R4: first formal space generation must carry a non-logo core
        // reference. Priority: user explicit > implicit anchor > architecture
        // anchor image. Logo/packaging assets are filtered out by the policy.
        // r2.0 §4.11 / Phase C: resolve via the live project store (project.assets),
        // not the static sourceAssetRefs. This is the A0 + Phase C fix for
        // "post-analysis upload": a fresh upload is reachable as long as the
        // project store has it, even when the vnext visual context is stale.
        // The resolver also enforces MIME-by-signature (PNG / JPEG / WebP),
        // replacing the A0-era silent .pdf filter.
        const explicitAssets = await resolveExplicitReferencesOrThrow(
          explicitIds,
          input.projectId,
          projects,
        );
        const architectureAnchorImages = (phase9b?.referenceImages ?? [])
          .filter((img) => img.imagePath)
          .map((img) => ({ anchorId: img.anchorId, imagePath: img.imagePath as string }));

        // r2.0 §4.10 / B-2: the max reference count is the intersection of
        // Product Policy and the live Adapter Capability. The current Seedream
        // adapter declares maxReferenceImages: 2 with reference strength /
        // role controls unsupported (not verified end to end), so today the
        // effective bound matches the previous 2. Bumping the policy or the
        // adapter capability no longer requires editing vnext-service.
        const adapter = createSeedreamVNextAdapter({ model: compilation.payload.model });
        const effectiveMax = resolveEffectiveMaxReferences({
          generationBasis,
          adapterCapability: adapter.capability,
        }).effectiveMax;

        resolved = resolveSpaceReferences({
          generationBasis,
          explicitAssets,
          implicitAnchor: implicitAnchor
            ? { imageId: implicitAnchor.imageId, projectRelativePath: implicitAnchor.projectRelativePath }
            : null,
          architectureAnchorImages,
          maxReferences: effectiveMax,
        }) as typeof resolved;
      }
      references = resolved.references.map((ref) => ({
        id: ref.id,
        role: ref.role,
        projectRelativePath: ref.projectRelativePath,
        source: ref.source,
      }));
      referenceTrace = resolved.trace;

      // Fail closed when no reference is available (unless the task explicitly
      // carries a reference-first bypass, e.g. a deliberate text-only debug).
      assertSpaceReferenceAvailable(references, { generationBasis });

      // R5: re-run the space quality gate with the resolved reference count so
      // SPACE_REFERENCE_MISSING is reflected in preflight findings too (even
      // though assertSpaceReferenceAvailable already fails closed above).
      const phase9bBlocks = (compilation.compiledPrompt as unknown as {
        blocks?: Array<{ id: string; text?: string }>;
      }).blocks ?? [];
      const blocksById: Record<string, { id: string; text?: string }> = Object.fromEntries(
        phase9bBlocks.map((b) => [b.id, b]),
      );
      const blockIds: string[] = phase9bBlocks.map((b) => b.id);
      const resolvedQualityGate = runSpaceQualityGate({
        finalPrompt: compilation.compiledPrompt.finalPrompt,
        blockIds,
        blocksById,
        referenceCount: references.length,
        hasExplicitReferenceBypass: generationBasis === 'standard',
      } as Parameters<typeof runSpaceQualityGate>[0]);
      if (resolvedQualityGate.status !== 'pass') {
        const blocked = resolvedQualityGate.findings.filter((f) => f.severity === 'block');
        if (blocked.length) {
          throw Object.assign(new Error(
            `SPACE_QUALITY_GATE_BLOCKED: ${blocked.map((f) => f.code).join(', ')}`,
          ), {
            code: blocked[0]?.code || 'SPACE_QUALITY_GATE_BLOCKED',
            findings: resolvedQualityGate.findings,
          });
        }
      }
      spaceQualityGate = resolvedQualityGate;

      // r2.0 §4.13 / Phase D: split the integrity check into two gates.
      //
      //   Gate A (compile-time): read-only on the FROZEN compile artifacts.
      //     Never reads `input.editedPrompt` — a user edit must NOT trigger
      //     SPACE_COMPILER_ROUTE_MISMATCH; that would wrongly block the
      //     validator-correction retry path.
      //   Gate B (provider prompt): validates the ACTUAL prompt string the
      //     Provider will receive. This is where an edited / correction
      //     prompt that strips the Reference Boundary or exceeds the
      //     Provider char cap is caught. Failure is
      //     SPACE_PROVIDER_PROMPT_INVALID (NOT
      //     SPACE_COMPILER_ROUTE_MISMATCH).
      const compiledPrompt = compilation.compiledPrompt.finalPrompt;
      const editedPromptRaw = input.editedPrompt?.trim();
      // r2.0 §4.13 / Phase D: actualPrompt and isEditedPrompt are
      // declared in the outer scope. Reassign here (not redeclare)
      // so the post-block code can use them.
      actualPrompt = editedPromptRaw || compiledPrompt;
      isEditedPrompt = Boolean(editedPromptRaw);
      const compiledBlocks = (compilation.compiledPrompt as unknown as {
        blocks?: Array<{ id: string; title?: string }>;
      }).blocks ?? [];
      const compileSpaceTrace = (compilation.compiledPrompt.trace as unknown as {
        spaceGeneration?: Record<string, unknown>;
      }).spaceGeneration ?? {};
      const spatialSemanticReport = (compileSpaceTrace.spatialSemanticReport ?? {
        status: 'block',
        findings: [{ code: 'SPACE_SPATIAL_SEMANTIC_REPORT_MISSING' }],
      }) as ReturnType<typeof validateSpatialSemantics>;
      // Gate A: compile-time integrity. Read-only on the compile artifacts.
      // The `vnext-service.ts:561-568` minimum fix is preserved as the
      // budget fallback: when the compile trace lacks promptCharacters,
      // fall back to the literal length of the COMPILED prompt (never
      // the edited one).
      const gateA = assertSpaceGenerationRouteGateA({
        taskContract: compilation.taskContract,
        compilerMode: compileSpaceTrace.canonicalCompilerMode ?? 'r8_6_golden',
        trace: {
          spaceGeneration: {
            ...compileSpaceTrace,
            promptCharacters: Number(compileSpaceTrace.promptCharacters)
              || [...compiledPrompt].length,
          },
        },
        blockIds: promptBlockIds(compiledPrompt, compiledBlocks),
        providerReferenceCount: references.length,
        referenceMode: (generationBasis === 'reference_first' || generationBasis === 'continuation') ? 'reference_assisted' : 'text_only',
        referenceSources: references.map((reference) => reference.source),
        spatialSemanticReport,
        requestedAspectRatio: compilation.taskContract.aspectRatio,
        providerAspectRatio: compilation.payload.aspectRatio,
        providerSize: aspectSize(compilation.taskContract.aspectRatio),
      });
      if (!gateA) {
        throw Object.assign(new Error('Space compile integrity gate A was not applied.'), {
          code: 'SPACE_COMPILER_ROUTE_MISMATCH',
        });
      }
      // Gate B: provider prompt validation. Runs on the ACTUAL prompt
      // (could be the compiled prompt OR the user-edited / correction
      // prompt). A failure here does NOT invalidate the compile trace —
      // it just blocks the Provider call.
      const gateBAdapter = createSeedreamVNextAdapter({ model: compilation.payload.model });
      const providerCapability = gateBAdapter.capability;
      const gateB = assertProviderPromptGateB({
        actualPrompt,
        compiledPrompt,
        providerCapability: {
          ...providerCapability,
          prompt: {
            maxCharacters: 12000,
          },
        },
        generationBasis,
        targetScene: compilation.taskContract.subtype,
        targetSceneLabel: compilation.taskContract.subtype,
        isEdited: isEditedPrompt,
      });
      // r2.0 §4.13: trace immutability. The compile-time spaceTrace
      // (compileSpaceTrace) is FROZEN. Run-level metadata goes into a
      // SEPARATE runSpaceTrace object that is written alongside the
      // run, not back into compilations/<taskId>/. This way a
      // correction retry does not pollute the original compile's
      // trace.json.
      const runSpaceTrace = {
        ...compileSpaceTrace,
        generationBasis,
        referenceMode: (generationBasis === 'reference_first' || generationBasis === 'continuation') ? 'reference_assisted' : 'text_only',
        referenceIds: references.map((reference) => reference.id),
        referenceSources: references.map((reference) => reference.source),
        routeIntegrity: gateA.routeIntegrity,
        spatialSemanticReport,
        // Phase D: separate run-time gate trace. Gate A is the compile
        // time check, Gate B is the actual-prompt check.
        providerPromptGate: gateB,
        isEditedPrompt,
      };
      await Promise.all([
        writeJson(path.join(compilation.artifactDirectory, 'reference-trace.json'), {
          schemaVersion: '1.0',
          referenceMode: (generationBasis === 'reference_first' || generationBasis === 'continuation') ? 'reference_assisted' : 'text_only',
          providerReferenceCount: references.length,
          references: references.map((reference) => ({
            id: reference.id,
            source: reference.source,
          })),
        }),
        writeJson(path.join(compilation.artifactDirectory, 'provider-payload.redacted.json'), {
          model: compilation.payload.model,
          prompt: actualPrompt,
          size: aspectSize(compilation.taskContract.aspectRatio),
          aspectRatio: compilation.taskContract.aspectRatio,
          references: references.map((reference) => ({ id: reference.id, source: reference.source })),
          // r2.0 §4.13: record which gate passed and whether the prompt
          // was edited. The redacte d payload is the audit trail; the
          // gate result is sufficient to know it was checked.
          gates: {
            compileIntegrity: { status: gateA.routeIntegrity.status, version: gateA.routeIntegrity.version },
            providerPrompt: { status: 'pass', version: gateB.version, isEdited: isEditedPrompt },
          },
        }),
        // The compile trace.json is FROZEN at compile time. The
        // run-time spaceGeneration goes into a separate file. This
        // matches §9 (回滚): "纠偏是运行时叠加", and keeps the
        // compile artifact directory as the immutable "facts of
        // that compile".
        writeJson(path.join(compilation.artifactDirectory, 'trace.json'), {
          projectId: input.projectId,
          taskId: compilation.taskContract.taskId,
          contextFingerprint: currentContext.provenance.sourceFingerprint,
          route: compilation.compiledPrompt.route,
          trace: compilation.compiledPrompt.trace,
          spaceGeneration: compileSpaceTrace,
          compiledAt: compilation.compiledPrompt.compiledAt,
        }),
        // r2.0 §4.13: run-level trace lives next to run.json, NOT in
        // the compile artifact directory. A correction retry appends
        // a new run-trace file rather than mutating the original.
        writeJson(path.join(compilation.artifactDirectory, 'run-trace.json'), {
          schemaVersion: '1.0',
          runSpaceTrace,
          gateA: {
            status: gateA.routeIntegrity.status,
            version: gateA.routeIntegrity.version,
          },
          gateB: {
            status: 'pass',
            version: gateB.version,
            isEdited: isEditedPrompt,
            characterCount: gateB.characterCount,
            checks: gateB.checks,
          },
        }),
      ]);
    } else {
      // r2.0 §4.11 / Phase C: resolve via the live project store (project.assets),
      // not the static sourceAssetRefs. The PDF filter is removed: the
      // resolver rejects non-image formats with REFERENCE_ASSET_FORMAT_UNSUPPORTED
      // before we ever reach this code path.
      const explicitResolved = await resolveExplicitReferencesOrThrow(
        explicitIds,
        input.projectId,
        projects,
      );
      const explicitReferences = explicitResolved.flatMap((asset) => {
        const id = asset.assetId;
        return [{
          id,
          role: lockedLogoAssetIds.has(id) || asset.role === 'logo'
            ? 'identity_reference' as const
            : asset.role === 'package_structure'
              ? 'structure_reference' as const
              : 'core_reference' as const,
          projectRelativePath: `input/${asset.relativePath}`,
        }];
      });
      references = [
        ...explicitReferences,
        ...(implicitAnchor ? [{
          id: implicitAnchor.imageId,
          role: 'core_reference' as const,
          projectRelativePath: implicitAnchor.projectRelativePath,
        }] : []),
      ].slice(0, 2);
    }
    // r2.0 §4.13 / Phase D: actualPrompt was already chosen above and
    // passed through Gate A + Gate B. No re-derivation here — that would
    // bypass Gate B for the edited-prompt / correction-retry case.
    const run = await getImageGeneration().startCompiledCreativeTask({
      projectId: input.projectId,
      compiledPrompt: actualPrompt,
      promptVersion: compilation.compiledPrompt.trace.sourceFingerprint,
      snapshot: {
        schemaVersion: 'vnext-1.0',
        projectContextVersion: compilation.compiledPrompt.projectContextVersion,
        taskContract: compilation.taskContract,
        route: compilation.compiledPrompt.route,
        trace: compilation.compiledPrompt.trace,
        implicitAnchor,
        ...(referenceTrace ? { referenceTrace } : {}),
        ...(spaceQualityGate ? { spaceQualityGate } : {}),
      },
      sourceMap: {
        pipelineMode: 'vnext',
        taskId: compilation.taskContract.taskId,
        contextFingerprint: currentContext.provenance.sourceFingerprint,
        templateVersions: compilation.compiledPrompt.route.templateVersions,
        implicitAnchorRunId: implicitAnchor?.runId,
      },
      references,
      event: 'VNEXT_FORMAL_RESULT_STARTED',
      apiProfileId: input.apiProfileId,
      // A selected API Profile owns the provider's deployable endpoint model.
      // The adapter id is a compilation contract and may not be callable.
      modelId: input.apiProfileId ? undefined : compilation.payload.model,
      size: aspectSize(compilation.taskContract.aspectRatio),
      dryRun: input.dryRun,
    });
    if (isPhase9bSpace) {
      await writeJson(path.join(compilation.artifactDirectory, 'run.json'), run);
      const generatedRoot = await getImageGeneration().runRoot(run.runId);
      const firstImage = run.images[0];
      if (run.status === 'succeeded' && generatedRoot && firstImage) {
        await fs.copyFile(
          path.join(generatedRoot, firstImage.relativePath),
          path.join(compilation.artifactDirectory, 'output.png'),
        );
      }
    }
    await saveSession({
      ...session,
      currentTask: compilation.taskContract,
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: 'generated',
        taskId: compilation.taskContract.taskId,
        deliverableFamily: compilation.taskContract.deliverableFamily,
        subtype: compilation.taskContract.subtype,
        shot: compilation.taskContract.shot,
        promptFingerprint: compilation.compiledPrompt.trace.sourceFingerprint,
        runId: run.runId,
        imageId: run.images[0]?.imageId,
        createdAt: run.createdAt,
        // R11.2.2 §33-§36: record the generation mode and the continuation
        // lineage so the UI can show "参考优先 / 空间延展" badges and
        // "Reception → Consultation" on outputs.
        generationBasis: compilation.taskContract.generationBasis,
        ...(compilation.taskContract.generationBasis === 'continuation'
          && compilation.taskContract.continuation
          ? {
              continuationLineage: {
                sourceScene: compilation.taskContract.continuation.sourceScene,
                targetScene: compilation.taskContract.continuation.targetScene,
                sourceRunId: compilation.taskContract.continuation.sourceRunId,
              },
            }
          : {}),
      }],
      updatedAt: new Date().toISOString(),
    });
    return run;
  }

  async function confirmDirection(
    projectId: string,
    runId: string,
    imageId: string,
  ): Promise<VNextCreativeSession> {
    const run = await getImageGeneration().getRun(runId);
    if (!run || run.projectId !== projectId || run.status !== 'succeeded') {
      throw Object.assign(new Error('Only a succeeded result can become an implicit anchor'), {
        code: 'VNEXT_ANCHOR_RESULT_INVALID',
      });
    }
    const image = run.images.find((candidate) => candidate.imageId === imageId);
    if (!image) throw new Error('Generated image does not exist');
    const session = await readSession(projectId);
    const generated = [...session.history].reverse().find((entry) =>
      entry.type === 'generated' && entry.runId === runId);
    if (!generated) throw new Error('vNext generation history entry does not exist');
    const now = new Date().toISOString();
    return saveSession({
      ...session,
      implicitAnchors: {
        ...session.implicitAnchors,
        [generated.deliverableFamily]: {
          deliverableFamily: generated.deliverableFamily,
          runId,
          imageId,
          projectRelativePath: `image-generation/${runId}/${image.relativePath}`,
          promptFingerprint: generated.promptFingerprint,
          confirmedAt: now,
        },
      },
      history: [...session.history, {
        ...generated,
        id: crypto.randomUUID(),
        type: 'direction_confirmed',
        imageId,
        createdAt: now,
      }],
      updatedAt: now,
    });
  }

  // ---- R11.1 Confirmed Generated Output (Continuation source) ------------
  // Append-only metadata on the session. Never modifies the image / run /
  // evaluation. confirmationSource is always user_explicit. A generated space
  // output moves unconfirmed -> confirmed -> revoked; only 'confirmed' is a
  // valid continuation source. Confirmation is idempotent.
  async function confirmGeneratedOutput(
    projectId: string,
    runId: string,
    imageId: string,
  ): Promise<VNextConfirmedGeneratedOutput> {
    const run = await getImageGeneration().getRun(runId);
    if (!run || run.projectId !== projectId || run.status !== 'succeeded') {
      throw Object.assign(new Error('Only a succeeded result can be confirmed for continuation'), {
        code: 'SPACE_CONTINUATION_SOURCE_INVALID',
      });
    }
    const session = await readSession(projectId);
    // R11.2.1 Bug A: the vNext run record has no `deliverable` field (legacy
    // sources.deliverable is only set on the non-vNext path), so we resolve the
    // deliverable family from the session history entry the run wrote, which is
    // authoritative for vNext runs.
    const generatedEntry = [...session.history].reverse().find((entry) =>
      entry.type === 'generated' && entry.runId === runId);
    const isSpaceRun = generatedEntry?.deliverableFamily === 'space';
    if (!isSpaceRun) {
      throw Object.assign(new Error('Continuation source must be a space generated output'), {
        code: 'SPACE_CONTINUATION_SOURCE_INVALID',
      });
    }
    const image = run.images.find((candidate) => candidate.imageId === imageId);
    if (!image) throw new Error('Generated image does not exist');
    const now = new Date().toISOString();
    const assetId = `asset-${runId}-${imageId}`;
    const existing = session.confirmedGeneratedOutputs?.[assetId];
    // Idempotent: re-confirming an already-confirmed asset is a no-op update.
    const entry: VNextConfirmedGeneratedOutput = {
      assetId,
      projectId,
      // R11.2.1 asset identity: generated space output, continuation source.
      assetOrigin: 'generated_output',
      deliverableFamily: 'space',
      generationRole: 'continuation_source',
      sourceRunId: runId,
      sourceTaskId: run.taskId,
      sourceScene: generatedEntry?.subtype || 'space',
      confirmationState: 'confirmed',
      confirmedAt: existing?.confirmedAt ?? now,
      confirmationSource: 'user_explicit',
      imageSha256: image.sha256,
      compilerId: 'phase9b-quality-compiler',
      baselineId: 'r10.4.1-post-repair',
    };
    await saveSession({
      ...session,
      confirmedGeneratedOutputs: {
        ...(session.confirmedGeneratedOutputs ?? {}),
        [assetId]: entry,
      },
      history: [...session.history, {
        id: crypto.randomUUID(),
        type: 'direction_confirmed',
        taskId: run.taskId,
        deliverableFamily: 'space',
        subtype: run.deliverable ?? 'space',
        shot: 'entrance_view',
        promptFingerprint: assetId,
        runId,
        imageId,
        createdAt: now,
      }],
      updatedAt: now,
    });
    return entry;
  }

  // Revoke a previously confirmed continuation source. Historical completed
  // continuation runs are untouched. The entry stays in the session with
  // state=revoked so lineage is not lost.
  async function revokeGeneratedOutput(
    projectId: string,
    assetId: string,
  ): Promise<VNextConfirmedGeneratedOutput> {
    const session = await readSession(projectId);
    const existing = session.confirmedGeneratedOutputs?.[assetId];
    if (!existing || existing.projectId !== projectId) {
      throw Object.assign(new Error('Confirmed continuation source does not exist'), {
        code: 'SPACE_CONTINUATION_SOURCE_INVALID',
      });
    }
    const revoked = { ...existing, confirmationState: 'revoked' as const };
    await saveSession({
      ...session,
      confirmedGeneratedOutputs: {
        ...(session.confirmedGeneratedOutputs ?? {}),
        [assetId]: revoked,
      },
      updatedAt: new Date().toISOString(),
    });
    return revoked;
  }

  async function getConfirmedGeneratedOutputs(projectId: string): Promise<Record<string, VNextConfirmedGeneratedOutput>> {
    const session = await readSession(projectId);
    return session.confirmedGeneratedOutputs ?? {};
  }

  async function startValidated(
    input: StartValidatedVNextGenerationInput,
  ): Promise<VNextValidatedGenerationResult> {
    const validator = getValidator?.();
    if (!validator) throw new Error('vNext deliverable validator is not configured');
    const compilation = await readCompilation(input.projectId, input.taskId);
    // r2.0 §4.13 / Phase E: the first-image reference is captured the
    // moment the initial Provider call succeeds. Subsequent correction
    // or validation failures cannot erase it — the UI keeps it
    // visible alongside whatever the flow state currently is.
    const initial = await start(input);
    if (initial.status !== 'succeeded' || !initial.images[0]) {
      throw Object.assign(new Error(initial.errorMessage || 'Initial image generation failed'), {
        code: initial.errorCode || 'VNEXT_INITIAL_GENERATION_FAILED',
      });
    }
    const first = initial.images[0];
    const firstImage: VNextValidatedGenerationImageRef = {
      runId: initial.runId,
      imageId: first.imageId,
      relativePath: first.relativePath,
      mimeType: first.mimeType,
      sha256: first.sha256,
      sizeBytes: first.sizeBytes,
    };
    const initialValidation = await validator.validate({
      projectId: input.projectId,
      taskContract: compilation.taskContract,
      runId: initial.runId,
      validatorProfileId: input.validatorProfileId,
    });
    if (initialValidation.status !== 'failed' || !initialValidation.retryRecommended) {
      const result: VNextValidatedGenerationResult = {
        initialRun: initial,
        initialValidation,
        terminalStatus: initialValidation.status,
        automaticRetryCount: 0,
        flowState: deriveGenerationFlowState({
          initialRun: initial,
          initialValidation,
        }),
        firstImage,
      };
      await writeJson(
        path.join(await vnextRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
        result,
      );
      return result;
    }
    const correctionPrompt = compileVNextCorrectionPrompt({
      originalPrompt: input.editedPrompt?.trim() || compilation.compiledPrompt.finalPrompt,
      taskContract: compilation.taskContract,
      validation: initialValidation,
    });
    const correctionRun = await start({
      ...input,
      editedPrompt: correctionPrompt,
    });
    if (correctionRun.status !== 'succeeded' || !correctionRun.images[0]) {
      const partial: VNextValidatedGenerationResult = {
        initialRun: initial,
        initialValidation,
        correctionRun,
        terminalStatus: 'failed',
        automaticRetryCount: 1,
        flowState: deriveGenerationFlowState({
          initialRun: initial,
          initialValidation,
          correctionRun,
        }),
        firstImage,
      };
      await writeJson(
        path.join(await vnextRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
        partial,
      );
      return partial;
    }
    const correctionValidation = await validator.validate({
      projectId: input.projectId,
      taskContract: compilation.taskContract,
      runId: correctionRun.runId,
      validatorProfileId: input.validatorProfileId,
    });
    const result: VNextValidatedGenerationResult = {
      initialRun: initial,
      initialValidation,
      correctionRun,
      correctionValidation,
      terminalStatus: correctionValidation.status,
      automaticRetryCount: 1,
      flowState: deriveGenerationFlowState({
        initialRun: initial,
        initialValidation,
        correctionRun,
        correctionValidation,
      }),
      firstImage,
    };
    await writeJson(
      path.join(await vnextRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
      result,
    );
    return result;
  }

  async function continueSameType(
    projectId: string,
    currentInstruction: string,
    apiProfileId?: string,
    dryRun?: boolean,
  ): Promise<ImageGenerationRun> {
    const session = await readSession(projectId);
    if (!session.currentTask) throw new Error('No current vNext task to continue');
    const {
      schemaVersion: _schemaVersion,
      taskId: _taskId,
      projectId: _taskProjectId,
      createdAt: _createdAt,
      ...task
    } = session.currentTask;
    const compiled = await compile({
      projectId,
      task: {
        ...task,
        currentInstruction,
        count: 1,
      },
    });
    return start({ projectId, taskId: compiled.taskContract.taskId, apiProfileId, dryRun });
  }

  async function saveProjectPromptAsset(
    input: SaveVNextProjectPromptAssetInput,
  ): Promise<VNextProjectPromptAsset> {
    const session = await readSession(input.projectId);
    const previous = await fs.readFile(
      path.join(await vnextRoot(input.projectId), 'prompt-assets', `${input.deliverableFamily}.json`),
      'utf8',
    ).then((value) => JSON.parse(value) as VNextProjectPromptAsset).catch(() => null);
    const now = new Date().toISOString();
    const asset: VNextProjectPromptAsset = {
      schemaVersion: '1.0',
      id: previous?.id ?? `project-prompt-${crypto.randomUUID()}`,
      projectId: input.projectId,
      deliverableFamily: input.deliverableFamily,
      name: input.name.trim() || `${input.deliverableFamily} project prompt`,
      version: (previous?.version ?? 0) + 1,
      promptFragments: [...new Set(input.promptFragments.map((item) => item.trim()).filter(Boolean))],
      negativeConstraints: [...new Set((input.negativeConstraints ?? []).map((item) => item.trim()).filter(Boolean))],
      source: 'user_saved',
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    if (!asset.promptFragments.length) throw new Error('Project prompt asset cannot be empty');
    await writeJson(
      path.join(await vnextRoot(input.projectId), 'prompt-assets', `${input.deliverableFamily}.json`),
      asset,
    );
    const task = session.currentTask;
    return saveSession({
      ...session,
      projectPromptAssets: {
        ...session.projectPromptAssets,
        [input.deliverableFamily]: asset.id,
      },
      history: task ? [...session.history, {
        id: crypto.randomUUID(),
        type: 'prompt_asset_saved',
        taskId: task.taskId,
        deliverableFamily: input.deliverableFamily,
        subtype: task.subtype,
        shot: task.shot,
        promptFingerprint: asset.id,
        createdAt: now,
      }] : session.history,
      updatedAt: now,
    }).then(() => asset);
  }

  async function postCompositeLogo(input: PostCompositeVNextLogoInput) {
    if (input.confirmedByUser !== true) {
      throw Object.assign(new Error('Logo post-composite requires explicit user confirmation'), {
        code: 'LOGO_POST_COMPOSITE_CONFIRMATION_REQUIRED',
      });
    }
    const [run, project, paths] = await Promise.all([
      getImageGeneration().getRun(input.runId),
      projects.get(input.projectId),
      projects.paths(input.projectId),
    ]);
    if (!run || run.projectId !== input.projectId || run.status !== 'succeeded') {
      throw Object.assign(new Error('Logo post-composite requires a succeeded project run'), {
        code: 'LOGO_POST_COMPOSITE_RUN_INVALID',
      });
    }
    const image = run.images.find((item) => item.imageId === input.imageId);
    if (!image) {
      throw Object.assign(new Error('Generated image does not exist in the selected run'), {
        code: 'LOGO_POST_COMPOSITE_IMAGE_MISSING',
      });
    }
    const logoAsset = project.assets.find((item) => item.id === input.logoAssetId);
    if (!logoAsset || logoAsset.status !== 'ready') {
      throw Object.assign(new Error('Confirmed Logo asset does not exist in the project'), {
        code: 'LOGO_POST_COMPOSITE_ASSET_MISSING',
      });
    }
    const runRoot = await getImageGeneration().runRoot(input.runId);
    if (!runRoot) throw new Error('Image generation run root is unavailable');
    const snapshot = await fs.readFile(
      path.join(runRoot, 'source-context-snapshot.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as {
      taskContract?: { logoUsageMode?: string };
    }).catch(() => null);
    if (snapshot?.taskContract?.logoUsageMode !== 'post_composite') {
      throw Object.assign(new Error('Selected run was not generated with a blank post-composite identity area'), {
        code: 'LOGO_POST_COMPOSITE_MODE_REQUIRED',
      });
    }
    const scenePath = path.resolve(runRoot, image.relativePath);
    const logoPath = path.resolve(paths.input, logoAsset.relativePath);
    const outputPath = path.join(runRoot, 'images', `${path.parse(image.relativePath).name}.post-composite.png`);
    const composite = await postCompositeConfirmedLogo({
      scenePath,
      logoPath,
      outputPath,
      sourceCrop: input.sourceCrop,
      placement: input.placement,
      removeBackground: input.removeBackground,
    });
    const audit = {
      schemaVersion: '1.0',
      status: 'completed',
      projectId: input.projectId,
      runId: input.runId,
      sourceImageId: input.imageId,
      sourceImagePath: scenePath,
      logoAssetId: logoAsset.id,
      logoAssetOriginalName: logoAsset.originalName,
      logoAssetProjectRelativePath: `input/${logoAsset.relativePath}`,
      confirmationSource: 'user_confirmed',
      ...composite,
      completedAt: new Date().toISOString(),
    };
    await writeJson(path.join(runRoot, 'logo-post-composite.json'), audit);
    return audit;
  }

  // r2.0 §4.11 / Phase C-3: preflight resolver. The renderer calls this with
  // a set of asset IDs the user is considering as references; the result is
  // a per-ID status (resolved / failed with code) that drives the UI badge
  // and the "use as reference" enable rule. Does NOT fail closed: the
  // caller (UI) gets the full { resolved, failures } map and decides.
  // The resolver is the same one vnext-service.start() calls, so a preflight
  // pass guarantees start() will not throw REFERENCE_ASSET_* at submit time.
  async function preflightReferenceAssets(input: {
    projectId: string;
    assetIds: string[];
  }): Promise<{
    projectId: string;
    results: Array<
      | { status: 'resolved'; assetId: string; record: ResolvedReferenceAsset }
      | { status: 'failed'; assetId: string; failure: ReferenceResolutionFailure }
    >;
  }> {
    const { projectId, assetIds } = input;
    const uniqueIds = Array.from(new Set(assetIds));
    if (uniqueIds.length === 0) {
      return { projectId, results: [] };
    }
    const [projectPaths, project] = await Promise.all([
      projects.paths(projectId),
      projects.get(projectId),
    ]);
    const { resolved, failures } = await resolveReferenceAssets(
      uniqueIds,
      // Same options as resolveExplicitReferencesOrThrow: SHA verification
      // off (the project store records SHA at import time; the resolver
      // exposes REFERENCE_ASSET_SHA_MISMATCH only when verifySha256 is true).
      { projectRoot: projectPaths.root, verifySha256: false },
      project.assets,
    );
    const byId = new Map<string,
      | { status: 'resolved'; assetId: string; record: ResolvedReferenceAsset }
      | { status: 'failed'; assetId: string; failure: ReferenceResolutionFailure }
    >();
    for (const r of resolved) byId.set(r.assetId, { status: 'resolved', assetId: r.assetId, record: r });
    for (const f of failures) byId.set(f.assetId, { status: 'failed', assetId: f.assetId, failure: f });
    return {
      projectId,
      results: uniqueIds.map((id) =>
        byId.get(id) ?? {
          status: 'failed',
          assetId: id,
          failure: {
            assetId: id,
            code: 'REFERENCE_ASSET_NOT_FOUND',
            message: `asset ${id} did not return a result from the resolver`,
          },
        },
      ),
    };
  }

  return {
    compile,
    start,
    startValidated,
    getSession: readSession,
    confirmDirection,
    continueSameType,
    confirmGeneratedOutput,
    revokeGeneratedOutput,
    getConfirmedGeneratedOutputs,
    postCompositeLogo,
    saveProjectPromptAsset,
    listOptions: listVNextTemplateOptions,
    // r2.0 §4.11 / Phase C-3: UI preflight. The renderer calls this after
    // loadProjectAssets and on importFiles, so the user can see per-asset
    // resolution status (resolved / failed with code) BEFORE clicking
    // "use as reference". The same resolver vnext-service.start() uses, so
    // preflight pass = generation will not fail on REFERENCE_ASSET_* codes.
    preflightReferenceAssets,
  };
}

export type VNextImageGenerationService = ReturnType<typeof createVNextImageGenerationService>;
