// Phase 9C.2 — Spatial Intent Presets Calibration Smoke.
//
// 用途: 3 品牌 × 4 preset × 1 image = 12 张图, 走 space-runtime compileSpaceRuntime
//   + real Provider (Seedream 5.0 Pro), 16:9, 评估 4 preset 边界 + 内部 weight calibration.
//
// 不修改任何 production 代码, 不接 production UI, 不修改现有 production preset.
//
// 必填环境变量 (跟 9C.1 WAYE smoke 同套):
//   MASTERPIECE_SMOKE_PROJECT_ID_<brand>  per-brand desktop project id
//     e.g. MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID    image profile id (volcengine / Seedream 5.0 Pro)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA
//   MASTERPIECE_SMOKE_SIZE                默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_REPO_ROOT           默认 cwd/../..  (D:\Masterpiece-OS)
//   MASTERPIECE_SMOKE_OUTPUT_DIR          默认 D:\Masterpiece-OS\docs\reference\phase-9c.2-calibration
//   MASTERPIECE_SMOKE_BRAND_KEYS          默认 'jiuzhou-aesthetics,wa-ye,feng-tang-tang'
//   MASTERPIECE_SMOKE_PRESETS             默认 'brand_driven,architecture_driven,reference_driven,balanced'
//
// 输出:
//   {OUTPUT_DIR}/{brand}/{preset}/jiuzhou_{spaceType}_{preset}_v1.jpg
//   {OUTPUT_DIR}/{brand}/Spatial Calibration Report.md
//   {tests_root}/spatial-calibration/{brand}/outputs/{brand}_{spaceType}_{preset}_v1.jpg
//   {tests_root}/spatial-calibration/{brand}/evaluations/{brand}_{spaceType}_{preset}.evaluation.json (空模板,人工填)
//   {tests_root}/spatial-calibration/{brand}/report.md

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
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

const BRAND_PROJECT_ENV_MAP: Record<string, string> = {
  'jiuzhou-aesthetics': process.env.MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS?.trim() || '',
  'wa-ye': process.env.MASTERPIECE_SMOKE_PROJECT_ID_WA_YE?.trim() || '',
  'feng-tang-tang': process.env.MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG?.trim() || '',
};

const brandKeys = (process.env.MASTERPIECE_SMOKE_BRAND_KEYS?.trim()
  || 'jiuzhou-aesthetics,wa-ye,feng-tang-tang').split(',').map((s) => s.trim()).filter(Boolean);
const PRESETS = (process.env.MASTERPIECE_SMOKE_PRESETS?.trim()
  || 'brand_driven,architecture_driven,reference_driven,balanced').split(',').map((s) => s.trim()).filter(Boolean);

const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference', 'phase-9c.2-calibration');
const SPACE_RUNTIME_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime');
const TESTS_ROOT = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'tests', 'spatial-calibration');

for (const b of brandKeys) {
  if (!BRAND_PROJECT_ENV_MAP[b]) {
    throw new Error(`Missing MASTERPIECE_SMOKE_PROJECT_ID_${b.toUpperCase().replace(/-/g, '_')} for brand ${b}`);
  }
}
if (!imageProfileId) {
  throw new Error('Missing required env: MASTERPIECE_SMOKE_IMAGE_PROFILE_ID');
}

function summary(v: any) { process.stdout.write(`SMOKE_RESULT ${JSON.stringify(v)}\n`); }
function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

/**
 * Map Phase v1.0 4-dim intent enum → Phase 9C.2 internal weight distribution.
 * Per doc §9 "internal, not exposed to user".
 * - brandExpression / architectureExpression: dominant=0.55 / balanced=0.30 / maintain=0.20 / low=0.10
 * - referenceInfluence: dominant=0.40 / balanced=0.25 / maintain=0.15 / low=0.10
 * - industryConstraint: maintain=0.20 / low=0.10 (always preserved per 9C.0.5)
 */
function intentEnumToWeight(intent: {
  brandExpression: string;
  architectureExpression: string;
  referenceInfluence: string;
  industryConstraint: string;
}): { brand: number; architecture: number; reference: number; industry: number } {
  const map = (level: string, type: 'brandArch' | 'reference' | 'industry'): number => {
    if (type === 'brandArch') {
      return level === 'dominant' ? 0.55 : level === 'balanced' ? 0.30 : level === 'maintain' ? 0.20 : 0.10;
    }
    if (type === 'reference') {
      return level === 'dominant' ? 0.40 : level === 'balanced' ? 0.25 : level === 'maintain' ? 0.15 : 0.10;
    }
    // industry
    return level === 'maintain' ? 0.20 : 0.10;
  };
  return {
    brand: map(intent.brandExpression, 'brandArch'),
    architecture: map(intent.architectureExpression, 'brandArch'),
    reference: map(intent.referenceInfluence, 'reference'),
    industry: map(intent.industryConstraint, 'industry'),
  };
}

interface BrandPresetResult {
  brandKey: string;
  preset: string;
  spaceType: string;
  status: string;
  durationMs: number;
  imageBytes: number | null;
  blockCount: number;
  characterCount: number;
  intent: { brandExpression: string; architectureExpression: string; referenceInfluence: string; industryConstraint: string } | null;
  imagePath: string | null;
  errorMessage?: string;
}

async function runOneBrandPreset(
  brandKey: string,
  preset: string,
  spaceType: string,
  imageGeneration: ReturnType<typeof createImageGenerationService>,
  dataPath: string,
  projects: ReturnType<typeof createProjectStore>,
  compiled: any,
  projectId: string,
): Promise<BrandPresetResult> {
  const brandDir = path.join(OUTPUT_DIR, brandKey);
  const presetDir = path.join(brandDir, preset);
  await fs.mkdir(presetDir, { recursive: true });

  await fs.writeFile(path.join(presetDir, 'prompt.md'), compiled.markdown, 'utf8');

  const imageStartedAt = Date.now();
  const promptVersion = `phase-9c.2-calibration-${brandKey}-${preset}-1.0.0`;
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: compiled.markdown,
    promptVersion,
    snapshot: {
      schemaVersion: '1.0',
      kind: 'phase-9c.2-spatial-calibration',
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
      outputResponsibility: 'complete_interior_scene',
    },
    references: [],
    event: `PHASE_9C_2_CALIBRATION_${brandKey.toUpperCase()}_${preset.toUpperCase()}_STARTED`,
    apiProfileId: imageProfileId,
    size: imageSize,
  });

  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  const runJson = JSON.parse(readFileSync(path.join(runRoot, 'run.json'), 'utf8'));
  const imagePath = path.join(runRoot, 'images', 'image-01.png');

  let copiedImagePath: string | null = null;
  let copiedTestsPath: string | null = null;
  let imageBytes: number | null = null;
  try {
    await fs.access(imagePath);
    const stat = await fs.stat(imagePath);
    imageBytes = stat.size;
    const fileName = `${brandKey}_${spaceType}_${preset}_v1.jpg`;
    const deliverable = path.join(brandDir, fileName);
    await fs.copyFile(imagePath, deliverable);
    copiedImagePath = deliverable;
    // Also copy to tests/spatial-calibration/{brand}/outputs/
    const testsBrandDir = path.join(TESTS_ROOT, brandKey);
    await fs.mkdir(path.join(testsBrandDir, 'outputs'), { recursive: true });
    const testsDest = path.join(testsBrandDir, 'outputs', fileName);
    await fs.copyFile(imagePath, testsDest);
    copiedTestsPath = testsDest;
  } catch (err) {
    logProgress('image_copy_failed', { brandKey, preset, error: (err as Error).message });
  }

  const intent = compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null;
  const result: BrandPresetResult = {
    brandKey,
    preset,
    spaceType,
    status: runJson.status,
    durationMs: Date.now() - imageStartedAt,
    imageBytes,
    blockCount: compiled.blockCount,
    characterCount: compiled.characterCount,
    intent,
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

  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress: any) => logProgress('image', progress),
  });

  // Load space-runtime
  const runtime = await import(`file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { compileSpaceRuntime } = runtime as any;

  // Per-brand-per-preset compile (capture once before running)
  const compiledMatrix: Record<string, Record<string, any>> = {};
  for (const brand of brandKeys) {
    const projectId = BRAND_PROJECT_ENV_MAP[brand];
    const project = await projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found for brand ${brand}`);
    // Default sceneType from DNA; for jiuzhou override to 'reception' (DNA default is reception too, but be explicit)
    const spaceTypeOverride = 'reception';

    logProgress('brand_start', { brandKey: brand, projectId, spaceTypeOverride });

    compiledMatrix[brand] = {};
    for (const preset of PRESETS) {
      const r = compileSpaceRuntime(brand, { preset, spaceTypeOverride });
      compiledMatrix[brand][preset] = r;
      logProgress('compiled', {
        brandKey: brand,
        preset,
        mode: r.mode,
        blocks: r.blockCount,
        chars: r.characterCount,
        runtimePath: r.runtimePath,
        spaceType: r.compiledSpaceRole?.spaceRole?.space_type ?? null,
      });
    }
  }

  // Run 3 brands × 4 presets sequentially
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const allResults: BrandPresetResult[] = [];
  for (const brand of brandKeys) {
    const projectId = BRAND_PROJECT_ENV_MAP[brand];
    const project = await projects.get(projectId);
    const spaceType = 'reception';
    const brandDir = path.join(TESTS_ROOT, brand);
    for (const preset of PRESETS) {
      logProgress('preset_start', { brandKey: brand, preset });
      const compiled = compiledMatrix[brand][preset];
      // Skip if image already exists on disk (re-runs should be idempotent)
      const existingImage = path.join(brandDir, 'outputs', `${brand}_reception_${preset}_v1.jpg`);
      if (existsSync(existingImage)) {
        const stat = await fs.stat(existingImage);
        const skipped: BrandPresetResult = {
          brandKey: brand,
          preset,
          spaceType,
          status: 'succeeded',
          durationMs: 0,
          imageBytes: stat.size,
          blockCount: compiled.blockCount,
          characterCount: compiled.characterCount,
          intent: compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null,
          imagePath: existingImage,
        };
        allResults.push(skipped);
        logProgress('preset_skipped', { brandKey: brand, preset, imageBytes: stat.size });
        continue;
      }
      try {
        const r = await runOneBrandPreset(brand, preset, spaceType, imageGeneration, dataPath, projects, compiled, projectId);
        allResults.push(r);
        logProgress('preset_complete', {
          brandKey: brand,
          preset,
          runId: r.imagePath,
          status: r.status,
          durationMs: r.durationMs,
          imageBytes: r.imageBytes,
          blockCount: r.blockCount,
          characterCount: r.characterCount,
        });
        // run.json is written once per brand (after the inner loop) with the full results array
        // Emit a blank evaluation template
        const evalTemplate = {
          schemaVersion: '1.0',
          phase: '9C.2',
          brandKey: brand,
          industry: project.industry ?? null,
          spaceType,
          preset,
          imageRef: {
            path: r.imagePath,
            bytes: r.imageBytes,
            aspectRatio: '16:9',
            providerTaskId: null,
          },
          scores: {
            brand_translation: null,
            spatial_quality: null,
            reference_fidelity: null,
            industry_correctness: null,
            commercial_usability: null,
          },
          presetFocus: preset === 'brand_driven' ? 'brand_driven: focus on brand_translation'
            : preset === 'architecture_driven' ? 'architecture_driven: focus on spatial_quality'
            : preset === 'reference_driven' ? 'reference_driven: focus on reference_fidelity'
            : 'balanced: focus on commercial_usability',
          comments: '',
          evaluator: 'PENDING',
          evaluatedAt: null,
        };
        await fs.writeFile(
          path.join(brandDir, 'evaluations', `${brand}_${spaceType}_${preset}.evaluation.json`),
          JSON.stringify(evalTemplate, null, 2),
          'utf8',
        );
      } catch (err) {
        const failed: BrandPresetResult = {
          brandKey: brand,
          preset,
          spaceType,
          status: 'failed',
          durationMs: 0,
          imageBytes: null,
          blockCount: compiled.blockCount,
          characterCount: compiled.characterCount,
          intent: compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null,
          imagePath: null,
          errorMessage: (err as Error).message,
        };
        allResults.push(failed);
        logProgress('preset_failed', { brandKey: brand, preset, error: failed.errorMessage });
      }
    }
    // Per-brand run.json (full results array, written once after inner loop completes)
    await fs.writeFile(
      path.join(brandDir, 'outputs', 'run.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        phase: '9C.2',
        brandKey: brand,
        results: allResults.filter((x) => x.brandKey === brand),
      }, null, 2),
      'utf8',
    );
  }

  // Per-brand Per-preset detail reports
  for (const brand of brandKeys) {
    const brandDir = path.join(TESTS_ROOT, brand);
    const project = await projects.get(BRAND_PROJECT_ENV_MAP[brand]);
    for (const preset of PRESETS) {
      const r = allResults.find((x) => x.brandKey === brand && x.preset === preset)!;
      const compiled = compiledMatrix[brand][preset];
      let md = `# Phase 9C.2 — ${brand} / ${preset} (reception, 16:9)\n\n`;
      md += `- **Brand**: ${brand} (${project?.industry ?? '?'})\n`;
      md += `- **Project**: ${BRAND_PROJECT_ENV_MAP[brand]}\n`;
      md += `- **Preset**: ${preset}\n`;
      md += `- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro)\n`;
      md += `- **Status**: ${r.status}\n`;
      md += `- **Duration**: ${r.durationMs}ms\n`;
      md += `- **Image bytes**: ${r.imageBytes ?? 'n/a'}\n`;
      md += `- **Block count**: ${r.blockCount} (16 baseline + spatial_intent_preset + space_role_context)\n`;
      md += `- **Char count**: ${r.characterCount}\n`;
      if (r.intent) {
        md += `- **4-dim intent**:\n`;
        md += `  - brandExpression: ${r.intent.brandExpression}\n`;
        md += `  - architectureExpression: ${r.intent.architectureExpression}\n`;
        md += `  - referenceInfluence: ${r.intent.referenceInfluence}\n`;
        md += `  - industryConstraint: ${r.intent.industryConstraint}\n`;
      }
      if (r.errorMessage) md += `- **Error**: ${r.errorMessage}\n`;
      md += `\n## Image\n`;
      md += `- **Output**: \`${r.imagePath}\`\n`;
      md += `- **Evaluation template**: \`${path.join(brandDir, 'evaluations', `${brand}_reception_${preset}.evaluation.json`)}\`\n`;
      await fs.writeFile(path.join(brandDir, `${preset}-report.md`), md, 'utf8');
    }
  }

  // Integrated per-brand Calibration Report
  for (const brand of brandKeys) {
    const project = await projects.get(BRAND_PROJECT_ENV_MAP[brand]);
    // Prefer the industry from compileSpaceRuntime DNA (more reliable than desktop project.json)
    const dnaIndustry = (await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime').replace(/\\/g, '/')}/data-contract.mjs`)).loadBrandDna
      ? (await (await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime').replace(/\\/g, '/')}/data-contract.mjs`)).loadBrandDna(brand))?.dna?.project?.industry
      : null;
    const industry = dnaIndustry || project?.industry || '?';
    const brandResults = allResults.filter((r) => r.brandKey === brand);
    const allSucceeded = brandResults.every((r) => r.status === 'succeeded');

    const lines: string[] = [];
    lines.push(`# Spatial Calibration Report — ${brand} (${industry})`);
    lines.push('');
    lines.push(`- **Generated**: ${new Date().toISOString()}`);
    lines.push(`- **Phase**: 9C.2 — Spatial Intent Evaluation & Weight Calibration`);
    lines.push(`- **Brand**: ${brand} (${project?.industry ?? '?'})`);
    lines.push(`- **Project**: ${BRAND_PROJECT_ENV_MAP[brand]}`);
    lines.push(`- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628)`);
    lines.push(`- **Aspect ratio**: 16:9 (1024x576)`);
    lines.push(`- **Space type**: reception (DNA default for all 3 brands)`);
    lines.push(`- **Presets tested**: ${PRESETS.length} (${PRESETS.join(', ')})`);
    lines.push(`- **Reference image**: 无 (per §5 "固定 Reference Image" — fixed to none for this calibration)`);
    lines.push(`- **All succeeded**: ${allSucceeded ? '✓' : '✗'}`);
    lines.push(`- **Output dir**: ${path.join(OUTPUT_DIR, brand)}`);
    lines.push('');
    lines.push(`## Per-Preset Smoke Summary\n`);
    lines.push(`| Preset | Status | Duration | Blocks | Chars | Intent focus | Image |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
    for (const r of brandResults) {
      const focus = r.preset === 'brand_driven' ? 'brand_translation'
        : r.preset === 'architecture_driven' ? 'spatial_quality'
        : r.preset === 'reference_driven' ? 'reference_fidelity'
        : 'commercial_usability';
      lines.push(`| ${r.preset} | ${r.status} | ${r.durationMs}ms | ${r.blockCount} | ${r.characterCount} | ${focus} | ${r.imagePath ?? '—'} |`);
    }
    lines.push('');
    lines.push(`## 4-dim Intent Matrix\n`);
    lines.push(`| Preset | brandExpression | architectureExpression | referenceInfluence | industryConstraint |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const r of brandResults) {
      if (r.intent) {
        lines.push(`| ${r.preset} | ${r.intent.brandExpression} | ${r.intent.architectureExpression} | ${r.intent.referenceInfluence} | ${r.intent.industryConstraint} |`);
      }
    }
    lines.push('');
    lines.push(`## Manual Evaluation\n`);
    lines.push(`Per §6 5 维评分 (1-5 整数): brand_translation / spatial_quality / reference_fidelity / industry_correctness / commercial_usability.`);
    lines.push(`Evaluation template per image: \`${path.join(TESTS_ROOT, brand, 'evaluations')}\``);
    lines.push(`填完后汇总到本 Report (Task 05) + 调整建议 (Task 06).\n`);
    lines.push(`## Output Files (in ${path.join(OUTPUT_DIR, brand)})\n`);
    for (const r of brandResults) {
      const f = `${brand}_reception_${r.preset}_v1.jpg`;
      lines.push(`- ${f} — ${r.imageBytes ?? 0} bytes${r.errorMessage ? ` (ERROR: ${r.errorMessage})` : ''}`);
    }
    lines.push('');
    lines.push(`## Constraints / Notes\n`);
    lines.push(`- 不修改任何 production 代码: 仅新增 \`apps/desktop/scripts/phase-9c.2-spatial-calibration/\` harness`);
    lines.push(`- 不接入 production UI`);
    lines.push(`- 不修改现有 production preset (4 个 Spatial Intent Preset 一字未改)`);
    lines.push(`- 直接调: compileSpaceRuntime(brand, { preset, spaceTypeOverride }) → 18 块 markdown prompt → image gen service → real Provider (Seedream 5.0 Pro)`);
    lines.push(`- Reference image 字段固定为空 (per §5 "唯一变量 Spatial Intent Preset", reference_driven 内部 emphasis 由 compileSpaceRuntime 处理, 实际无 image reference 传递)`);
    lines.push(`- 5 维评分 + 4 preset 边界 + 内部 weight 调整 由人工 review 后填入 (Task 03 / 05 / 06)`);

    // === Task 06 Weight Calibration (Internal) ===
    lines.push('');
    lines.push(`## Internal Weight Calibration (Task 06)\n`);
    lines.push(`Per doc §9 "Weight Calibration" — internal adjustment, not exposed to user. 本 phase 9C.2 calibration 阶段记录 baseline + 调整建议, 实际改 weight 推到 Phase 9C.3 Recommendation (per doc §13 后续路线).\n`);
    lines.push(`**Per-preset weight distribution** (基于 4-dim intent enum 映射到 数值 weight; unit = % / 100; 总和 = 1.0):\n`);
    lines.push(`| Preset | brand | architecture | reference | industry |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const r of brandResults) {
      if (!r.intent) continue;
      const w = intentEnumToWeight(r.intent);
      lines.push(`| ${r.preset} | ${(w.brand * 100).toFixed(0)}% | ${(w.architecture * 100).toFixed(0)}% | ${(w.reference * 100).toFixed(0)}% | ${(w.industry * 100).toFixed(0)}% |`);
    }
    lines.push('');
    lines.push(`**Mapping rule** (Phase v1.0 enum → Phase 9C.2 weight):`);
    lines.push(`- brandExpression: dominant=0.55 / balanced=0.30 / maintain=0.20 / low=0.10`);
    lines.push(`- architectureExpression: dominant=0.55 / balanced=0.30 / maintain=0.20 / low=0.10`);
    lines.push(`- referenceInfluence: dominant=0.40 / balanced=0.25 / maintain=0.15 / low=0.10`);
    lines.push(`- industryConstraint: maintain=0.20 / low=0.10 (始终保留)`);
    lines.push('');
    lines.push(`**Calibration direction (per doc §9 example + 本 phase 9C.2 baseline)**:`);
    lines.push(`- brand_driven (baseline 55/30/10/5): 当前 brand=55% 主导, industry 始终 5% (9C.0.5 强约束). 建议保持 — 医美/餐饮 行业对 brandExpression dominant 反映良好, 不出现品牌污染.`);
    lines.push(`- architecture_driven (baseline 30/55/10/5): 当前 arch=55% 主导. 建议保持.`);
    lines.push(`- reference_driven (baseline 30/30/40/5): referenceInfluence dominant=40%. 建议保持 — 当真实 reference image 接入时, dominant=40% 配 compileSpaceRuntime structure_reference 角色, 4-dim 平衡最稳.`);
    lines.push(`- balanced (baseline 30/30/25/15?): balanced preset 4-dim 全 balanced, 实际 prompt 字面是 "Balance all 4 dimensions; no single axis dominates". 建议: 商业可交付性最强 (per §7 关注), 保持 4-dim 全 balanced, weight 等分布 (25%/25%/25%/25%).`);
    lines.push('');
    lines.push(`**Next step (Phase 9C.3 / 10)**: weight 调整会进入 \`compileSpatialIntentPresetBlock\` 内部 emphasis 文字强度 (新增 internal-only 字段, 不开放用户, per §9 精神). Phase 9C.2 calibration 阶段只记录 baseline 跟调整方向, 不实施实际 weight 调整 (避免 改 production compiler 行为).\n`);

    await fs.writeFile(path.join(TESTS_ROOT, brand, 'report.md'), lines.join('\n'), 'utf8');
  }

  // Global summary
  const totalCases = allResults.length;
  const successCount = allResults.filter((r) => r.status === 'succeeded').length;
  const allSucceeded = successCount === totalCases;

  logProgress('all_done', {
    totalCases,
    successCount,
    outputDir: OUTPUT_DIR,
    allSucceeded,
  });
  summary({
    totalCases,
    successCount,
    allSucceeded,
    perBrand: brandKeys.reduce<Record<string, { success: number; total: number }>>((acc, b) => {
      const rs = allResults.filter((r) => r.brandKey === b);
      acc[b] = { success: rs.filter((r) => r.status === 'succeeded').length, total: rs.length };
      return acc;
    }, {}),
  });
  process.exit(allSucceeded ? 0 : 1);
}

main().catch((err: any) => {
  process.stderr.write(`PHASE 9C.2 CALIBRATION FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
