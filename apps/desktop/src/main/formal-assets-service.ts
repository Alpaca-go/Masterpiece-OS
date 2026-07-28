import fs from 'node:fs/promises';
import path from 'node:path';
import type { GenerationOutput } from '../../../../packages/project-contracts/src/index.ts';
import {
  createGenerationOutput,
  reviewGenerationOutput,
  validateGenerationOutput,
} from '../../../../packages/creative-production-runtime/src/revision-assets.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';

async function writeJson(filename: string, value: unknown) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Generation Output 保存失败：${result.errorMessage}`), {
    code: 'STATE_PERSIST_FAILED',
  });
}

export function createFormalAssetsService(projects: ProjectStore) {
  async function root(projectId: string, seriesId: string) {
    return path.join((await projects.paths(projectId)).root, 'generations', seriesId, 'outputs');
  }
  async function save(output: GenerationOutput) {
    const directory = await root(output.projectId, output.seriesId);
    await fs.mkdir(directory, { recursive: true });
    await writeJson(path.join(directory, `${output.id}.json`), output);
    return output;
  }
  async function list(projectId: string, seriesId: string): Promise<GenerationOutput[]> {
    const directory = await root(projectId, seriesId);
    const files = await fs.readdir(directory).catch(() => []);
    const values = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
      try {
        return validateGenerationOutput(JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'))) as GenerationOutput;
      } catch { return null; }
    }));
    return values.filter((value): value is GenerationOutput => Boolean(value));
  }
  async function create(input: unknown) {
    return save(createGenerationOutput(input) as GenerationOutput);
  }
  async function review(projectId: string, seriesId: string, outputId: string, reviewInput: unknown) {
    const output = (await list(projectId, seriesId)).find((item) => item.id === outputId);
    if (!output) throw Object.assign(new Error('Generation Output 不存在。'), { code: 'GENERATION_OUTPUT_MISSING' });
    return save(reviewGenerationOutput(output, reviewInput) as GenerationOutput);
  }
  return { create, review, list };
}

export type FormalAssetsService = ReturnType<typeof createFormalAssetsService>;
