import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreativeDirection,
  CreativeUnderstanding,
  ProjectVisualContext,
} from '@masterpiece/project-contracts/index.ts';
import {
  buildCreativeReadingPrompt,
  compileCreativeUnderstandingMarkdown,
  normalizeCreativeUnderstanding,
  parseCreativeReadingResponse,
  selectAnalysisPool,
} from '@masterpiece/creative-production-runtime/creative-reading.js';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProviderCredentials } from '../shared/types.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import { isAnalysisSourceAsset } from './project-assets.ts';

type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;
type ReasonerFactory = typeof createQwenReasoner;

async function writeJson(filename: string, value: unknown) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Creative Reading 保存失败：${result.errorMessage}`), {
    code: 'STATE_PERSIST_FAILED',
  });
}

export function createCreativeReadingService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  lockedAssets: LockedAssetsService,
  readCredentials: CredentialsReader,
  directions: CreativeDirectionService,
  reasonerFactory: ReasonerFactory = createQwenReasoner,
) {
  async function locations(projectId: string) {
    const projectPaths = await projects.paths(projectId);
    const root = path.join(projectPaths.root, 'creative-session', 'reading');
    return {
      ...projectPaths,
      projectRoot: projectPaths.root,
      root,
      understandingJson: path.join(root, 'creative-understanding.json'),
      understandingMarkdown: path.join(root, 'creative-understanding.md'),
      inputSnapshot: path.join(root, 'reading-input-snapshot.json'),
      rawResponse: path.join(root, 'reading-response.raw.txt'),
    };
  }

  async function run(projectId: string, apiProfileId?: string): Promise<{
    understanding: CreativeUnderstanding;
    direction: CreativeDirection;
    provider: string;
    model: string;
    modelCallCount: number;
    readingModelCallCount: number;
    directionModelCallCount: number;
    outputRoot: string;
  }> {
    const [project, target, session, locks] = await Promise.all([
      projects.get(projectId),
      locations(projectId),
      sessions.create(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!project.lastReportFilename) {
      throw Object.assign(new Error('Creative Reading 缺少视觉分析升级报告。'), {
        code: 'READING_REPORT_MISSING',
      });
    }
    const reportPath = path.join(target.outputs, project.lastReportFilename);
    const visualContextPath = path.join(target.outputs, 'project-visual-context.json');
    const [reportText, visualContext] = await Promise.all([
      fs.readFile(reportPath, 'utf8'),
      fs.readFile(visualContextPath, 'utf8').then((value) => JSON.parse(value) as ProjectVisualContext),
    ]);
    const imageAssets = project.assets.filter((asset) =>
      isAnalysisSourceAsset(asset) && asset.status === 'ready' && /^image\//iu.test(asset.mimeType));
    if (!imageAssets.length) {
      throw Object.assign(new Error('Creative Reading 至少需要一张原始视觉图片。'), {
        code: 'READING_ASSETS_MISSING',
      });
    }
    const analysisPool = selectAnalysisPool(
      imageAssets,
      locks.map((asset) => asset.sourceAssetId).filter(Boolean),
    );
    const analysisAssets = analysisPool.selected;
    const analysisAssetIds = new Set(analysisAssets.map((asset) => asset.id));
    await fs.mkdir(target.root, { recursive: true });
    const prompt = buildCreativeReadingPrompt({
      visualContext,
      reportText,
      lockedAssets: locks,
      assets: analysisAssets.map((asset) => ({ id: asset.id, name: asset.originalName })),
    });
    await writeJson(target.inputSnapshot, {
      schemaVersion: '1.0',
      projectId,
      sessionId: session.id,
      reportPath: path.relative(target.projectRoot, reportPath).replaceAll('\\', '/'),
      visualContextPath: path.relative(target.projectRoot, visualContextPath).replaceAll('\\', '/'),
      lockedAssetIds: locks.map((asset) => asset.id),
      analysisPool: {
        inputCount: analysisPool.inputCount,
        selectedCount: analysisPool.selectedCount,
        targetMin: analysisPool.targetMin,
        targetMax: analysisPool.targetMax,
        status: analysisPool.status,
        selectedAssetIds: analysisAssets.map((asset) => asset.id),
        excludedAssetIds: analysisPool.excluded.map((asset) => asset.id),
      },
      assets: imageAssets.map((asset) => ({
        id: asset.id,
        name: asset.originalName,
        relativePath: asset.relativePath,
        includedInAnalysisPool: analysisAssetIds.has(asset.id),
      })),
      createdAt: new Date().toISOString(),
    });
    await sessions.appendMessage(projectId, {
      role: 'user',
      type: 'reading_instruction',
      content: '请完整阅读原视觉方案与视觉分析升级报告，生成 Creative Understanding。',
    });
    const credentials = await readCredentials(apiProfileId || project.apiProfileId || undefined);
    const reasoner = reasonerFactory({
      apiKey: credentials.apiKey,
      model: credentials.model,
      baseUrl: credentials.baseUrl,
    });
    const attachments = analysisAssets.map((asset) => ({
      assetId: asset.id,
      path: path.join(target.input, asset.relativePath),
      mediaType: 'image',
      format: path.extname(asset.relativePath).slice(1),
      readable: true,
    }));
    let raw = '';
    let modelCallCount = 0;
    let understanding: CreativeUnderstanding | null = null;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const response = await reasoner({
        prompt: {
          messages: [
            { role: 'system', content: '你是 Masterpiece OS Creative Reading 模块。只返回严格 JSON，不生成图片。' },
            {
              role: 'user',
              content: attempt === 1
                ? prompt
                : `${prompt}\n\n前次输出校验失败：${lastError instanceof Error ? lastError.message : String(lastError)}。请修复并重新输出完整 JSON。`,
            },
          ],
          attachments,
        },
        signal: controller.signal,
        maximumDurationMs: 15 * 60_000,
      });
      modelCallCount += 1;
      raw = response.reportMarkdown;
      try {
        understanding = normalizeCreativeUnderstanding(
          parseCreativeReadingResponse(raw),
          analysisAssets.map((asset) => asset.id),
        ) as CreativeUnderstanding;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    await fs.writeFile(target.rawResponse, raw, 'utf8');
    if (!understanding) throw lastError;
    await writeJson(target.understandingJson, understanding);
    await fs.writeFile(target.understandingMarkdown, compileCreativeUnderstandingMarkdown(understanding), 'utf8');
    await sessions.saveUnderstanding(projectId, understanding);
    const directionResult = await directions.generate(projectId, {
      apiProfileId,
      understanding,
    });
    return {
      understanding,
      direction: directionResult.direction,
      provider: credentials.provider,
      model: credentials.model,
      modelCallCount: modelCallCount + directionResult.modelCallCount,
      readingModelCallCount: modelCallCount,
      directionModelCallCount: directionResult.modelCallCount,
      outputRoot: target.root,
    };
  }

  return { run };
}

export type CreativeReadingService = ReturnType<typeof createCreativeReadingService>;
