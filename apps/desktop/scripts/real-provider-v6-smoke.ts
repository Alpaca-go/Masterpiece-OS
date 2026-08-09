import { app } from 'electron';
import path from 'node:path';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createPipelineService } from '../src/main/pipeline-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

function summary(value: unknown): void {
  process.stdout.write(`SMOKE_RESULT ${JSON.stringify(value)}\n`);
}

async function main(): Promise<void> {
  if (!projectId || !textProfileId || !imageProfileId) {
    throw new Error(
      '缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_TEXT_PROFILE_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID。',
    );
  }
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const pipeline = createPipelineService(
    projects,
    getProviderCredentials,
    getSettings,
    (progress) => {
      process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({
        kind: 'analysis',
        stage: progress.stage,
        elapsedMs: progress.elapsedMs,
        model: progress.model,
      })}\n`);
    },
  );
  const analysisStartedAt = Date.now();
  const analysis = await pipeline.start(projectId, true, textProfileId);
  const analysisDurationMs = Date.now() - analysisStartedAt;
  const project = await projects.get(projectId);
  const referenceAsset = project.assets.find((asset) => /^image\//u.test(asset.mimeType))
    ?? project.assets.find((asset) => /\.(?:png|jpe?g|webp)$/iu.test(asset.relativePath));
  if (!referenceAsset) throw new Error('代表性项目中没有可用于真实生图的参考图片。');

  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => {
      process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({
        kind: 'image',
        status: progress.status,
        elapsedMs: progress.elapsedMs,
        model: progress.modelId,
      })}\n`);
    },
  });
  const imageStartedAt = Date.now();
  const prompt = [
    '# Task',
    '为当前品牌生成一张升级后的完整店内空间效果图。',
    '# Responsibility',
    '只生成一个真实、完整、可进入的室内空间主画面；不得生成 VI 合集、多格拼贴、物料展示板或说明页。',
    '# Brand Identity',
    `保持当前品牌“${project.brandName || project.projectName}”的身份辨识，不引入其他品牌、Logo、口号或签名图形。`,
    '# Visual Direction',
    '现代、克制、有温度；真实商业空间比例；清晰主次；自然材质与可信光影。',
    '# Output Rules',
    '单张图，禁止水印，禁止解释文字，禁止多格画面。',
  ].join('\n\n');
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: prompt,
    promptVersion: 'real-provider-smoke-1.0.0',
    snapshot: {
      schemaVersion: '1.0',
      kind: 'real-provider-release-smoke',
      projectId,
      userAuthorized: true,
      createdAt: new Date().toISOString(),
    },
    sourceMap: {
      projectId,
      referenceAssetId: referenceAsset.id,
      outputResponsibility: 'complete_interior_scene',
    },
    references: [{
      id: referenceAsset.id,
      role: 'core_reference',
      projectRelativePath: `input/${referenceAsset.relativePath.replaceAll('\\', '/')}`,
    }],
    event: 'REAL_PROVIDER_RELEASE_SMOKE_STARTED',
    apiProfileId: imageProfileId,
    size: '1024*1024',
  });
  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  const runtimeReport = await import('node:fs/promises')
    .then((fs) => fs.readFile(analysis.runtimeReportPath, 'utf8'))
    .then((value) => JSON.parse(value) as {
      modelCallCount?: number;
      modelCalls?: unknown[];
      modelCallsThisRun?: number;
    });
  summary({
    projectId,
    projectName: analysis.project.projectName,
    analysis: {
      provider: analysis.provider,
      model: analysis.model,
      status: analysis.project.status,
      modelCallCount: runtimeReport.modelCallsThisRun
        ?? runtimeReport.modelCallCount
        ?? (Array.isArray(runtimeReport.modelCalls) ? runtimeReport.modelCalls.length : 1),
      durationMs: analysisDurationMs,
      reportPath: analysis.reportPath,
      runtimeReportPath: analysis.runtimeReportPath,
    },
    image: {
      provider: imageRun.providerId,
      model: imageRun.modelId,
      status: imageRun.status,
      modelCallCount: 1,
      durationMs: Date.now() - imageStartedAt,
      runId: imageRun.runId,
      runRoot,
      imagePaths: imageRun.images.map((image) => path.join(runRoot || '', image.relativePath)),
    },
  });
  if (analysis.project.status !== 'completed' || imageRun.status !== 'succeeded' || !imageRun.images.length) {
    throw new Error(`真实 Provider 验收未完成：analysis=${analysis.project.status}, image=${imageRun.status}`);
  }
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
    process.stderr.write(`SMOKE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
