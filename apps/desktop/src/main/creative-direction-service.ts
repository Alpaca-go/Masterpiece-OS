import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreativeDirection,
  CreativeUnderstanding,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  buildCreativeDirectionPrompt,
  compileCreativeDirectionMarkdown,
  normalizeCreativeDirection,
  validateCreativeDirection,
} from '../../../../packages/creative-production-runtime/src/creative-direction.js';
import { parseCreativeDirectionResponse } from '../../../../packages/creative-production-runtime/src/creative-direction.js';
import { createQwenReasoner } from '../../../../packages/model-runtime/src/qwen-reasoner.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProviderCredentials } from './settings-store.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';

type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;
type ReasonerFactory = typeof createQwenReasoner;

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Creative Direction 保存失败：${result.errorMessage}`), {
      code: 'STATE_PERSIST_FAILED',
    });
  }
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch {
    return null;
  }
}

function nextVersion(current?: string): string {
  if (!current) return '1.0.0';
  const [major = 1, minor = 0] = current.split('.').map(Number);
  return `${Number.isFinite(major) ? major : 1}.${Number.isFinite(minor) ? minor + 1 : 1}.0`;
}

export function createCreativeDirectionService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  readCredentials: CredentialsReader,
  reasonerFactory: ReasonerFactory = createQwenReasoner,
) {
  async function locations(projectId: string) {
    const projectPaths = await projects.paths(projectId);
    const root = path.join(projectPaths.root, 'creative-session', 'direction');
    return {
      ...projectPaths,
      projectRoot: projectPaths.root,
      root,
      active: path.join(root, 'active-direction.json'),
    };
  }

  async function list(projectId: string): Promise<CreativeDirection[]> {
    const target = await locations(projectId);
    const filenames = await fs.readdir(target.root).catch(() => []);
    const values = await Promise.all(filenames
      .filter((filename) => /^creative-direction-v.+\.json$/iu.test(filename))
      .map((filename) => readJson<CreativeDirection>(path.join(target.root, filename))));
    return values
      .filter((item): item is CreativeDirection => Boolean(item))
      .map((item) => validateCreativeDirection(item) as CreativeDirection)
      .sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }));
  }

  async function getActive(projectId: string): Promise<CreativeDirection | null> {
    const target = await locations(projectId);
    const pointer = await readJson<{ filename?: string }>(target.active);
    if (!pointer?.filename) return null;
    const value = await readJson<CreativeDirection>(path.join(target.root, pointer.filename));
    return value ? validateCreativeDirection(value) as CreativeDirection : null;
  }

  async function beginDirectionState(projectId: string): Promise<void> {
    let session = await sessions.create(projectId);
    if (session.workflowState === 'FAILED' || session.workflowState === 'CANCELLED') {
      session = await sessions.transition(projectId, 'SESSION_CREATED', '恢复 Creative Direction 生成。');
    }
    if (session.workflowState === 'SESSION_CREATED') {
      await sessions.transition(projectId, 'DIRECTION_GENERATING', 'Creative Director 正在制定视觉升级方向。');
    }
  }

  async function generate(projectId: string, input?: {
    apiProfileId?: string;
    understanding?: CreativeUnderstanding;
  }): Promise<{
    direction: CreativeDirection;
    provider: string;
    model: string;
    modelCallCount: number;
    outputRoot: string;
  }> {
    const [project, target, session, active] = await Promise.all([
      projects.get(projectId),
      locations(projectId),
      sessions.create(projectId),
      getActive(projectId),
    ]);
    const understanding = input?.understanding || session.understanding;
    if (!understanding) {
      throw Object.assign(new Error('Creative Director 缺少 Creative Understanding。'), {
        code: 'CREATIVE_UNDERSTANDING_MISSING',
      });
    }
    if (!project.lastReportFilename) {
      throw Object.assign(new Error('Creative Director 缺少视觉分析升级报告。'), {
        code: 'READING_REPORT_MISSING',
      });
    }
    const reportPath = path.join(target.outputs, project.lastReportFilename);
    const analysisReport = await fs.readFile(reportPath, 'utf8');
    const reportRelativePath = path.relative(target.projectRoot, reportPath).replaceAll('\\', '/');
    const version = nextVersion(active?.version);
    const id = `creative-direction-${crypto.randomUUID()}`;
    const prompt = buildCreativeDirectionPrompt({ understanding, analysisReport });
    const credentials = await readCredentials(input?.apiProfileId || project.apiProfileId || undefined);
    const reasoner = reasonerFactory({
      apiKey: credentials.apiKey,
      model: credentials.model,
      baseUrl: credentials.baseUrl,
    });

    await fs.mkdir(target.root, { recursive: true });
    await beginDirectionState(projectId);
    await writeJson(path.join(target.root, `direction-input-v${version}.json`), {
      schemaVersion: '1.0',
      projectId,
      sessionId: session.id,
      understanding,
      reportPath: reportRelativePath,
      reportSha256: crypto.createHash('sha256').update(analysisReport).digest('hex'),
      imageAttachments: [],
      createdAt: new Date().toISOString(),
    });

    let raw = '';
    let modelCallCount = 0;
    let direction: CreativeDirection | null = null;
    let lastError: unknown;
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await reasoner({
          prompt: {
            messages: [
              {
                role: 'system',
                content: '你是 Masterpiece OS Creative Director Decision Layer。只输出严格 JSON，不生成图片。',
              },
              {
                role: 'user',
                content: attempt === 1
                  ? prompt
                  : `${prompt}\n\n前次输出校验失败：${lastError instanceof Error ? lastError.message : String(lastError)}。请修复后重新输出完整 JSON。`,
              },
            ],
            attachments: [],
          },
          signal: new AbortController().signal,
          maximumDurationMs: 10 * 60_000,
        });
        modelCallCount += 1;
        raw = response.reportMarkdown;
        try {
          direction = normalizeCreativeDirection(
            parseCreativeDirectionResponse(raw),
            {
              id,
              projectId,
              sessionId: session.id,
              version,
              understandingGeneratedAt: understanding.generatedAt,
              reportPath: reportRelativePath,
            },
          ) as CreativeDirection;
          break;
        } catch (error) {
          lastError = error;
        }
      }
      await fs.writeFile(path.join(target.root, `direction-response-v${version}.raw.txt`), raw, 'utf8');
      if (!direction) throw lastError;

      if (active) {
        await writeJson(
          path.join(target.root, `creative-direction-v${active.version}.json`),
          { ...active, status: 'superseded' },
        );
      }
      const filename = `creative-direction-v${version}.json`;
      await writeJson(path.join(target.root, filename), direction);
      await fs.writeFile(
        path.join(target.root, `creative-direction-v${version}.md`),
        compileCreativeDirectionMarkdown(direction),
        'utf8',
      );
      await writeJson(target.active, {
        directionId: direction.id,
        version: direction.version,
        filename,
        updatedAt: direction.generatedAt,
      });
      await sessions.setActiveEntity(projectId, 'creative_direction', direction);
      await sessions.recordDecision(projectId, {
        type: 'creative_direction',
        summary: direction.projectTransformation,
        rationale: direction.designStrategy,
        outcome: 'confirmed',
        source: 'analysis',
      });
      const current = await sessions.create(projectId);
      if (current.workflowState === 'DIRECTION_GENERATING') {
        await sessions.transition(projectId, 'DIRECTION_READY', `Creative Direction ${version} 已生成。`);
      }
      return {
        direction,
        provider: credentials.provider,
        model: credentials.model,
        modelCallCount,
        outputRoot: target.root,
      };
    } catch (error) {
      const current = await sessions.create(projectId);
      if (current.workflowState === 'DIRECTION_GENERATING') {
        await sessions.transition(projectId, 'FAILED', 'Creative Direction 生成失败。');
      }
      throw error;
    }
  }

  return { generate, getActive, list };
}

export type CreativeDirectionService = ReturnType<typeof createCreativeDirectionService>;
