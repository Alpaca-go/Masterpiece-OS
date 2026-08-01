// Phase 9C Vertical Test — 8 scenes × 1 image (16:9 horizontal interior)
//
// 用途: 用 Phase 9C compileSpaceRuntime (16 块 prompt) 给 JZMX project 的 8 个
//       vertical test scene 各生成 1 张 16:9 横板室内空间效果图.
//
// 关键设计:
//   - 跳过 pipeline.start() (text analysis): project 已分析, 直接复用 27 张 image assets
//   - 对每个 scene 用 run.mjs 的 deriveDna 逻辑 override sceneDefinition / functionalDna / compositionDna
//   - 调 compileSpaceRuntime(brandKey, { loadDna: false, dnaOverride, ... }) 编译 16 块 prompt
//   - 调 imageGeneration.startCompiledCreativeTask({ size: '1024*576' }) 生成 16:9
//   - 保存到 validation-results/phase-9C-vertical-test/{brand}/{sceneId}/
//
// 不调 text Provider (analysis), 只调 image Provider. 不修改生产代码.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID     = 真实 desktop 项目 ID
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = image generation profile ID
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY  = 默认 'jiuzhou-aesthetics'
//   MASTERPIECE_SMOKE_SIZE       = 默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_USER_DATA  = 默认 APPDATA/masterpiece-os-desktop
//   MASTERPIECE_SMOKE_REPO_ROOT  = 默认 cwd/../..  (即 D:\Masterpiece-OS)
//   MASTERPIECE_SMOKE_SCENE_IDS  = 逗号分隔, 跑子集. 默认全 8 个

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

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const brandKey = process.env.MASTERPIECE_SMOKE_BRAND_KEY?.trim() || 'jiuzhou-aesthetics';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';
const sceneIdsFilter = (process.env.MASTERPIECE_SMOKE_SCENE_IDS?.trim() || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

if (!projectId || !imageProfileId) {
  throw new Error(
    'Missing required env: MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID',
  );
}

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const SPACE_RUNTIME_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime');
const SCENES_PATH = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'test-cases', 'jiuzhou-aesthetics', 'scenes.json');
const VALIDATION_DIR = path.join(
  REPO_ROOT,
  'space-generator', 'v1-experimental', 'validation-results',
  'phase-9C-vertical-test', brandKey,
);

function summary(v) { process.stdout.write(`SMOKE_RESULT ${JSON.stringify(v)}\n`); }
function logProgress(stage, payload) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

/**
 * Per-scene DNA override (复用 test-cases/jiuzhou-aesthetics/run.mjs 的 deriveDna).
 * 替换 sceneDefinition / functionalDna / compositionDna, 保留 brandSpaceDna / materialDna / lightingDna
 * 等共享字段. metadata.sceneId 也加进去方便追溯.
 */
function deriveSceneDna(baseDna: any, scene: any): any {
  return {
    ...baseDna,
    dnaVersion: 'v0.1',
    sceneDefinition: {
      ...baseDna.sceneDefinition,
      sceneType: scene.sceneType,
      sceneSubtype: scene.sceneSubtype,
      commercialContext: scene.commercialContext,
      scale: scene.scale,
      areaSqm: scene.areaSqm || baseDna.sceneDefinition.areaSqm,
      requiredZones: scene.requiredZones,
      optionalZones: scene.optionalZones || [],
    },
    functionalDna: {
      ...baseDna.functionalDna,
      privacy: (scene.sceneType === 'treatment' || scene.sceneType === 'consultation')
        ? { ...baseDna.functionalDna.privacy, treatmentZone: 'enclosed' }
        : baseDna.functionalDna.privacy,
    },
    compositionDna: {
      ...baseDna.compositionDna,
      camera: {
        ...baseDna.compositionDna.camera,
        lens: scene.sceneType === 'corridor' ? 'normal' : baseDna.compositionDna.camera.lens,
        height: scene.sceneType === 'corridor' ? 'human_eye_level' : baseDna.compositionDna.camera.height,
      },
    },
    metadata: {
      ...baseDna.metadata,
      sourceBenchmarkIds: baseDna.metadata?.sourceBenchmarkIds || [],
      sceneId: scene.id,
    },
  };
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);

  // 1. Load project (already analyzed, 27 image assets ready)
  const project = await projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const referenceAsset = project.assets.find((asset: any) => /^image\//u.test(asset.mimeType))
    ?? project.assets.find((asset: any) => /\.(?:png|jpe?g|webp)$/iu.test(asset.relativePath));
  if (!referenceAsset) throw new Error('No reference image asset found in project');

  logProgress('start', {
    projectId,
    brandKey,
    imageProfileId,
    imageSize,
    referenceAssetId: referenceAsset.id,
    assetsCount: project.assets.length,
  });

  // 2. Load Phase 9C runtime + brand DNA
  const { compileSpaceRuntime, loadBrandDna } = await import(
    `file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`
  );
  const brandDna = loadBrandDna(brandKey);

  // 3. Create image generation service
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress: any) => logProgress('image', progress),
  });

  // 4. Load scenes, optionally filtered
  const scenesFile = JSON.parse(readFileSync(SCENES_PATH, 'utf8'));
  let scenes = scenesFile.scenes;
  if (sceneIdsFilter.length > 0) {
    const filterSet = new Set(sceneIdsFilter);
    scenes = scenes.filter((s: any) => filterSet.has(s.id));
    if (scenes.length === 0) throw new Error(`No scenes matched filter: ${sceneIdsFilter.join(',')}`);
  }

  logProgress('scenes_loaded', { count: scenes.length, filter: sceneIdsFilter });

  // 5. Per-scene compile + generate
  const results: any[] = [];
  for (const scene of scenes) {
    logProgress('scene_start', { sceneId: scene.id, sceneName: scene.name, sceneType: scene.sceneType });

    // Derive per-scene DNA
    const sceneDna = deriveSceneDna(brandDna.dna, scene);

    // Compile Phase 9C prompt (16 块) with dna override
    let runtime: any;
    try {
      runtime = compileSpaceRuntime(brandKey, {
        loadDna: false,
        dnaOverride: sceneDna,
        spatialIntentOverride: brandDna.spatialIntentDna,
        spatialRealityOverride: brandDna.spatialRealityDna,
        architecturePreservationOverride: brandDna.architecturePreservation,
      });
    } catch (err: any) {
      logProgress('compile_failed', { sceneId: scene.id, error: err.message });
      results.push({
        schemaVersion: '1.0',
        phase: '9C',
        sceneId: scene.id,
        sceneName: scene.name,
        sceneType: scene.sceneType,
        brandKey,
        projectId,
        promptVersion: `phase-9C-vertical-${scene.id.toLowerCase()}-1.0.0`,
        status: 'compile_failed',
        error: err.message,
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    logProgress('compiled', {
      sceneId: scene.id,
      blocks: runtime.blockCount,
      chars: runtime.characterCount,
      mode: runtime.mode,
    });

    // Save prompt.md
    const sceneDir = path.join(VALIDATION_DIR, scene.id);
    await fs.mkdir(sceneDir, { recursive: true });
    await fs.writeFile(path.join(sceneDir, 'prompt.md'), runtime.markdown, 'utf8');

    // Image generation (16:9 horizontal)
    const imageStartedAt = Date.now();
    let imageRun: any;
    try {
      imageRun = await imageGeneration.startCompiledCreativeTask({
        projectId,
        compiledPrompt: runtime.markdown,
        promptVersion: `phase-9C-vertical-${scene.id.toLowerCase()}-1.0.0`,
        snapshot: {
          schemaVersion: '1.0',
          kind: 'phase-9c-vertical-test',
          sceneId: scene.id,
          sceneName: scene.name,
          brandKey,
          projectId,
          userAuthorized: true,
          createdAt: new Date().toISOString(),
        },
        sourceMap: {
          projectId,
          referenceAssetId: referenceAsset.id,
          outputResponsibility: 'complete_interior_scene',
          spatialIntelligenceMode: runtime.mode,
          sceneId: scene.id,
        },
        references: [{
          id: referenceAsset.id,
          role: 'core_reference',
          projectRelativePath: `input/${referenceAsset.relativePath.replaceAll('\\', '/')}`,
        }],
        event: `PHASE_9C_VERTICAL_${scene.id}_STARTED`,
        apiProfileId: imageProfileId,
        size: imageSize,
      });
    } catch (err: any) {
      logProgress('image_start_failed', { sceneId: scene.id, error: err.message });
      results.push({
        schemaVersion: '1.0',
        phase: '9C',
        sceneId: scene.id,
        sceneName: scene.name,
        sceneType: scene.sceneType,
        brandKey,
        projectId,
        promptVersion: `phase-9C-vertical-${scene.id.toLowerCase()}-1.0.0`,
        status: 'image_start_failed',
        error: err.message,
        blockCount: runtime.blockCount,
        characterCount: runtime.characterCount,
        createdAt: new Date(imageStartedAt).toISOString(),
        durationMs: Date.now() - imageStartedAt,
      });
      continue;
    }

    // Wait for terminal state + collect run.json + image
    const runRoot = await imageGeneration.runRoot(imageRun.runId);
    const runJson = JSON.parse(await fs.readFile(path.join(runRoot, 'run.json'), 'utf8'));
    const imagePath = path.join(runRoot, 'images', 'image-01.png');

    let copiedImagePath: string | null = null;
    try {
      await fs.access(imagePath);
      const targetImage = path.join(sceneDir, 'image.png');
      await fs.copyFile(imagePath, targetImage);
      copiedImagePath = targetImage;
    } catch {
      copiedImagePath = null;
    }

    const runRecord = {
      schemaVersion: '1.0',
      phase: '9C',
      sceneId: scene.id,
      sceneName: scene.name,
      sceneType: scene.sceneType,
      commercialContext: scene.commercialContext,
      scale: scene.scale,
      areaSqm: scene.areaSqm || null,
      brandKey,
      projectId,
      promptVersion: `phase-9C-vertical-${scene.id.toLowerCase()}-1.0.0`,
      provider: imageProfileId,
      size: imageSize,
      referenceAssetId: referenceAsset.id,
      runId: imageRun.runId,
      status: runJson.status,
      terminalAt: runJson.terminalAt ?? null,
      modelCallCount: runJson.modelCallCount ?? null,
      blockCount: runtime.blockCount,
      characterCount: runtime.characterCount,
      imageBytes: copiedImagePath ? (await fs.stat(copiedImagePath)).size : null,
      createdAt: new Date(imageStartedAt).toISOString(),
      durationMs: Date.now() - imageStartedAt,
    };
    await fs.writeFile(path.join(sceneDir, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');

    results.push(runRecord);
    logProgress('scene_complete', {
      sceneId: scene.id,
      runId: imageRun.runId,
      status: runJson.status,
      durationMs: runRecord.durationMs,
    });
  }

  // 6. Summary
  const succeeded = results.filter((r) => r.status === 'succeeded').length;
  const failed = results.length - succeeded;

  const summaryRecord = {
    schemaVersion: '1.0',
    phase: '9C',
    brandKey,
    projectId,
    imageProfileId,
    size: imageSize,
    totalScenes: scenes.length,
    completed: succeeded,
    failed,
    scenes: results,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(VALIDATION_DIR, 'vertical-test-summary.json'), JSON.stringify(summaryRecord, null, 2), 'utf8');

  // Markdown report
  let md = '# Phase 9C — JZMX Vertical Test (per scene × 1 image, 16:9 horizontal)\n\n';
  md += `- **Generated**: ${new Date().toISOString()}\n`;
  md += `- **Project**: ${projectId} (${brandKey})\n`;
  md += `- **Provider**: ${imageProfileId} (image)\n`;
  md += `- **Size**: ${imageSize} (16:9 horizontal)\n`;
  md += `- **Reference asset**: ${referenceAsset.id}\n`;
  md += `- **Total scenes**: ${scenes.length}, succeeded: ${succeeded}, failed: ${failed}\n\n`;
  md += '## Per-Scene Results\n\n';
  md += '| Scene | Type | Status | Duration (ms) | Blocks | Chars | Image bytes |\n';
  md += '| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const r of results) {
    md += `| ${r.sceneId} (${r.sceneName}) | ${r.sceneType} | ${r.status} | ${r.durationMs ?? 'n/a'} | ${r.blockCount ?? 'n/a'} | ${r.characterCount ?? 'n/a'} | ${r.imageBytes ?? 'n/a'} |\n`;
  }
  md += '\n## Note\n\n';
  md += '- **EXTERIOR** is technically an exterior/facade scene, not interior. It is included for completeness to cover all 8 vertical test scenes from scenes.json.\n';
  md += '- Each scene uses the same project reference image (a real JZMX reference asset).\n';
  md += '- image.png is 16:9 (1024×576) horizontal; design is per-scene, not Mode A vs B.\n';
  md += '- Prompt is Phase 9C compileSpaceRuntime (16 blocks: spatial_intent + architecture_language + spatial_reality_constraint + architecture_preservation + 11 base).\n';
  await fs.writeFile(path.join(VALIDATION_DIR, 'vertical-test-report.md'), md, 'utf8');

  summary({
    projectId,
    brandKey,
    imageProfileId,
    imageSize,
    totalScenes: scenes.length,
    completed: succeeded,
    failed,
    reportDir: VALIDATION_DIR,
  });

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: any) => {
  process.stderr.write(`PHASE 9C VERTICAL TEST FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
