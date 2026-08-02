// Phase 9C.2 — Reports-only mode (no image gen, re-generate reports from saved outputs).
// 用法: cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c.2-spatial-calibration/run-report-only.mjs

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createProjectStore } from '../../src/main/project-store.ts';
import { getSettings } from '../../src/main/settings-store.ts';

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

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference', 'phase-9c.2-calibration');
const TESTS_ROOT = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'tests', 'spatial-calibration');

function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
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

async function main() {
  const settings = await getSettings();
  const projects = createProjectStore(getSettings);
  const spaceRuntime = await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime').replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { compileSpaceRuntime } = spaceRuntime as any;

  // Re-load allResults from outputs/run.json (per-brand) and re-compile to get intent
  const allResults: BrandPresetResult[] = [];
  for (const brand of brandKeys) {
    const runJsonPath = path.join(TESTS_ROOT, brand, 'outputs', 'run.json');
    if (!existsSync(runJsonPath)) {
      logProgress('skip_brand_no_runjson', { brandKey: brand });
      continue;
    }
    const runJson = JSON.parse(readFileSync(runJsonPath, 'utf8')) as { results: BrandPresetResult[] };
    for (const r of runJson.results) {
      // Re-compile to get intent
      const compiled = compileSpaceRuntime(r.brandKey, { preset: r.preset, spaceTypeOverride: 'reception' });
      r.blockCount = compiled.blockCount;
      r.characterCount = compiled.characterCount;
      r.intent = compiled.compiledSpatialIntentPreset?.spatialIntentPreset?.intent ?? null;
      r.spaceType = 'reception';
      allResults.push(r);
    }
  }

  // Per-brand Per-preset detail reports
  for (const brand of brandKeys) {
    const brandDir = path.join(TESTS_ROOT, brand);
    const project = await projects.get(BRAND_PROJECT_ENV_MAP[brand]);
    for (const preset of PRESETS) {
      const r = allResults.find((x) => x.brandKey === brand && x.preset === preset);
      if (!r) continue;
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
    const brandResults = allResults.filter((r) => r.brandKey === brand);
    const allSucceeded = brandResults.every((r) => r.status === 'succeeded');

    const lines: string[] = [];
    lines.push(`# Spatial Calibration Report — ${brand} (${project?.industry ?? '?'})`);
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

    await fs.writeFile(path.join(TESTS_ROOT, brand, 'report.md'), lines.join('\n'), 'utf8');
  }

  logProgress('reports_done', {
    totalResults: allResults.length,
    reports: brandKeys.length,
  });

  console.log(`Reports re-generated for ${brandKeys.length} brands × ${PRESETS.length} presets = ${allResults.length} cases.`);
  process.exit(0);
}

main().catch((err: any) => {
  process.stderr.write(`REPORT-ONLY FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
