import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  VNextCompiledPrompt,
  VNextModelPromptPayload,
  VNextTaskContract,
} from '../../../../../packages/image-generation-contracts/src/index.ts';
import { compileVNextImageGeneration } from '../../../../../packages/image-generation-runtime/src/vnext/index.js';
import type { ProjectContextService } from '../project-context-service.ts';
import type { ProjectStore } from '../project-store.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';

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
) {
  async function compile(input: CompileVNextGenerationInput): Promise<CompileVNextGenerationResult> {
    const context = await projectContext.getVNext(input.projectId)
      .catch(() => projectContext.rebuildVNext(input.projectId));
    const result = compileVNextImageGeneration({
      projectContext: context,
      model: input.model,
      task: {
        ...input.task,
        projectId: input.projectId,
      },
    }) as Omit<CompileVNextGenerationResult, 'artifactDirectory'> & {
      route: unknown;
    };
    const paths = await projects.paths(input.projectId);
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
    return {
      taskContract: result.taskContract,
      compiledPrompt: result.compiledPrompt,
      payload: result.payload,
      artifactDirectory,
    };
  }

  return { compile };
}

export type VNextImageGenerationService = ReturnType<typeof createVNextImageGenerationService>;
