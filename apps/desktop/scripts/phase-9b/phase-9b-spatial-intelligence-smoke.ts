// Phase 9B Spatial Intelligence Pipeline Real-Provider Smoke Runner
// 用途: 对一个 brand 跑 Mode A (Previous Pipeline) vs Mode B (Spatial Intelligence Pipeline)
//       的真实 Provider 端到端对比, 保存到 validation-results/phase-9B/{brand}/.
//
// 这是一个 USER-AUTHORIZED smoke, 必须用环境变量显式传入 profile ID + project ID.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID     = 真实 desktop 项目 ID
//   MASTERPIECE_SMOKE_TEXT_PROFILE_ID   = text generation profile ID
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = image generation profile ID
//   MASTERPIECE_SMOKE_BRAND_KEY         = 'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
//   MASTERPIECE_SMOKE_DNA_PATH          = dna.json 路径 (v0.1 / v0.1.1 / v0.3 任意)
//   MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH = spatial-intent.json 路径
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA = desktop userData 路径 (默认 APPDATA/masterpiece-os-desktop)
//   MASTERPIECE_SMOKE_SIZE      = image size (默认 1024*1024)
//
// 跑法:
//   cd apps/desktop
//   node scripts/phase-9b/run-phase-9b-smoke.mjs
//
// 跑完后:
//   ../../space-generator/v1-experimental/validation-results/phase-9B/{brand}/
//     ├── mode-A/run.json
//     ├── mode-A/prompt.md
//     ├── mode-A/image.png
//     ├── mode-B/run.json
//     ├── mode-B/prompt.md
//     ├── mode-B/image.png
//     └── evaluation-report.md

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createFileContextLoader } from '../../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../../src/main/image-generation/service.ts';
import { createPipelineService } from '../../src/main/pipeline-service.ts';
import { createDesktopAnalysisRuntimeAdapter } from '../../src/main/analysis-runtime-adapter.ts';
import { createProjectStore } from '../../src/main/project-store.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const brandKey = process.env.MASTERPIECE_SMOKE_BRAND_KEY?.trim() || '';
const dnaPath = process.env.MASTERPIECE_SMOKE_DNA_PATH?.trim() || '';
const spatialIntentPath = process.env.MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH?.trim() || '';
// Phase 9B.1: optional spatial-reality path. If set, smoke runs Phase 9B.1 Mode B
// (15 blocks with spatial_reality_constraint) instead of Phase 9B Mode B (14 blocks).
const spatialRealityPath = process.env.MASTERPIECE_SMOKE_SPATIAL_REALITY_PATH?.trim() || '';
// Phase 9B.2: optional architecture-preservation path. If set, smoke runs Phase 9B.2 Mode B
// (16 blocks with architecture_preservation) instead of Phase 9B.1 Mode B (15 blocks).
const architecturePreservationPath = process.env.MASTERPIECE_SMOKE_ARCHITECTURE_PRESERVATION_PATH?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*1024';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

if (!projectId || !textProfileId || !imageProfileId || !brandKey || !dnaPath || !spatialIntentPath) {
  throw new Error(
    'Missing required env: MASTERPIECE_SMOKE_PROJECT_ID / TEXT_PROFILE_ID / IMAGE_PROFILE_ID / BRAND_KEY / DNA_PATH / SPATIAL_INTENT_PATH',
  );
}

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const SPATIAL_INTELLIGENCE_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'spatial-intelligence-pipeline');
const SPATIAL_REALITY_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'spatial-reality');
const ARCHITECTURE_PRESERVATION_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'architecture-preservation');
// Output dir: phase-9B.2 if architecture-preservation provided, else phase-9B.1 if spatial-reality, else phase-9B
const PHASE_DIR = architecturePreservationPath ? 'phase-9B.2' : (spatialRealityPath ? 'phase-9B.1' : 'phase-9B');
const VALIDATION_RESULTS = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', PHASE_DIR, brandKey);

function summary(value) {
  process.stdout.write(`SMOKE_RESULT ${JSON.stringify(value)}\n`);
}

function logProgress(stage, payload) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const pipeline = createPipelineService(
    projects,
    getProviderCredentials,
    getSettings,
    (progress) => logProgress('analysis', progress),
    createDesktopAnalysisRuntimeAdapter(app),
  );

  logProgress('start', { projectId, brandKey, imageProfileId, imageSize });

  // 1. 跑 analysis (text generation) - 走完整 pipeline, 拿到 reference asset + project context
  const analysisStartedAt = Date.now();
  const analysis = await pipeline.start(projectId, true, textProfileId);
  const project = await projects.get(projectId);
  const referenceAsset = project.assets.find((asset) => /^image\//u.test(asset.mimeType))
    ?? project.assets.find((asset) => /\.(?:png|jpe?g|webp)$/iu.test(asset.relativePath));
  if (!referenceAsset) throw new Error('Representative project has no reference image for real generation.');

  // 2. 编译 Mode A 和 Mode B prompt
  const dna = JSON.parse(await fs.readFile(dnaPath, 'utf8'));
  const siFile = JSON.parse(await fs.readFile(spatialIntentPath, 'utf8'));

  // Dynamic import: spatial-intelligence-pipeline + spatial-reality + architecture-preservation use .mjs ESM modules
  const { compileRuntimePromptModeA, compileRuntimePromptWithSpatialIntelligence } = await import(
    `file://${SPATIAL_INTELLIGENCE_DIR.replace(/\\/g, '/')}/compile-spatial-intelligence-prompt.mjs`
  );
  let spatialRealityModule = null;
  if (spatialRealityPath || architecturePreservationPath) {
    spatialRealityModule = await import(
      `file://${SPATIAL_REALITY_DIR.replace(/\\/g, '/')}/compile-spatial-reality-prompt.mjs`
    );
  }
  let architecturePreservationModule = null;
  if (architecturePreservationPath) {
    architecturePreservationModule = await import(
      `file://${ARCHITECTURE_PRESERVATION_DIR.replace(/\\/g, '/')}/compile-architecture-preservation-prompt.mjs`
    );
  }

  let modeA, modeB;
  if (architecturePreservationPath) {
    // Phase 9B.2: Mode A = Phase 9B.1 Mode B baseline (15 块), Mode B = +architecture_preservation (16 块)
    const srFile = JSON.parse(await fs.readFile(spatialRealityPath, 'utf8'));
    const apFile = JSON.parse(await fs.readFile(architecturePreservationPath, 'utf8'));
    modeA = spatialRealityModule.compileRuntimePromptModeASpatialReality(dna, siFile.spatialIntentDna, { brandKey });
    modeB = architecturePreservationModule.compileRuntimePromptWithArchitecturePreservation(dna, siFile.spatialIntentDna, srFile.spatialRealityDna, apFile.architecturePreservation, { brandKey });
  } else if (spatialRealityPath) {
    // Phase 9B.1: Mode A = Phase 9B Mode B baseline (14 块), Mode B = +spatial_reality_constraint (15 块)
    const srFile = JSON.parse(await fs.readFile(spatialRealityPath, 'utf8'));
    modeA = spatialRealityModule.compileRuntimePromptModeASpatialReality(dna, siFile.spatialIntentDna, { brandKey });
    modeB = spatialRealityModule.compileRuntimePromptWithSpatialReality(dna, siFile.spatialIntentDna, srFile.spatialRealityDna, { brandKey });
  } else {
    // Phase 9B: Mode A = compileRuntimePrompt (12 块), Mode B = +spatial_intent +architecture_language (14 块)
    modeA = compileRuntimePromptModeA(dna, { brandKey });
    modeB = compileRuntimePromptWithSpatialIntelligence(dna, siFile.spatialIntentDna, { brandKey });
  }

  logProgress('compiled', {
    phase: PHASE_DIR,
    modeABlocks: modeA.blockCount,
    modeAChars: modeA.characterCount,
    modeBBlocks: modeB.blockCount,
    modeBChars: modeB.characterCount,
  });

  // 3. 创建 image generation service
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => logProgress('image', progress),
  });

  // 4. 跑 Mode A 和 Mode B 各一次
  const results = {};
  for (const mode of ['A', 'B']) {
    const prompt = mode === 'A' ? modeA.markdown : modeB.markdown;
    const modeDir = path.join(VALIDATION_RESULTS, `mode-${mode}`);
    await fs.mkdir(modeDir, { recursive: true });

    // 写 prompt
    await fs.writeFile(path.join(modeDir, 'prompt.md'), prompt, 'utf8');

    // 跑 image generation
    const imageStartedAt = Date.now();
    const imageRun = await imageGeneration.startCompiledCreativeTask({
      projectId,
      compiledPrompt: prompt,
      promptVersion: `${PHASE_DIR}-mode-${mode.toLowerCase()}-1.0.0`,
      snapshot: {
        schemaVersion: '1.0',
        kind: 'phase-9b-spatial-intelligence-smoke',
        mode,
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
      event: `PHASE_9B_MODE_${mode}_STARTED`,
      apiProfileId: imageProfileId,
      size: imageSize,
    });

    const runRoot = await imageGeneration.runRoot(imageRun.runId);
    const runJson = JSON.parse(await fs.readFile(path.join(runRoot, 'run.json'), 'utf8'));
    const imagePath = path.join(runRoot, 'images', 'image-01.png');

    // 复制 image.png 到 validation-results
    let copiedImagePath = null;
    try {
      await fs.access(imagePath);
      const targetImage = path.join(modeDir, 'image.png');
      await fs.copyFile(imagePath, targetImage);
      copiedImagePath = targetImage;
    } catch {
      copiedImagePath = null;
    }

    // 写 run.json (redacted)
    const runRecord = {
      schemaVersion: '1.0',
      phase: PHASE_DIR,
      mode,
      brandKey,
      projectId,
      promptVersion: `${PHASE_DIR}-mode-${mode.toLowerCase()}-1.0.0`,
      provider: imageProfileId,
      size: imageSize,
      referenceAssetId: referenceAsset.id,
      runId: imageRun.runId,
      status: runJson.status,
      terminalAt: runJson.terminalAt ?? null,
      modelCallCount: runJson.modelCallCount ?? null,
      imageBytes: copiedImagePath ? (await fs.stat(copiedImagePath)).size : null,
      createdAt: new Date(imageStartedAt).toISOString(),
      durationMs: Date.now() - imageStartedAt,
    };
    await fs.writeFile(path.join(modeDir, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');

    results[mode] = runRecord;
    logProgress('mode_complete', { mode, runId: imageRun.runId, status: runJson.status, durationMs: runRecord.durationMs });
  }

  // 5. 写 evaluation-report.md
  const reportPath = path.join(VALIDATION_RESULTS, 'evaluation-report.md');
  const report = `# Phase 9B — ${brandKey} A/B Evaluation (real-provider)

- **Generated**: ${new Date().toISOString()}
- **Project**: ${projectId}
- **Brand**: ${brandKey}
- **Provider / Model**: ${imageProfileId} (image), ${textProfileId} (text)
- **Mode A**: Previous Pipeline (Phase 8C compileRuntimePrompt)
- **Mode B**: Spatial Intelligence Pipeline (Phase 9A.2 + 9A.3 + 8A + 8B.1)

## A vs B 跑批结果

| 指标 | Mode A | Mode B |
| --- | --- | --- |
| Status | ${results.A.status} | ${results.B.status} |
| Duration (ms) | ${results.A.durationMs} | ${results.B.durationMs} |
| Model call count | ${results.A.modelCallCount ?? 'n/a'} | ${results.B.modelCallCount ?? 'n/a'} |
| Image bytes | ${results.A.imageBytes ?? 'n/a'} | ${results.B.imageBytes ?? 'n/a'} |
| Block count (prompt) | ${modeA.blockCount} | ${modeB.blockCount} |
| Char count (prompt) | ${modeA.characterCount} | ${modeB.characterCount} |

## Phase 9B §3 Validation Objectives

- **Q1 (Spatial Intent → brand-to-space)**: Mode B 包含 compiledSpatialIntent (Phase 9A.2), 把 5 字段体验目标翻译给模型. Mode A 无.
- **Q2 (Architecture Bridge → architectural reasoning)**: Mode B 包含 architectureLanguage (Phase 9A.3), 5 字段 high-level 方向. Mode A 无.
- **Q3 (Function Bridge → commercial realism)**: 两者都有 architecture_function_bridge (Phase 8B.1), 一致.
- **Q4 (完整链路减少 generic AI 空间生成)**: 需人眼对比两张图. 见 evaluation-report.md 下面 §6.

## 图像级 6 维评分 (人工, v1.0 §25)

> 评分方法: 同一 DNA 跑 Mode A + Mode B, 真正看图 (而非 prompt 文本) 评估.
> 这一步由人工填, 不在自动 smoke 范围内.

| 维度 | Mode A | Mode B | 差异 |
| --- | --- | --- | --- |
| architecture_quality (25) |  /25 |  /25 |  |
| brand_translation (20) |  /20 |  /20 |  |
| functional_realism (20) |  /20 |  /20 |  |
| material_lighting (15) |  /15 |  /15 |  |
| composition (10) |  /10 |  /10 |  |
| rendering (10) |  /10 |  /10 |  |
| **总计** |  /100 |  /100 |  |

## Phase 9B §6.2 New Metrics

| 指标 | Mode A | Mode B |
| --- | --- | --- |
| Intent Alignment Score | (人工) | (人工) |
| Spatial Logic Score | (人工) | (人工) |
| Reasoning Trace Score | (人工) | (人工) |

## 文件

- mode-A/run.json / prompt.md / image.png
- mode-B/run.json / prompt.md / image.png
- evaluation-report.md (本文件)
`;
  await fs.writeFile(reportPath, report, 'utf8');

  summary({
    projectId,
    brandKey,
    modeA: { status: results.A.status, durationMs: results.A.durationMs, runId: results.A.runId },
    modeB: { status: results.B.status, durationMs: results.B.durationMs, runId: results.B.runId },
    reportPath,
    validationDir: VALIDATION_RESULTS,
  });

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`PHASE 9B SMOKE FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
