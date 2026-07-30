import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const goldenPromptPath = process.env.MASTERPIECE_SMOKE_GOLDEN_PROMPT_PATH?.trim() || '';
const referenceAssetId = process.env.MASTERPIECE_SMOKE_REFERENCE_ASSET_ID?.trim() || '';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

async function main(): Promise<void> {
  if (!projectId || !imageProfileId || !goldenPromptPath || !referenceAssetId) {
    throw new Error(
      '缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID / '
      + 'MASTERPIECE_SMOKE_GOLDEN_PROMPT_PATH / MASTERPIECE_SMOKE_REFERENCE_ASSET_ID。',
    );
  }

  const prompt = await fs.readFile(path.resolve(goldenPromptPath), 'utf8');
  if (!prompt.trim()) throw new Error('Golden Prompt 为空。');

  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const project = await projects.get(projectId);
  const referenceAsset = project.assets.find((asset) => asset.id === referenceAssetId);
  if (!referenceAsset) throw new Error(`项目中不存在参考资产：${referenceAssetId}`);

  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => {
      process.stdout.write(`GOLDEN_CONTROL_PROGRESS ${JSON.stringify({
        status: progress.status,
        elapsedMs: progress.elapsedMs,
        model: progress.modelId,
      })}\n`);
    },
  });

  const startedAt = Date.now();
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: prompt,
    promptVersion: 'jiuzhou-golden-control-v1.0',
    snapshot: {
      schemaVersion: '1.0',
      kind: 'golden-prompt-control-smoke',
      projectId,
      userAuthorized: true,
      goldenPromptPath: path.resolve(goldenPromptPath),
      createdAt: new Date().toISOString(),
    },
    sourceMap: {
      projectId,
      goldenPromptPath: path.resolve(goldenPromptPath),
      referenceAssetId,
      comparisonGroup: 'C',
    },
    references: [{
      id: referenceAsset.id,
      role: 'identity_reference',
      projectRelativePath: `input/${referenceAsset.relativePath.replaceAll('\\', '/')}`,
    }],
    event: 'GOLDEN_PROMPT_CONTROL_STARTED',
    apiProfileId: imageProfileId,
    size: '2048*1152',
  });
  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  process.stdout.write(`GOLDEN_CONTROL_RESULT ${JSON.stringify({
    userAuthorized: true,
    comparisonGroup: 'C',
    projectId,
    projectName: project.projectName,
    promptPath: path.resolve(goldenPromptPath),
    promptCharacters: [...prompt].length,
    referenceAssetId,
    image: {
      provider: imageRun.providerId,
      model: imageRun.modelId,
      status: imageRun.status,
      modelCallCount: 1,
      durationMs: Date.now() - startedAt,
      runId: imageRun.runId,
      runRoot,
      imagePaths: imageRun.images.map((image) => path.join(runRoot || '', image.relativePath)),
    },
  })}\n`);

  if (imageRun.status !== 'succeeded' || !imageRun.images.length) {
    throw new Error(`Golden 对照未完成：image=${imageRun.status}`);
  }
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    process.stderr.write(`GOLDEN_CONTROL_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
