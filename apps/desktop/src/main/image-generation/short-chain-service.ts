import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {
  ImageGenerationRun,
  ShortChainCompiledPrompt,
  ShortChainCreativeSession,
  ShortChainDeliverableFamily,
  ShortChainModelPromptPayload,
  ShortChainTaskContract,
  ShortChainProjectPromptAsset,
  ShortChainValidatedGenerationResult,
} from '@masterpiece/image-generation-contracts/index.ts';
import {
  compileShortChainCorrectionPrompt,
  compileShortChainImageGeneration,
  listShortChainTemplateOptions,
  validateShortChainEffectivePrompt,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';
import type { ProjectContextService } from '../project-context-service.ts';
import type { ProjectStore } from '../project-store.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';
import type { ShortChainDeliverableValidatorService } from './short-chain-deliverable-validator-service.ts';
import { LEGACY_SHORT_CHAIN_GENERATION_DIRECTORY } from '../legacy-stage-name-migration.ts';
import {
  postCompositeConfirmedLogo,
  postCompositeLockedAssets as compositeLockedAssets,
  type NormalizedPlacement,
  type PixelRect,
} from './logo-post-composite.ts';

export interface CompileShortChainGenerationInput {
  projectId: string;
  model?: string;
  task: Omit<ShortChainTaskContract, 'schemaVersion' | 'taskId' | 'projectId' | 'createdAt'> & {
    taskId?: string;
  };
}

export interface CompileShortChainGenerationResult {
  taskContract: ShortChainTaskContract;
  compiledPrompt: ShortChainCompiledPrompt;
  payload: ShortChainModelPromptPayload;
  artifactDirectory: string;
}

export interface StartShortChainGenerationInput {
  projectId: string;
  taskId: string;
  apiProfileId?: string;
  editedPrompt?: string;
  dryRun?: boolean;
}

export interface StartValidatedShortChainGenerationInput extends StartShortChainGenerationInput {
  validatorProfileId?: string;
}

export interface PostCompositeShortChainLogoInput {
  projectId: string;
  runId: string;
  imageId: string;
  logoAssetId: string;
  confirmedByUser: true;
  sourceCrop?: PixelRect;
  placement: NormalizedPlacement;
  removeBackground?: {
    enabled: boolean;
    tolerance?: number;
  };
}

export type LockedAssetUsage = 'logo' | 'icon_system' | 'brand_text' | 'other';

export interface PostCompositeShortChainLockedAssetsInput {
  projectId: string;
  runId: string;
  imageId: string;
  confirmedByUser: true;
  layers: Array<{
    layerId: string;
    assetId: string;
    usage: LockedAssetUsage;
    sourceCrop: PixelRect;
    placement: NormalizedPlacement;
    removeBackground?: { enabled: boolean; tolerance?: number };
  }>;
}

export interface SaveShortChainProjectPromptAssetInput {
  projectId: string;
  deliverableFamily: ShortChainDeliverableFamily;
  name: string;
  promptFragments: string[];
  negativeConstraints?: string[];
}

const SESSION_FILENAME = 'creative-session.json';

function aspectSize(aspectRatio: ShortChainTaskContract['aspectRatio']): string {
  return {
    '1:1': '2048*2048',
    '4:3': '2048*1536',
    '3:4': '1536*2048',
    '16:9': '2560*1440',
    '9:16': '1440*2560',
  }[aspectRatio];
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage ?? `Failed to write ${path.basename(filename)}`), {
      code: 'SHORT_CHAIN_COMPILE_ARTIFACT_WRITE_FAILED',
    });
  }
}

export function createShortChainImageGenerationService(
  projects: ProjectStore,
  projectContext: ProjectContextService,
  getImageGeneration: () => ImageGenerationService,
  getValidator?: () => ShortChainDeliverableValidatorService,
) {
  async function shortChainRoot(projectId: string): Promise<string> {
    return path.join((await projects.paths(projectId)).root, 'image-generation-short-chain');
  }

  async function legacyShortChainRoot(projectId: string): Promise<string> {
    return path.join((await projects.paths(projectId)).root, LEGACY_SHORT_CHAIN_GENERATION_DIRECTORY);
  }

  async function readShortChainArtifact(projectId: string, ...segments: string[]): Promise<string> {
    const current = path.join(await shortChainRoot(projectId), ...segments);
    return fs.readFile(current, 'utf8').catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return fs.readFile(path.join(await legacyShortChainRoot(projectId), ...segments), 'utf8');
    });
  }

  async function readSession(projectId: string): Promise<ShortChainCreativeSession> {
    const stored = await readShortChainArtifact(projectId, SESSION_FILENAME)
      .then((value) => JSON.parse(value) as ShortChainCreativeSession)
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

  async function saveSession(session: ShortChainCreativeSession): Promise<ShortChainCreativeSession> {
    await writeJson(path.join(await shortChainRoot(session.projectId), SESSION_FILENAME), session);
    return session;
  }

  async function readCompilation(
    projectId: string,
    taskId: string,
  ): Promise<CompileShortChainGenerationResult> {
    const relativeDirectory = path.join('compilations', path.basename(taskId));
    const [taskContract, compiledPrompt, payload] = await Promise.all([
      readShortChainArtifact(projectId, relativeDirectory, 'task-contract.json').then(JSON.parse),
      readShortChainArtifact(projectId, relativeDirectory, 'compiled-prompt.json').then(JSON.parse),
      readShortChainArtifact(projectId, relativeDirectory, 'model-payload.json').then(JSON.parse),
    ]) as [ShortChainTaskContract, ShortChainCompiledPrompt, ShortChainModelPromptPayload];
    if (taskContract.projectId !== projectId || taskContract.taskId !== taskId) {
      throw Object.assign(new Error('Short-Chain compilation does not belong to this project/task'), {
        code: 'SHORT_CHAIN_COMPILE_ARTIFACT_INVALID',
      });
    }
    return {
      taskContract,
      compiledPrompt,
      payload,
      artifactDirectory: path.join(await shortChainRoot(projectId), relativeDirectory),
    };
  }

  async function compile(input: CompileShortChainGenerationInput): Promise<CompileShortChainGenerationResult> {
    const context = await projectContext.getShortChain(input.projectId)
      .catch(() => projectContext.rebuildShortChain(input.projectId));
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
        { code: 'SHORT_CHAIN_LOGO_REFERENCE_MISSING' },
      );
    }
    const logoAssetIdSet = new Set(logoAssetIds);
    const requestedReferenceIds = input.task.referenceAssetIds ?? [];
    const referenceAssetIds = logoUsageMode === 'reference'
      ? [...new Set([preferredLogoAssetId!, ...requestedReferenceIds])]
      : requestedReferenceIds.filter((assetId) => !logoAssetIdSet.has(assetId));
    if (referenceAssetIds.length > 2) {
      throw Object.assign(new Error('Short-Chain accepts at most two explicit identity or structure references.'), {
        code: 'SHORT_CHAIN_REFERENCE_LIMIT_EXCEEDED',
      });
    }
    const invalidReferenceIds = referenceAssetIds.filter((assetId) => {
      const asset = context.sourceAssetRefs.find((item) => item.assetId === assetId);
      return !asset || asset.relativePath.toLowerCase().endsWith('.pdf');
    });
    if (invalidReferenceIds.length) {
      throw Object.assign(new Error(`Invalid project reference assets: ${invalidReferenceIds.join(', ')}`), {
        code: 'SHORT_CHAIN_REFERENCE_ASSET_INVALID',
        assetIds: invalidReferenceIds,
      });
    }
    const paths = await projects.paths(input.projectId);
    const approvedCreativeDecision = await fs.readFile(
      path.join(paths.root, 'outputs', 'creative_decision.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as Record<string, unknown>).catch(() => undefined);
    const userConfirmedVisualDecision = await fs.readFile(
      path.join(paths.root, 'project-context', 'user-confirmed-visual-decision.json'),
      'utf8',
    ).then((value) => JSON.parse(value) as Record<string, unknown>).catch(() => undefined);
    const projectPromptAsset = await readShortChainArtifact(
      input.projectId,
      'prompt-assets',
      `${input.task.deliverableFamily}.json`,
    ).then((value) => JSON.parse(value) as ShortChainProjectPromptAsset).catch(() => undefined);
    const result = compileShortChainImageGeneration({
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
    }) as Omit<CompileShortChainGenerationResult, 'artifactDirectory'> & {
      route: unknown;
    };
    const artifactDirectory = path.join(
      paths.root,
      'image-generation-short-chain',
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
      event: 'SHORT_CHAIN_IMAGE_PROMPT_COMPILED',
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

  async function start(input: StartShortChainGenerationInput): Promise<ImageGenerationRun> {
    let compilation = await readCompilation(input.projectId, input.taskId);
    let preflight = (compilation.compiledPrompt as ShortChainCompiledPrompt & {
      preflightReport?: { status?: string; findings?: Array<{ code?: string }> };
    }).preflightReport;
    if (preflight?.status !== 'pass') {
      // The cached `preflightReport` was produced at compile time. When
      // the Short-Chain preflight rules are tightened or relaxed (or when a
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
            mustInclude: [...task.mustInclude],
            mustAvoid: [...task.mustAvoid],
            referenceAssetIds: [...task.referenceAssetIds],
            logoUsageMode: task.logoUsageMode,
          },
          ...(apiProfileId ? { apiProfileId } : {}),
        });
        preflight = (compilation.compiledPrompt as ShortChainCompiledPrompt & {
          preflightReport?: { status?: string; findings?: Array<{ code?: string }> };
        }).preflightReport;
      } catch (recompileError) {
        // Re-compile failed for some other reason; fall through to the
        // original blocked report so the user still sees the underlying
        // finding codes.
        preflight = (compilation.compiledPrompt as ShortChainCompiledPrompt & {
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
      throw Object.assign(new Error('Short-Chain formal-first generation starts with exactly one image'), {
        code: 'SHORT_CHAIN_FORMAL_FIRST_COUNT_INVALID',
      });
    }
    const currentContext = await projectContext.getShortChain(input.projectId);
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
        code: 'SHORT_CHAIN_COMPILE_INPUT_STALE',
      });
    }
    const session = await readSession(input.projectId);
    const implicitAnchor = session.implicitAnchors[compilation.taskContract.deliverableFamily];
    const explicitIds = compilation.taskContract.referenceAssetIds;
    const explicitReferences = explicitIds.flatMap((assetId) => {
      const asset = currentContext.sourceAssetRefs.find((item) => item.assetId === assetId);
      if (!asset || asset.relativePath.toLowerCase().endsWith('.pdf')) return [];
      return [{
        id: asset.assetId,
        role: lockedLogoAssetIds.has(asset.assetId) || asset.role === 'logo'
          ? 'identity_reference' as const
          : asset.role === 'package_structure'
            ? 'structure_reference' as const
            : 'core_reference' as const,
        projectRelativePath: `input/${asset.relativePath}`,
      }];
    });
    const references = [
      ...explicitReferences,
      ...(implicitAnchor ? [{
        id: implicitAnchor.imageId,
        role: 'core_reference' as const,
        projectRelativePath: implicitAnchor.projectRelativePath,
      }] : []),
    ].slice(0, 2);
    const prompt = input.editedPrompt?.trim() || compilation.compiledPrompt.finalPrompt;
    const effectivePrompt = validateShortChainEffectivePrompt({
      compiledPrompt: compilation.compiledPrompt,
      effectivePrompt: prompt,
    });
    if (effectivePrompt.report.status !== 'pass') {
      throw Object.assign(new Error(
        `EFFECTIVE_PROMPT_PREFLIGHT_BLOCKED: ${effectivePrompt.report.findings
          .map((item: { code?: string }) => item.code)
          .filter(Boolean)
          .join(', ')}`,
      ), {
        code: effectivePrompt.report.findings[0]?.code || 'EFFECTIVE_PROMPT_PREFLIGHT_BLOCKED',
        findings: effectivePrompt.report.findings,
      });
    }
    await writeJson(path.join(compilation.artifactDirectory, 'effective-prompt.json'), {
      schemaVersion: '1.0',
      projectId: input.projectId,
      taskId: compilation.taskContract.taskId,
      promptFingerprint: effectivePrompt.promptFingerprint,
      promptCharacters: effectivePrompt.promptCharacters,
      preflightReport: effectivePrompt.report,
      prompt: effectivePrompt.prompt,
      validatedAt: new Date().toISOString(),
    });
    const run = await getImageGeneration().startCompiledCreativeTask({
      projectId: input.projectId,
      compiledPrompt: effectivePrompt.prompt,
      promptVersion: effectivePrompt.promptFingerprint,
      snapshot: {
        schemaVersion: 'short-chain-1.0',
        projectContextVersion: compilation.compiledPrompt.projectContextVersion,
        taskContract: compilation.taskContract,
        route: compilation.compiledPrompt.route,
        trace: compilation.compiledPrompt.trace,
        implicitAnchor,
      },
      sourceMap: {
        pipelineMode: 'short-chain',
        taskId: compilation.taskContract.taskId,
        contextFingerprint: currentContext.provenance.sourceFingerprint,
        effectivePromptFingerprint: effectivePrompt.promptFingerprint,
        templateVersions: compilation.compiledPrompt.route.templateVersions,
        implicitAnchorRunId: implicitAnchor?.runId,
      },
      references,
      event: 'SHORT_CHAIN_FORMAL_RESULT_STARTED',
      apiProfileId: input.apiProfileId,
      // A selected API Profile owns the provider's deployable endpoint model.
      // The adapter id is a compilation contract and may not be callable.
      modelId: input.apiProfileId ? undefined : compilation.payload.model,
      size: aspectSize(compilation.taskContract.aspectRatio),
      dryRun: input.dryRun,
    });
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
        promptFingerprint: effectivePrompt.promptFingerprint,
        runId: run.runId,
        imageId: run.images[0]?.imageId,
        createdAt: run.createdAt,
      }],
      updatedAt: new Date().toISOString(),
    });
    return run;
  }

  async function confirmDirection(
    projectId: string,
    runId: string,
    imageId: string,
  ): Promise<ShortChainCreativeSession> {
    const run = await getImageGeneration().getRun(runId);
    if (!run || run.projectId !== projectId || run.status !== 'succeeded') {
      throw Object.assign(new Error('Only a succeeded result can become an implicit anchor'), {
        code: 'SHORT_CHAIN_ANCHOR_RESULT_INVALID',
      });
    }
    const eligibility = await readShortChainArtifact(
      projectId,
      'validations',
      `${runId}.direction-eligibility.json`,
    ).then((value) => JSON.parse(value) as { status?: string }).catch(() => null);
    if (eligibility?.status !== 'passed') {
      throw Object.assign(new Error('Only a multimodal-validated result can become an implicit anchor'), {
        code: 'SHORT_CHAIN_DIRECTION_VALIDATION_REQUIRED',
      });
    }
    const image = run.images.find((candidate) => candidate.imageId === imageId);
    if (!image) throw new Error('Generated image does not exist');
    const session = await readSession(projectId);
    const generated = [...session.history].reverse().find((entry) =>
      entry.type === 'generated' && entry.runId === runId);
    if (!generated) throw new Error('Short-Chain generation history entry does not exist');
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

  async function startValidated(
    input: StartValidatedShortChainGenerationInput,
  ): Promise<ShortChainValidatedGenerationResult> {
    const validator = getValidator?.();
    if (!validator) throw new Error('Short-Chain deliverable validator is not configured');
    const compilation = await readCompilation(input.projectId, input.taskId);
    const initialRun = await start(input);
    if (initialRun.status !== 'succeeded' || !initialRun.images[0]) {
      throw Object.assign(new Error(initialRun.errorMessage || 'Initial image generation failed'), {
        code: initialRun.errorCode || 'SHORT_CHAIN_INITIAL_GENERATION_FAILED',
      });
    }
    const initialValidation = await validator.validate({
      projectId: input.projectId,
      taskContract: compilation.taskContract,
      runId: initialRun.runId,
      validatorProfileId: input.validatorProfileId,
    });
    if (initialValidation.status !== 'failed' || !initialValidation.retryRecommended) {
      const result: ShortChainValidatedGenerationResult = {
        initialRun,
        initialValidation,
        terminalStatus: initialValidation.status,
        automaticRetryCount: 0,
      };
      await writeJson(
        path.join(await shortChainRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
        result,
      );
      await writeJson(
        path.join(await shortChainRoot(input.projectId), 'validations', `${initialRun.runId}.direction-eligibility.json`),
        { schemaVersion: '1.0', status: initialValidation.status, taskId: input.taskId },
      );
      return result;
    }
    const correctionPrompt = compileShortChainCorrectionPrompt({
      originalPrompt: input.editedPrompt?.trim() || compilation.compiledPrompt.finalPrompt,
      taskContract: compilation.taskContract,
      validation: initialValidation,
      maxPromptCharacters: compilation.compiledPrompt.trace.maxPromptCharacters,
    });
    const correctionRun = await start({
      ...input,
      editedPrompt: correctionPrompt,
    });
    if (correctionRun.status !== 'succeeded' || !correctionRun.images[0]) {
      const result: ShortChainValidatedGenerationResult = {
        initialRun,
        initialValidation,
        correctionRun,
        terminalStatus: 'failed',
        automaticRetryCount: 1,
      };
      await writeJson(
        path.join(await shortChainRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
        result,
      );
      return result;
    }
    const correctionValidation = await validator.validate({
      projectId: input.projectId,
      taskContract: compilation.taskContract,
      runId: correctionRun.runId,
      validatorProfileId: input.validatorProfileId,
    });
    const result: ShortChainValidatedGenerationResult = {
      initialRun,
      initialValidation,
      correctionRun,
      correctionValidation,
      terminalStatus: correctionValidation.status,
      automaticRetryCount: 1,
    };
    await writeJson(
      path.join(await shortChainRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
      result,
    );
    await writeJson(
      path.join(await shortChainRoot(input.projectId), 'validations', `${correctionRun.runId}.direction-eligibility.json`),
      { schemaVersion: '1.0', status: correctionValidation.status, taskId: input.taskId },
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
    if (!session.currentTask) throw new Error('No current Short-Chain task to continue');
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
    input: SaveShortChainProjectPromptAssetInput,
  ): Promise<ShortChainProjectPromptAsset> {
    const session = await readSession(input.projectId);
    const previous = await readShortChainArtifact(
      input.projectId,
      'prompt-assets',
      `${input.deliverableFamily}.json`,
    ).then((value) => JSON.parse(value) as ShortChainProjectPromptAsset).catch(() => null);
    const now = new Date().toISOString();
    const asset: ShortChainProjectPromptAsset = {
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
      path.join(await shortChainRoot(input.projectId), 'prompt-assets', `${input.deliverableFamily}.json`),
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

  async function postCompositeLogo(input: PostCompositeShortChainLogoInput) {
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
    const logoMetadata = await sharp(logoPath).rotate().metadata();
    const sourceCrop = input.sourceCrop ?? {
      left: 0,
      top: 0,
      width: logoMetadata.width || 0,
      height: logoMetadata.height || 0,
    };
    const outputPath = path.join(runRoot, 'images', `${path.parse(image.relativePath).name}.post-composite.png`);
    const composite = await postCompositeConfirmedLogo({
      scenePath,
      logoPath,
      outputPath,
      sourceCrop,
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
    return {
      ...audit,
      dataUrl: `data:image/png;base64,${(await fs.readFile(outputPath)).toString('base64')}`,
    };
  }

  async function postCompositeLockedAssets(input: PostCompositeShortChainLockedAssetsInput) {
    if (input.confirmedByUser !== true) {
      throw Object.assign(new Error('Locked asset post-composite requires explicit user confirmation'), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_CONFIRMATION_REQUIRED',
      });
    }
    if (!input.layers.length || input.layers.length > 16) {
      throw Object.assign(new Error('Locked asset post-composite requires 1 to 16 layers'), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_LAYER_COUNT_INVALID',
      });
    }
    const [run, project, paths] = await Promise.all([
      getImageGeneration().getRun(input.runId),
      projects.get(input.projectId),
      projects.paths(input.projectId),
    ]);
    if (!run || run.projectId !== input.projectId || run.status !== 'succeeded') {
      throw Object.assign(new Error('Locked asset post-composite requires a succeeded project run'), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_RUN_INVALID',
      });
    }
    const image = run.images.find((item) => item.imageId === input.imageId);
    if (!image) throw Object.assign(new Error('Generated image does not exist'), {
      code: 'LOCKED_ASSET_POST_COMPOSITE_IMAGE_MISSING',
    });
    const runRoot = await getImageGeneration().runRoot(input.runId);
    if (!runRoot) throw new Error('Image generation run root is unavailable');
    const snapshot = await fs.readFile(path.join(runRoot, 'source-context-snapshot.json'), 'utf8')
      .then((value) => JSON.parse(value) as { taskContract?: { logoUsageMode?: string } })
      .catch(() => null);
    if (snapshot?.taskContract?.logoUsageMode !== 'post_composite') {
      throw Object.assign(new Error('Selected run did not reserve post-composite identity areas'), {
        code: 'LOCKED_ASSET_POST_COMPOSITE_MODE_REQUIRED',
      });
    }
    const resolvedLayers = await Promise.all(input.layers.map(async (layer) => {
      const asset = project.assets.find((item) => item.id === layer.assetId);
      if (!asset || asset.status !== 'ready') {
        throw Object.assign(new Error(`Confirmed project asset is unavailable: ${layer.assetId}`), {
          code: 'LOCKED_ASSET_POST_COMPOSITE_ASSET_MISSING',
        });
      }
      const assetPath = path.resolve(paths.input, asset.relativePath);
      const actualSha256 = crypto.createHash('sha256').update(await fs.readFile(assetPath)).digest('hex');
      if (actualSha256 !== asset.sha256) {
        throw Object.assign(new Error(`A locked source asset changed after project ingestion: ${layer.assetId}`), {
          code: 'LOCKED_ASSET_POST_COMPOSITE_SOURCE_HASH_MISMATCH',
        });
      }
      return { layer, asset, assetPath };
    }));
    const scenePath = path.resolve(runRoot, image.relativePath);
    const outputPath = path.join(
      runRoot,
      'images',
      `${path.parse(image.relativePath).name}.locked-assets-composite.png`,
    );
    const composite = await compositeLockedAssets({
      scenePath,
      outputPath,
      layers: resolvedLayers.map(({ layer, assetPath }) => ({ ...layer, assetPath })),
    });
    const audit = {
      schemaVersion: '1.0',
      status: 'completed',
      projectId: input.projectId,
      runId: input.runId,
      sourceImageId: input.imageId,
      sourceImagePath: scenePath,
      confirmationSource: 'user_confirmed',
      ...composite,
      layers: composite.layers.map((result) => {
        const resolved = resolvedLayers.find(({ layer }) => layer.layerId === result.layerId)!;
        return {
          ...result,
          assetId: resolved.asset.id,
          usage: resolved.layer.usage,
          assetOriginalName: resolved.asset.originalName,
          assetProjectRelativePath: `input/${resolved.asset.relativePath}`,
          expectedProjectAssetSha256: resolved.asset.sha256,
          sourceHashMatchesProjectAsset: result.sourceAssetSha256 === resolved.asset.sha256,
        };
      }),
      completedAt: new Date().toISOString(),
    };
    // A second comparison covers any mutation between the preflight read and composite read.
    if (audit.layers.some((layer) => !layer.sourceHashMatchesProjectAsset)) throw Object.assign(
      new Error('A locked source asset changed during post-composite'),
      { code: 'LOCKED_ASSET_POST_COMPOSITE_SOURCE_HASH_MISMATCH' },
    );
    await writeJson(path.join(runRoot, 'locked-assets-post-composite.json'), audit);
    return audit;
  }

  return {
    compile,
    start,
    startValidated,
    getSession: readSession,
    confirmDirection,
    continueSameType,
    postCompositeLogo,
    postCompositeLockedAssets,
    saveProjectPromptAsset,
    listOptions: listShortChainTemplateOptions,
  };
}

export type ShortChainImageGenerationService = ReturnType<typeof createShortChainImageGenerationService>;
