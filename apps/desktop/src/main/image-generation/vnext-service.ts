import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ImageGenerationRun,
  VNextCompiledPrompt,
  VNextCreativeSession,
  VNextDeliverableFamily,
  VNextModelPromptPayload,
  VNextTaskContract,
  VNextProjectPromptAsset,
  VNextValidatedGenerationResult,
} from '../../../../../packages/image-generation-contracts/src/index.ts';
import {
  compileVNextCorrectionPrompt,
  compileVNextImageGeneration,
  listVNextTemplateOptions,
} from '../../../../../packages/image-generation-runtime/src/vnext/index.js';
import type { ProjectContextService } from '../project-context-service.ts';
import type { ProjectStore } from '../project-store.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';
import type { VNextDeliverableValidatorService } from './vnext-deliverable-validator-service.ts';

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
    const paths = await projects.paths(input.projectId);
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
      task: {
        ...input.task,
        projectId: input.projectId,
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
      writeJson(path.join(artifactDirectory, 'trace.json'), {
        projectId: input.projectId,
        taskId: result.taskContract.taskId,
        contextVersion: result.compiledPrompt.projectContextVersion,
        contextFingerprint: context.provenance.sourceFingerprint,
        route: result.compiledPrompt.route,
        trace: result.compiledPrompt.trace,
        compiledAt: result.compiledPrompt.compiledAt,
      }),
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
      promptCharacters: [...result.compiledPrompt.finalPrompt].length,
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
    const compilation = await readCompilation(input.projectId, input.taskId);
    if (compilation.taskContract.count !== 1) {
      throw Object.assign(new Error('vNext formal-first generation starts with exactly one image'), {
        code: 'VNEXT_FORMAL_FIRST_COUNT_INVALID',
      });
    }
    const currentContext = await projectContext.getVNext(input.projectId);
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
    const explicitReferences = explicitIds.flatMap((assetId) => {
      const asset = currentContext.sourceAssetRefs.find((item) => item.assetId === assetId);
      if (!asset || asset.relativePath.toLowerCase().endsWith('.pdf')) return [];
      return [{
        id: asset.assetId,
        role: asset.role === 'logo'
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
    const run = await getImageGeneration().startCompiledCreativeTask({
      projectId: input.projectId,
      compiledPrompt: prompt,
      promptVersion: compilation.compiledPrompt.trace.sourceFingerprint,
      snapshot: {
        schemaVersion: 'vnext-1.0',
        projectContextVersion: compilation.compiledPrompt.projectContextVersion,
        taskContract: compilation.taskContract,
        route: compilation.compiledPrompt.route,
        trace: compilation.compiledPrompt.trace,
        implicitAnchor,
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
      modelId: compilation.payload.model,
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
        promptFingerprint: compilation.compiledPrompt.trace.sourceFingerprint,
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

  async function startValidated(
    input: StartValidatedVNextGenerationInput,
  ): Promise<VNextValidatedGenerationResult> {
    const validator = getValidator?.();
    if (!validator) throw new Error('vNext deliverable validator is not configured');
    const compilation = await readCompilation(input.projectId, input.taskId);
    const initialRun = await start(input);
    if (initialRun.status !== 'succeeded' || !initialRun.images[0]) {
      throw Object.assign(new Error(initialRun.errorMessage || 'Initial image generation failed'), {
        code: initialRun.errorCode || 'VNEXT_INITIAL_GENERATION_FAILED',
      });
    }
    const initialValidation = await validator.validate({
      projectId: input.projectId,
      taskContract: compilation.taskContract,
      runId: initialRun.runId,
      validatorProfileId: input.validatorProfileId,
    });
    if (initialValidation.status !== 'failed' || !initialValidation.retryRecommended) {
      const result: VNextValidatedGenerationResult = {
        initialRun,
        initialValidation,
        terminalStatus: initialValidation.status,
        automaticRetryCount: 0,
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
      const result: VNextValidatedGenerationResult = {
        initialRun,
        initialValidation,
        correctionRun,
        terminalStatus: 'failed',
        automaticRetryCount: 1,
      };
      await writeJson(
        path.join(await vnextRoot(input.projectId), 'validations', `${input.taskId}.summary.json`),
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
    const result: VNextValidatedGenerationResult = {
      initialRun,
      initialValidation,
      correctionRun,
      correctionValidation,
      terminalStatus: correctionValidation.status,
      automaticRetryCount: 1,
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

  return {
    compile,
    start,
    startValidated,
    getSession: readSession,
    confirmDirection,
    continueSameType,
    saveProjectPromptAsset,
    listOptions: listVNextTemplateOptions,
  };
}

export type VNextImageGenerationService = ReturnType<typeof createVNextImageGenerationService>;
