// Phase 9C v0.1 Brands smoke — 1 image (16:9) per brand, mixed Phase 9C / base v0.1.
//
// 用法: 对 3 个 v0.1 brand (冯烫烫 / 一剂良方 / 蛙耶) 各生成 1 张 16:9 横板空间效果图.
//   - 冯烫烫 / 一剂良方: Phase 9C compileSpaceRuntime 16 块 (spatial_intent + architecture_language +
//     spatial_reality_constraint + architecture_preservation + 11 base)
//   - 蛙耶: base v0.1 compileFieldEnrichedPrompt 11 块 (data incomplete)
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY        = 'feng-tang-tang' | 'yi-ji-liang-fang' | 'wa-ye'
//   MASTERPIECE_SMOKE_PROJECT_ID       = desktop project id
//   MASTERPIECE_SMOKE_ASSET_ID         = project asset id (use first image)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = image generation profile id (volcengine / Seedream)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA = 默认 APPDATA/masterpiece-os-desktop
//   MASTERPIECE_SMOKE_SIZE      = 默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_REPO_ROOT = 默认 cwd/../..  (D:\Masterpiece-OS)
//   MASTERPIECE_SMOKE_USE_PHASE_9C = 默认 true, 设 'false' 强制 base v0.1 (蛙耶)

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
const usePhase9C = (process.env.MASTERPIECE_SMOKE_USE_PHASE_9C?.trim() || 'true').toLowerCase() !== 'false';

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
const FIELD_ENRICHED_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'prompt-compiler', 'field-enriched');
const VALIDATION_DIR = path.join(
  REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', 'phase-9C-v0.1-brands', brandKey,
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
    projectId, brandKey, assetId, imageProfileId, imageSize, usePhase9C,
    referenceRelativePath: referenceAsset.relativePath,
  });

  // Load Phase 9C runtime + brand DNA (FTT/YJLF) OR just DNA (WAYE)
  const runtime = await import(`file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { loadBrandDna, compileSpaceRuntime } = runtime as any;

  let prompt: string;
  let blockCount: number;
  let characterCount: number;
  let mode: string;
  let runtimePath: string;
  let moduleVersions: any;

  if (usePhase9C) {
    const brandDna = loadBrandDna(brandKey);
    const result = compileSpaceRuntime(brandKey);
    prompt = result.markdown;
    blockCount = result.blockCount;
    characterCount = result.characterCount;
    mode = result.mode;
    runtimePath = result.runtimePath;
    moduleVersions = result.moduleVersions;
    logProgress('compiled', { mode: 'Phase 9C', blocks: blockCount, chars: characterCount, runtimePath });
  } else {
    // Base v0.1: compileFieldEnrichedPrompt
    const fieldEnriched = await import(
      `file://${FIELD_ENRICHED_DIR.replace(/\\/g, '/')}/compile-prompt.mjs`
    );
    const dnaPath = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'test-cases', 'regression', 'projects', `${brandKey}.dna.json`);
    const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
    const result = (fieldEnriched as any).compileFieldEnrichedPrompt(dna, { brandKey });
    prompt = result.markdown;
    blockCount = result.blockCount;
    characterCount = result.characterCount;
    mode = 'v0.1-base';
    runtimePath = 'field_enriched_v0.1';
    moduleVersions = { brandDna: dna.dnaVersion || 'unknown', promptCompiler: 'field-enriched-1.0.0' };
    logProgress('compiled', { mode: 'v0.1 base', blocks: blockCount, chars: characterCount });
  }

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
  const promptVersion = usePhase9C
    ? `phase-9C-v0.1-${brandKey}-1.0.0`
    : `phase-v0.1-base-${brandKey}-1.0.0`;
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: prompt,
    promptVersion,
    snapshot: {
      schemaVersion: '1.0',
      kind: 'phase-9c-v0.1-brands',
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
    },
    references: [{
      id: referenceAsset.id,
      role: 'core_reference',
      projectRelativePath: `input/${referenceAsset.relativePath.replaceAll('\\', '/')}`,
    }],
    event: `PHASE_9C_V01_BRANDS_${brandKey.toUpperCase().replace(/-/g, '_')}_STARTED`,
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
    phase: usePhase9C ? '9C' : 'v0.1-base',
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
    imageBytes: copiedImagePath ? (await fs.stat(copiedImagePath)).size : null,
    createdAt: new Date(imageStartedAt).toISOString(),
    durationMs: Date.now() - imageStartedAt,
  };
  await fs.writeFile(path.join(VALIDATION_DIR, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');

  // Markdown report
  let md = `# Phase 9C v0.1 Brands — ${brandKey} (1 image, 16:9 horizontal)\n\n`;
  md += `- **Generated**: ${new Date().toISOString()}\n`;
  md += `- **Brand**: ${brandKey}\n`;
  md += `- **Project**: ${projectId} (${project.name})\n`;
  md += `- **Provider**: ${imageProfileId} (image, volcengine / doubao-seedream-5-0-pro-260628)\n`;
  md += `- **Size requested**: 1024x576 (16:9 horizontal)\n`;
  md += `- **Reference asset**: ${referenceAsset.id} (${referenceAsset.relativePath})\n`;
  md += `- **Mode**: ${mode}\n`;
  md += `- **Runtime path**: ${runtimePath}\n`;
  md += `- **Block count**: ${blockCount}\n`;
  md += `- **Char count**: ${characterCount}\n`;
  md += `- **Status**: ${runJson.status}\n`;
  md += `- **Duration**: ${runRecord.durationMs}ms\n`;
  md += `- **Image bytes**: ${runRecord.imageBytes ?? 'n/a'}\n`;
  if (usePhase9C) {
    md += `- **Module versions**: ${JSON.stringify(moduleVersions)}\n`;
  } else {
    md += `- **Module versions**: ${JSON.stringify(moduleVersions)} (NOTE: Phase 9C skipped — brand data incomplete for wa-ye)\n`;
  }
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
  process.stderr.write(`PHASE 9C V0.1 BRANDS SMOKE FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
