import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createAnchorCandidateService } from '../src/main/anchor-candidate-service.ts';
import { createAnchorGenerationService } from '../src/main/anchor-generation-service.ts';
import { createCreativeDirectionService } from '../src/main/creative-direction-service.ts';
import { createCreativeProductionBootstrapService } from '../src/main/creative-production-bootstrap-service.ts';
import { createCreativeSessionService } from '../src/main/creative-session-service.ts';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createLockedAssetsService } from '../src/main/locked-assets-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../src/main/settings-store.ts';
import { createStyleProfileService } from '../src/main/style-profile-service.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const reuseDirection = process.env.MASTERPIECE_SMOKE_REUSE_DIRECTION === '1';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

function summary(value: unknown): void {
  process.stdout.write(`V18_1_SMOKE_RESULT ${JSON.stringify(value)}\n`);
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
  const sessions = createCreativeSessionService(projects);
  const directions = createCreativeDirectionService(
    projects,
    sessions,
    getProviderCredentials,
  );
  const lockedAssets = createLockedAssetsService(projects, sessions);
  const styles = createStyleProfileService(projects, sessions);
  const bootstrap = createCreativeProductionBootstrapService(
    projects,
    sessions,
    lockedAssets,
    styles,
    directions,
  );
  const candidates = createAnchorCandidateService(projects, sessions, styles, lockedAssets);
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => {
      process.stdout.write(`V18_1_SMOKE_PROGRESS ${JSON.stringify({
        status: progress.status,
        model: progress.modelId,
        elapsedMs: progress.elapsedMs,
      })}\n`);
    },
  });
  const anchors = createAnchorGenerationService(
    styles,
    lockedAssets,
    candidates,
    imageGeneration,
    directions,
  );
  const project = await projects.get(projectId);
  const session = await sessions.create(projectId);
  if (!session.understanding) {
    throw new Error('代表性项目缺少 Creative Understanding，请先在客户端完成项目读取。');
  }

  const directionStartedAt = Date.now();
  const persistedDirection = reuseDirection ? await directions.getActive(projectId) : null;
  const directionResult = persistedDirection
    ? {
      direction: persistedDirection,
      provider: 'persisted',
      model: 'persisted',
      modelCallCount: 0,
      outputRoot: path.join((await projects.paths(projectId)).root, 'creative-session', 'direction'),
    }
    : await directions.generate(projectId, {
      apiProfileId: textProfileId,
      understanding: session.understanding,
    });
  const directionDurationMs = Date.now() - directionStartedAt;
  const projectPaths = await projects.paths(projectId);
  const visualContext = await fs
    .readFile(path.join(projectPaths.outputs, 'project-visual-context.json'), 'utf8')
    .then((value) => JSON.parse(value))
    .catch(() => undefined);
  await lockedAssets.compile(projectId, {
    visualContext,
    understanding: session.understanding,
  });
  const prepared = await bootstrap.prepare(projectId);
  const confirmedStyle = await styles.confirm(projectId, prepared.styleProfile.id);

  const imageStartedAt = Date.now();
  const anchorResult = await anchors.generate(projectId, {
    purpose: '建立一个明显区别旧 VI 陈列方式的冯烫烫品牌店内空间：真实可进入、单一完整场景，以开放后厨和共享餐桌形成新的品牌体验。',
    aspectRatio: '1:1',
    apiProfileId: imageProfileId,
  });
  const runRoot = await imageGeneration.runRoot(anchorResult.run.runId);
  const persistedTask = runRoot
    ? await fs.readFile(path.join(runRoot, 'task.json'), 'utf8').then((value) => JSON.parse(value))
    : null;
  const prompt = runRoot
    ? await import('node:fs/promises')
      .then((fs) => fs.readFile(path.join(runRoot, 'compiled-prompt.md'), 'utf8'))
    : '';
  summary({
    userAuthorized: true,
    projectId,
    projectName: project.projectName,
    direction: {
      provider: directionResult.provider,
      model: directionResult.model,
      status: directionResult.direction.status,
      version: directionResult.direction.version,
      modelCallCount: directionResult.modelCallCount,
      durationMs: directionDurationMs,
      id: directionResult.direction.id,
      outputRoot: directionResult.outputRoot,
    },
    styleProfile: {
      id: confirmedStyle.id,
      version: confirmedStyle.version,
      status: confirmedStyle.status,
      sourceCreativeDecisionId: confirmedStyle.source.creativeDecisionId,
    },
    image: {
      provider: anchorResult.run.providerId,
      model: anchorResult.run.modelId,
      status: anchorResult.run.status,
      modelCallCount: 1,
      durationMs: Date.now() - imageStartedAt,
      runId: anchorResult.run.runId,
      runRoot,
      referenceCount: Array.isArray(persistedTask?.references) ? persistedTask.references.length : 0,
      promptContainsCreativeDirection: prompt.includes('Creative Direction — defines the new visual language'),
      promptContainsAntiCopyRules: prompt.includes('旧包装换皮') && prompt.includes('旧空间重新排列'),
      imagePaths: anchorResult.run.images.map((image) => path.join(runRoot || '', image.relativePath)),
    },
  });
  if (directionResult.direction.status !== 'ready'
    || confirmedStyle.status !== 'confirmed'
    || anchorResult.run.status !== 'succeeded'
    || !anchorResult.run.images.length) {
    throw new Error(
      `v18.1 真实 Provider 验收未完成：direction=${directionResult.direction.status}, image=${anchorResult.run.status}`,
    );
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
    process.stderr.write(`V18_1_SMOKE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
