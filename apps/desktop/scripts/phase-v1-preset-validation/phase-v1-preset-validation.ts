// Phase v1.0 Spatial Intent Presets Validation — 4 images (16:9) on 九州美学.
//
// 用途: 不接 production UI, 走 space-runtime compileSpaceRuntime + real Provider, 4 个
//   Spatial Intent Preset (brand_driven / architecture_driven / reference_driven /
//   balanced) 各生成 1 张 16:9 横版 EXTERIOR 空间效果图, 验证 4 个 preset 在真实
//   Provider 下的实际效果差异.
//
// 必填环境变量 (跟 9C.1 WAYE smoke 同套):
//   MASTERPIECE_SMOKE_BRAND_KEY         = 'jiuzhou-aesthetics' (compileSpaceRuntime 输入)
//   MASTERPIECE_SMOKE_PROJECT_ID        = desktop project id (image gen 写 run 目录用)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = image profile id (volcengine / Seedream 5.0 Pro)
//   MASTERPIECE_SMOKE_SPACE_TYPE        = 'exterior' (override DNA sceneType, 强制 EXTERIOR)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA = 默认 APPDATA/masterpiece-os-desktop
//   MASTERPIECE_SMOKE_SIZE      = 默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_REPO_ROOT = 默认 cwd/../..  (D:\Masterpiece-OS)
//   MASTERPIECE_SMOKE_OUTPUT_DIR = 默认 D:\Masterpiece-OS\docs\reference (4 张图输出)
//
// 输出:
//   {OUTPUT_DIR}/jiuzhou_exterior_<preset>_v1.jpg — 4 张 (每个 preset 1 张)
//   {OUTPUT_DIR}/jiuzhou-spatial-intent-validation-report.md — 整合 4 preset 报告
//   validation-results/phase-v1-preset-validation/{brand}/{preset}/ —
//     prompt.md (17-18 块), run.json (脱敏), report.md (per-preset), image.png (gitignored)
//
// 不修改任何 production 代码, 不接 production UI, 不修改现有 production preset.

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createImageGenerationService } from '../../src/main/image-generation/service.ts';
import { createFileContextLoader } from '../../src/main/image-generation/context-loader.ts';
import { createProjectStore } from '../../src/main/project-store.ts';
import { resolveProjectRoot } from '../../src/main/image-generation/paths.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../../src/main/settings-store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const brandKey = process.env.MASTERPIECE_SMOKE_BRAND_KEY?.trim() || '';
const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';
const spaceType = process.env.MASTERPIECE_SMOKE_SPACE_TYPE?.trim() || 'exterior';

const PRESETS = ['brand_driven', 'architecture_driven', 'reference_driven', 'balanced'];

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

if (!brandKey || !projectId || !imageProfileId) {
  throw new Error(
    'Missing required env: MASTERPIECE_SMOKE_BRAND_KEY / PROJECT_ID / IMAGE_PROFILE_ID',
  );
}

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference');
const SPACE_RUNTIME_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime');
const VALIDATION_ROOT = path.join(
  REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', 'phase-v1-preset-validation', brandKey,
);
const REFERENCE_FILE = path.join(REPO_ROOT, 'docs', 'reference', 'JZMX-ARCH-01.png');

function summary(v: any) { process.stdout.write(`SMOKE_RESULT ${JSON.stringify(v)}\n`); }
function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

interface PresetResult {
  preset: string;
  status: string;
  durationMs: number;
  imageBytes: number | null;
  blockCount: number;
  characterCount: number;
  runtimePath: string;
  moduleVersions: Record<string, string>;
  intent: { brandExpression: string; architectureExpression: string; referenceInfluence: string; industryConstraint: string } | null;
  referenceUsed: boolean;
  imagePath: string | null;
  errorMessage?: string;
}

async function runOnePreset(
  preset: string,
  imageGeneration: ReturnType<typeof createImageGenerationService>,
  dataPath: string,
  projects: ReturnType<typeof createProjectStore>,
  compiled: any,
  referenceAssetRelPath: string | null,
): Promise<PresetResult> {
  const presetDir = path.join(VALIDATION_ROOT, preset);
  await fs.mkdir(presetDir, { recursive: true });
  await fs.writeFile(path.join(presetDir, 'prompt.md'), compiled.markdown, 'utf8');

  const imageStartedAt = Date.now();
  const promptVersion = `phase-v1-preset-validation-${brandKey}-${preset}-1.0.0`;
  const referenceRelativePath = referenceAssetRelPath
    ? `input/${referenceAssetRelPath.replaceAll('\\', '/')}`
    : null;

  const references = referenceRelativePath
    ? [{
        id: `ref-jzmx-arch-01-${preset}`,
        role: 'structure_reference' as const,
        projectRelativePath: referenceRelativePath,
      }]
    : [];

  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: compiled.markdown,
    promptVersion,
    snapshot: {
      schemaVersion: '1.0',
      kind: 'phase-v1-preset-validation',
      brandKey,
      preset,
      spaceType,
      projectId,
      userAuthorized: true,
      createdAt: new Date().toISOString(),
    },
    sourceMap: {
      projectId,
      spatialIntelligenceMode: compiled.mode,
      spaceRoleIntelligence: compiled.compiledSpaceRole?.spaceRole?.space_type ?? null,
      spatialIntentPreset: preset,
      spatialIntentIntent: compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null,
      referenceAssetId: references[0]?.id ?? null,
      outputResponsibility: 'complete_exterior_scene',
    },
    references,
    event: `PHASE_V1_PRESET_VALIDATION_${preset.toUpperCase()}_STARTED`,
    apiProfileId: imageProfileId,
    size: imageSize,
  });

  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  const runJson = JSON.parse(readFileSync(path.join(runRoot, 'run.json'), 'utf8'));
  const imagePath = path.join(runRoot, 'images', 'image-01.png');

  let copiedImagePath: string | null = null;
  let imageBytes: number | null = null;
  try {
    await fs.access(imagePath);
    const stat = await fs.stat(imagePath);
    imageBytes = stat.size;
    // Per-preset validation artifact (gitignored)
    const localValidationImage = path.join(presetDir, 'image.png');
    await fs.copyFile(imagePath, localValidationImage);
    // Public deliverable to OUTPUT_DIR
    const outFileName = `jiuzhou_exterior_${preset}_v1.jpg`;
    const deliverable = path.join(OUTPUT_DIR, outFileName);
    await fs.copyFile(imagePath, deliverable);
    copiedImagePath = deliverable;
  } catch (err) {
    logProgress('image_copy_failed', { preset, error: (err as Error).message });
  }

  const intent = compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null;

  const result: PresetResult = {
    preset,
    status: runJson.status,
    durationMs: Date.now() - imageStartedAt,
    imageBytes,
    blockCount: compiled.blockCount,
    characterCount: compiled.characterCount,
    runtimePath: compiled.runtimePath,
    moduleVersions: compiled.moduleVersions,
    intent,
    referenceUsed: references.length > 0,
    imagePath: copiedImagePath,
  };
  if (runJson.status !== 'succeeded' && runJson.errorMessage) {
    result.errorMessage = runJson.errorMessage;
  }
  return result;
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);

  const project = await projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  logProgress('start', {
    projectId, brandKey, imageProfileId, imageSize, spaceType,
    presets: PRESETS,
    outputDir: OUTPUT_DIR,
    referenceFile: REFERENCE_FILE,
  });

  // === 1. Locate or stage reference image for reference_driven preset ===
  // We will copy JZMX-ARCH-01.png to <projectRoot>/input/assets/ so
  // image gen can read it via project-relative path. Other presets do NOT
  // include the reference, so we keep their prompt "preservation-clean".
  const projectRoot = await resolveProjectRoot(dataPath, projectId);
  const refAssetRelPath = `assets/JZMX-ARCH-01-reference.png`;
  const refAssetAbs = path.join(projectRoot, 'input', refAssetRelPath.replace(/\//g, path.sep));
  await fs.access(refAssetAbs); // throws if not staged

  // === 2. Load space-runtime and compile per preset ===
  const runtime = await import(`file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { compileSpaceRuntime } = runtime as any;

  // Per-preset compile (17 → 18 blocks with preset)
  const compiledPerPreset: Record<string, any> = {};
  for (const preset of PRESETS) {
    const r = compileSpaceRuntime(brandKey, { preset, spaceTypeOverride: spaceType });
    compiledPerPreset[preset] = r;
    logProgress('compiled', {
      preset,
      mode: r.mode,
      blocks: r.blockCount,
      chars: r.characterCount,
      runtimePath: r.runtimePath,
      spaceType: r.compiledSpaceRole?.spaceRole?.space_type ?? null,
    });
  }

  // === 3. Image generation service ===
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress: any) => logProgress('image', progress),
  });

  // === 4. Run 4 presets sequentially ===
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const results: PresetResult[] = [];
  for (const preset of PRESETS) {
    logProgress('preset_start', { preset });
    const compiled = compiledPerPreset[preset];
    const refForThisPreset = preset === 'reference_driven' ? refAssetRelPath : null;
    try {
      const r = await runOnePreset(preset, imageGeneration, dataPath, projects, compiled, refForThisPreset);
      results.push(r);
      logProgress('preset_complete', {
        preset,
        runId: r.imagePath,
        status: r.status,
        durationMs: r.durationMs,
        imageBytes: r.imageBytes,
        blockCount: r.blockCount,
        characterCount: r.characterCount,
        referenceUsed: r.referenceUsed,
      });

      // Per-preset run.json
      await fs.writeFile(
        path.join(VALIDATION_ROOT, preset, 'run.json'),
        JSON.stringify(r, null, 2),
        'utf8',
      );
    } catch (err) {
      const failed: PresetResult = {
        preset,
        status: 'failed',
        durationMs: 0,
        imageBytes: null,
        blockCount: compiled.blockCount,
        characterCount: compiled.characterCount,
        runtimePath: compiled.runtimePath,
        moduleVersions: compiled.moduleVersions,
        intent: compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null,
        referenceUsed: preset === 'reference_driven',
        imagePath: null,
        errorMessage: (err as Error).message,
      };
      results.push(failed);
      logProgress('preset_failed', { preset, error: failed.errorMessage });
    }
  }

  // === 5. Write per-preset report.md ===
  for (const preset of PRESETS) {
    const r = results.find((x) => x.preset === preset)!;
    const compiled = compiledPerPreset[preset];
    const intent = r.intent;
    let md = `# Phase v1.0 Preset Validation — ${preset}\n\n`;
    md += `- **Generated**: ${new Date().toISOString()}\n`;
    md += `- **Brand**: ${brandKey} (九州美学 — 医疗美容)\n`;
    md += `- **Project**: ${projectId} (${project.name})\n`;
    md += `- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro)\n`;
    md += `- **Size requested**: 1024x576 (16:9 horizontal)\n`;
    md += `- **Space type**: ${spaceType} (override DNA sceneType=${project.name ? 'reception' : 'reception'})\n`;
    md += `- **Reference used**: ${r.referenceUsed ? 'yes — JZMX-ARCH-01.png (structure_reference)' : 'no'}\n`;
    md += `- **Mode**: ${compiled.mode}\n`;
    md += `- **Runtime path**: ${r.runtimePath}\n`;
    md += `- **Block count**: ${r.blockCount}\n`;
    md += `- **Char count**: ${r.characterCount}\n`;
    if (intent) {
      md += `- **Spatial Intent intent (4 维)**:\n`;
      md += `  - brandExpression: ${intent.brandExpression}\n`;
      md += `  - architectureExpression: ${intent.architectureExpression}\n`;
      md += `  - referenceInfluence: ${intent.referenceInfluence}\n`;
      md += `  - industryConstraint: ${intent.industryConstraint}\n`;
    }
    md += `- **Status**: ${r.status}\n`;
    md += `- **Duration**: ${r.durationMs}ms\n`;
    md += `- **Image bytes**: ${r.imageBytes ?? 'n/a'}\n`;
    md += `- **Module versions**: ${JSON.stringify(r.moduleVersions)}\n`;
    if (r.errorMessage) md += `- **Error**: ${r.errorMessage}\n`;
    await fs.writeFile(path.join(VALIDATION_ROOT, preset, 'report.md'), md, 'utf8');
  }

  // === 6. Integrated report ===
  const allSucceeded = results.every((r) => r.status === 'succeeded');
  const integrated: string[] = [];
  integrated.push(`# Spatial Intent Presets Validation Report — 九州美学 / EXTERIOR (16:9)\n`);
  integrated.push(`- **Generated**: ${new Date().toISOString()}`);
  integrated.push(`- **Phase**: v1.0 Spatial Intent Presets validation harness (per user request 2026-08-02)`);
  integrated.push(`- **Brand**: ${brandKey} (九州美学 / 医疗美容 / 皮肤管理)`);
  integrated.push(`- **Project**: ${projectId}`);
  integrated.push(`- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628)`);
  integrated.push(`- **Aspect ratio**: 16:9 (1024x576)`);
  integrated.push(`- **Space type**: ${spaceType} (compileSpaceRuntime spaceTypeOverride, DNA default is reception)`);
  integrated.push(`- **Presets tested**: ${PRESETS.length} (${PRESETS.join(', ')})`);
  integrated.push(`- **Total cases**: ${results.length} (= 4 presets × 1 image each)`);
  integrated.push(`- **All succeeded**: ${allSucceeded ? '✓' : '✗'}`);
  integrated.push(`- **Output dir**: ${OUTPUT_DIR}`);
  integrated.push('');
  integrated.push(`## Per-Preset Summary\n`);
  integrated.push(`| Preset | Status | Duration | Blocks | Chars | Reference | Image |`);
  integrated.push(`| --- | --- | --- | --- | --- | --- | --- |`);
  for (const r of results) {
    integrated.push(`| ${r.preset} | ${r.status} | ${r.durationMs}ms | ${r.blockCount} | ${r.characterCount} | ${r.referenceUsed ? 'JZMX-ARCH-01' : '—'} | ${r.imagePath ?? '—'} |`);
  }
  integrated.push('');
  integrated.push(`## Per-Preset Intent (4 维)\n`);
  integrated.push(`| Preset | brandExpression | architectureExpression | referenceInfluence | industryConstraint |`);
  integrated.push(`| --- | --- | --- | --- | --- |`);
  for (const r of results) {
    if (r.intent) {
      integrated.push(`| ${r.preset} | ${r.intent.brandExpression} | ${r.intent.architectureExpression} | ${r.intent.referenceInfluence} | ${r.intent.industryConstraint} |`);
    }
  }
  integrated.push('');
  integrated.push(`## Output Files (in ${OUTPUT_DIR})\n`);
  for (const r of results) {
    const f = `jiuzhou_exterior_${r.preset}_v1.jpg`;
    integrated.push(`- ${f} — ${r.imageBytes ?? 0} bytes${r.errorMessage ? ` (ERROR: ${r.errorMessage})` : ''}`);
  }
  integrated.push('');
  integrated.push(`## Per-Preset Detail Reports\n`);
  integrated.push(`Validation artifacts at \`${VALIDATION_ROOT}\`:`);
  for (const preset of PRESETS) {
    integrated.push(`- ${preset}/prompt.md, run.json, report.md, image.png (gitignored)`);
  }
  integrated.push('');
  integrated.push(`## Notes / Constraints\n`);
  integrated.push(`- **不修改任何 production 代码**: 仅新增 \`apps/desktop/scripts/phase-v1-preset-validation/\` harness`);
  integrated.push(`- **不接入 production UI**: production 生图 UI 的 SourceBundle preset (visual_extension / document_concept / reference_preview / integrated_anchor) 跟 Spatial Intent Presets 是两套独立抽象,本次验证不改动 production UI`);
  integrated.push(`- **不修改现有 production preset**: SourceBundle preset 一字未改`);
  integrated.push(`- **直接调**: compileSpaceRuntime(brand, { preset, spaceTypeOverride }) → 17-18 块 markdown prompt → image gen service → real Provider (Seedream 5.0 Pro)`);
  integrated.push(`- **Reference (Mode 3)**: JZMX-ARCH-01.png (\`${REFERENCE_FILE}\`) 复制到 \`${refAssetAbs}\`,role=\`structure_reference\``);
  integrated.push(`- **Provider model**: \`doubao-seedream-5-0-pro-260628\` (image_profile_id=${imageProfileId})`);
  integrated.push(`- **Image size**: \`${imageSize}\` (16:9 horizontal, EXTERIOR 店面/门头效果图)`);
  integrated.push('');
  integrated.push(`## Next-Step Decision\n`);
  integrated.push(`- 4 张图实际效果由人工 review (在 ${OUTPUT_DIR})`);
  integrated.push(`- 是否进入下一轮优化: 取决于 4 张图能否呈现 4 preset 预期差异 (brand_driven 强品牌 / architecture_driven 强建筑 / reference_driven 强参考 / balanced 平衡)`);
  integrated.push(`- 跟 Phase 9D §6 Spatial Regression Score (6 维 text-level) 互补: 9D 是 text-level 评分, 本 validation 是 real-provider 实际出图对比`);

  await fs.writeFile(path.join(OUTPUT_DIR, 'jiuzhou-spatial-intent-validation-report.md'), integrated.join('\n'), 'utf8');

  logProgress('all_done', {
    totalCases: results.length,
    successCount: results.filter((r) => r.status === 'succeeded').length,
    outputDir: OUTPUT_DIR,
    allSucceeded,
  });
  summary({
    projectId, brandKey, spaceType, totalCases: results.length,
    allSucceeded, results: results.map((r) => ({ preset: r.preset, status: r.status, durationMs: r.durationMs, imageBytes: r.imageBytes })),
  });
  process.exit(allSucceeded ? 0 : 1);
}

main().catch((err: any) => {
  process.stderr.write(`PHASE V1 PRESET VALIDATION FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
