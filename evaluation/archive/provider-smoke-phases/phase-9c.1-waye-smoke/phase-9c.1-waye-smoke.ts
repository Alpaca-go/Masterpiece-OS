// Phase 9C.1 WAYE smoke — 1 image (16:9) on post-correction 蛙耶 DNA.
//
// 用法: 对 蛙耶 (post-9C.0.5 DNA 修正) 跑 9C.1 compileSpaceRuntime 16 块
//   (15 baseline + 1 space_role_context, sceneType=reception 餐饮入口点单概念)
//   真实调 Provider 生成 1 张 16:9 横板空间效果图.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY        = 'wa-ye'
//   MASTERPIECE_SMOKE_PROJECT_ID       = desktop project id (e.g. 蛙耶-<uuid>)
//   MASTERPIECE_SMOKE_ASSET_ID         = project asset id (use first image)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = image generation profile id (volcengine / Seedream)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA = 默认 APPDATA/masterpiece-os-desktop
//   MASTERPIECE_SMOKE_SIZE      = 默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_REPO_ROOT = 默认 cwd/../..  (D:\Masterpiece-OS)
//
// 历史: 之前 9C v0.1 brands smoke (75628a7) 对 wa-ye 跑 base v0.1 (11 块, 因 DNA incomplete).
//   本次 wa-ye DNA 已修正 (industry=casual_dining / sceneType=reception / 3 JSON 配套补齐),
//   9C.0.5 gate 报 pass, 9C.1 跑 16 块. 验证 9C.1 在 casual_dining 行业也能正确
//   跑通 prompt compiler + image gen.

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createImageGenerationService } from '../../src/main/image-generation/service.ts';
import { createFileContextLoader } from '../../src/main/image-generation/context-loader.ts';
import { createProjectStore } from '../../src/main/project-store.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../../src/main/settings-store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const brandKey = process.env.MASTERPIECE_SMOKE_BRAND_KEY?.trim() || '';
const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const assetId = process.env.MASTERPIECE_SMOKE_ASSET_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

if (!brandKey || !projectId || !assetId || !imageProfileId) {
  throw new Error(
    'Missing required env: MASTERPIECE_SMOKE_BRAND_KEY / PROJECT_ID / ASSET_ID / IMAGE_PROFILE_ID',
  );
}

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const SPACE_RUNTIME_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime');
const VALIDATION_DIR = path.join(
  REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', 'phase-9C.1-waye-smoke', brandKey,
);

function summary(v: any) { process.stdout.write(`SMOKE_RESULT ${JSON.stringify(v)}\n`); }
function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);

  const project = await projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const referenceAsset = project.assets.find((a: any) => a.id === assetId);
  if (!referenceAsset) throw new Error(`Asset ${assetId} not found in project`);

  logProgress('start', {
    projectId, brandKey, assetId, imageProfileId, imageSize,
    referenceRelativePath: referenceAsset.relativePath,
  });

  // Load Phase 9C.1 runtime (9C + space_role_context block, default includeSpaceRoleContext=true)
  const runtime = await import(`file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { compileSpaceRuntime } = runtime as any;

  const result = compileSpaceRuntime(brandKey, { includeSpaceRoleContext: true });
  const prompt = result.markdown;
  const blockCount = result.blockCount;
  const characterCount = result.characterCount;
  const mode = result.mode;
  const runtimePath = result.runtimePath;
  const moduleVersions = result.moduleVersions;
  const compiledSpaceRole = result.compiledSpaceRole;
  logProgress('compiled', {
    mode: 'Phase 9C.1',
    blocks: blockCount,
    chars: characterCount,
    runtimePath,
    spaceType: compiledSpaceRole?.spaceRole?.space_type,
  });

  // Save prompt.md
  await fs.mkdir(VALIDATION_DIR, { recursive: true });
  await fs.writeFile(path.join(VALIDATION_DIR, 'prompt.md'), prompt, 'utf8');

  // Create image generation service
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress: any) => logProgress('image', progress),
  });

  // Image generation
  const imageStartedAt = Date.now();
  const promptVersion = `phase-9C.1-${brandKey}-1.0.0`;
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: prompt,
    promptVersion,
    snapshot: {
      schemaVersion: '1.0',
      kind: 'phase-9c.1-waye-smoke',
      brandKey,
      projectId,
      userAuthorized: true,
      createdAt: new Date().toISOString(),
    },
    sourceMap: {
      projectId,
      referenceAssetId: referenceAsset.id,
      outputResponsibility: 'complete_interior_scene',
      spatialIntelligenceMode: mode,
      spaceRoleIntelligence: compiledSpaceRole?.spaceRole?.space_type ?? null,
    },
    references: [{
      id: referenceAsset.id,
      role: 'core_reference',
      projectRelativePath: `input/${referenceAsset.relativePath.replaceAll('\\', '/')}`,
    }],
    event: `PHASE_9C_1_WAYE_SMOKE_STARTED`,
    apiProfileId: imageProfileId,
    size: imageSize,
  });

  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  const runJson = JSON.parse(readFileSync(path.join(runRoot, 'run.json'), 'utf8'));
  const imagePath = path.join(runRoot, 'images', 'image-01.png');

  let copiedImagePath: string | null = null;
  try {
    await fs.access(imagePath);
    const targetImage = path.join(VALIDATION_DIR, 'image.png');
    await fs.copyFile(imagePath, targetImage);
    copiedImagePath = targetImage;
  } catch {
    copiedImagePath = null;
  }

  const runRecord = {
    schemaVersion: '1.0',
    phase: '9C.1',
    brandKey,
    projectId,
    assetId: referenceAsset.id,
    brandName: project.name,
    brandPositioning: project.brandKey,
    promptVersion,
    provider: imageProfileId,
    size: imageSize,
    referenceAssetId: referenceAsset.id,
    runId: imageRun.runId,
    status: runJson.status,
    terminalAt: runJson.terminalAt ?? null,
    modelCallCount: runJson.modelCallCount ?? null,
    blockCount,
    characterCount,
    mode,
    runtimePath,
    moduleVersions,
    spaceRoleIntelligence: {
      spaceType: compiledSpaceRole?.spaceRole?.space_type,
      blockId: compiledSpaceRole?.blockId,
      characterCount: compiledSpaceRole?.characterCount,
    },
    imageBytes: copiedImagePath ? (await fs.stat(copiedImagePath)).size : null,
    createdAt: new Date(imageStartedAt).toISOString(),
    durationMs: Date.now() - imageStartedAt,
  };
  await fs.writeFile(path.join(VALIDATION_DIR, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');

  // Markdown report
  let md = `# Phase 9C.1 WAYE (post-correction) Smoke — 1 image (16:9)\n\n`;
  md += `- **Generated**: ${new Date().toISOString()}\n`;
  md += `- **Brand**: ${brandKey} (蛙耶 — 餐饮 / 炭烧牛蛙 / 潮流快餐, post-9C.0.5 DNA 修正)\n`;
  md += `- **Project**: ${projectId} (${project.name})\n`;
  md += `- **Provider**: ${imageProfileId} (image, volcengine / doubao-seedream-5-0-pro-260628)\n`;
  md += `- **Size requested**: 1024x576 (16:9 horizontal)\n`;
  md += `- **Reference asset**: ${referenceAsset.id} (${referenceAsset.relativePath})\n`;
  md += `- **Mode**: ${mode}\n`;
  md += `- **Runtime path**: ${runtimePath}\n`;
  md += `- **Block count**: ${blockCount} (15 baseline + 1 space_role_context)\n`;
  md += `- **Char count**: ${characterCount}\n`;
  md += `- **Space role**: ${compiledSpaceRole?.spaceRole?.space_type} (priority: privacy=${compiledSpaceRole?.spaceRole?.priority?.privacy} / comfort=${compiledSpaceRole?.spaceRole?.priority?.comfort} / brand_display=${compiledSpaceRole?.spaceRole?.priority?.brand_display} / circulation=${compiledSpaceRole?.spaceRole?.priority?.circulation})\n`;
  md += `- **Status**: ${runJson.status}\n`;
  md += `- **Duration**: ${runRecord.durationMs}ms\n`;
  md += `- **Image bytes**: ${runRecord.imageBytes ?? 'n/a'}\n`;
  md += `- **Module versions**: ${JSON.stringify(moduleVersions)}\n`;
  md += `\n## 9C.0.5 gate pre-check\n\n`;
  md += `Before smoke, 9C.0.5 brand identity validation gate was run on the corrected DNA. `;
  md += `Expected: status=pass, risk=low, confidence>=0.85, matchedIndustry=casual_dining, issues=0.\n`;
  await fs.writeFile(path.join(VALIDATION_DIR, 'report.md'), md, 'utf8');

  logProgress('scene_complete', {
    brandKey,
    runId: imageRun.runId,
    status: runJson.status,
    durationMs: runRecord.durationMs,
    imageBytes: runRecord.imageBytes,
  });

  summary({
    projectId, brandKey, mode, blockCount, characterCount,
    status: runJson.status, durationMs: runRecord.durationMs,
    imageBytes: runRecord.imageBytes, validationDir: VALIDATION_DIR,
  });

  process.exit(runJson.status === 'succeeded' ? 0 : 1);
}

main().catch((err: any) => {
  process.stderr.write(`PHASE 9C.1 WAYE SMOKE FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
