// Phase 9C.2 v2 — Brand Identity Validation & Spatial Strategy Selection Smoke.
//
// 用途: 3 brand × 1 image, 走 space-runtime compileSpaceRuntime
//   + real Provider (Seedream 5.0 Pro), 16:9. 用 Phase 9C.2 v2 selectSpatialStrategy
//   自动选 strategy, 跟 9C.2 v1 (4 preset × 1 image = 12 张) 不同, 本次只对 1 个 auto-selected
//   strategy 跑 1 张.
//
// V5 Production Parity (Phase 9C.2 v2 §6/§8 + user review 2026-08-02):
//   - Logo / locked asset detection (跟 createFileContextLoader / vnext-service 一致)
//   - Reference role mapping: logo → identity_reference, structure anchor → structure_reference
//   - vnext-style snapshot + sourceMap (schemaVersion: 'space-runtime-1.0', pipelineMode: 'space-runtime')
//   - DNA constraints (literalAssetUsage + negativeConstraints) → lockedAssetIds + lockedFacts
//   用 space-runtime-asset-contract/ 模块统一处理.
//
// Per doc §9: "第一阶段: 测试 WAYE / 九州美学 / 冯烫烫".
//   WAYE 必须恢复: 青蛙IP / 紫绿黄体系 / 餐饮属性 / 潮流品牌语言
//   九州美学 保持: 建筑高级感 / 东方气质 / 医美属性
//   冯烫烫 保持: 餐饮真实性 / 品牌视觉
//
// 不修改任何 production 代码, 不接 production UI, 不修改现有 4 preset 用户选项.
//
// 必填环境变量 (跟 9C.2 v1 / 9C.1 WAYE smoke 同套):
//   MASTERPIECE_SMOKE_PROJECT_ID_<brand>   per-brand desktop project id
//     e.g. MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID     image profile id (volcengine / Seedream 5.0 Pro)
// (JZMX-ARCH-01 reference 已 staged 在 input/assets/JZMX-ARCH-01-reference.png,
//  image gen service 用 projectRelativePath 直接 resolve, 不需要 project.json asset)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA
//   MASTERPIECE_SMOKE_SIZE                默认 '1024*576' (16:9)
//   MASTERPIECE_SMOKE_REPO_ROOT           默认 cwd/../..  (D:\Masterpiece-OS)
//   MASTERPIECE_SMOKE_BRAND_KEYS          默认 'jiuzhou-aesthetics,wa-ye,feng-tang-tang'
//
// 输出:
//   {OUTPUT_DIR}/{brand}.jpg                                            (3 image deliverables, gitignored)
//   {OUTPUT_DIR}/report.md                                              (integrated report + asset contract table)
//   {VALIDATION_DIR}/{brand}/prompt.md + run.json + report.md + image.png
//     - report.md 包含 assetContract (references / lockedAssetIds / lockedFacts / detection)

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createImageGenerationService } from '../../src/main/image-generation/service.ts';
import { createFileContextLoader } from '../../src/main/image-generation/context-loader.ts';
import { createProjectStore } from '../../src/main/project-store.ts';
import {
  getProviderCredentials,
  getSettings,
} from '../../src/main/settings-store.ts';

const BRAND_PROJECT_ENV_MAP: Record<string, string> = {
  'jiuzhou-aesthetics': process.env.MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS?.trim() || '',
  'wa-ye': process.env.MASTERPIECE_SMOKE_PROJECT_ID_WA_YE?.trim() || '',
  'feng-tang-tang': process.env.MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG?.trim() || '',
};

const brandKeys = (process.env.MASTERPIECE_SMOKE_BRAND_KEYS?.trim()
  || 'jiuzhou-aesthetics,wa-ye,feng-tang-tang').split(',').map((s) => s.trim()).filter(Boolean);

const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference', 'phase-9c.2-spatial-validation');
const SPACE_RUNTIME_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime');
const VALIDATION_ROOT = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', 'phase-9c.2-spatial-validation');

for (const b of brandKeys) {
  if (!BRAND_PROJECT_ENV_MAP[b]) {
    throw new Error(`Missing MASTERPIECE_SMOKE_PROJECT_ID_${b.toUpperCase().replace(/-/g, '_')} for brand ${b}`);
  }
}
if (!imageProfileId) {
  throw new Error('Missing required env: MASTERPIECE_SMOKE_IMAGE_PROFILE_ID');
}

function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

interface BrandRunResult {
  brandKey: string;
  industry: string;
  selectedStrategy: string;
  axisScores: { brand: number; architecture: number; reference: number };
  weights: { brand: number; architecture: number; reference: number; industry: number };
  confidence: { industry: number; asset: number; color: number; motif: number; narrative: number; total: number };
  gateStatus: string;
  gateRiskLevel: string;
  spaceType: string;
  status: string;
  durationMs: number;
  imageBytes: number | null;
  blockCount: number;
  characterCount: number;
  reason: string;
  imagePath: string | null;
  // Phase 9C.2 v2 V5 production-parity fields:
  assetContract: {
    references: Array<{ id: string; role: string; projectRelativePath: string; includeReason?: string }>;
    lockedAssetIds: { logoAssetIds: string[]; structuralAssetIds: string[]; dnaTokens: string[]; all: string[] };
    lockedFacts: string[];
    detection: { logoSource: string; structureSource: string; logoCount: number; structureCount: number; literalAssetTokenCount: number; prohibitionCount: number };
  } | null;
  errorMessage?: string;
}

async function runOneBrand(
  brandKey: string,
  imageGeneration: ReturnType<typeof createImageGenerationService>,
  dataPath: string,
  projects: ReturnType<typeof createProjectStore>,
): Promise<BrandRunResult> {
  const projectId = BRAND_PROJECT_ENV_MAP[brandKey];
  const project = await projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found for brand ${brandKey}`);

  // Per brand hasReferenceImage: JZMX has JZMX-ARCH-01 (staged core reference), others no
  const hasReferenceImage = brandKey === 'jiuzhou-aesthetics';

  logProgress('brand_start', { brandKey, projectId, hasReferenceImage });

  // Load DNA early — industry from DNA is more reliable than project.industry
  const dataContractMod = await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime', 'data-contract.mjs').replace(/\\/g, '/')}`);
  const { loadBrandDna } = dataContractMod as any;
  const dnaLoaded = await loadBrandDna(brandKey);
  const dnaIndustry = dnaLoaded?.dna?.project?.industry ?? project.industry ?? '?';

  // Phase 9C.2 v2 — auto-select spatial strategy (also returns 9C.0.5 gate status)
  const strategyMod = await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'spatial-strategy-selector', 'spatial-strategy-selector.mjs').replace(/\\/g, '/')}`);
  const { selectSpatialStrategy, STRATEGY } = strategyMod as any;
  const strategy = await selectSpatialStrategy(brandKey, { hasReferenceImage });
  const gateStatus = strategy.gateStatus ?? 'unknown';
  const gateRiskLevel = strategy.gateRiskLevel ?? 'unknown';
  logProgress('strategy_selected', {
    brandKey,
    selectedStrategy: strategy.selectedStrategy,
    axisScores: strategy.axisScores,
    weights: strategy.weights,
    confidenceTotal: strategy.confidence.total,
    gateStatus,
    gateRiskLevel,
    reason: strategy.reason,
  });

  // Skip if image already exists on disk (re-runs should be idempotent)
  const deliverable = path.join(OUTPUT_DIR, `${brandKey}.jpg`);
  if (existsSync(deliverable)) {
    const stat = await fs.stat(deliverable);
    logProgress('brand_skipped', { brandKey, deliverable, imageBytes: stat.size });
    // Try to load the previous run.json for the assetContract summary + real durationMs
    const brandDir = path.join(VALIDATION_ROOT, brandKey);
    const prevRunJsonPath = path.join(brandDir, 'run.json');
    let prevAssetContract: BrandRunResult['assetContract'] = null;
    let prevDurationMs = 0;
    let prevBlockCount = 0;
    let prevCharacterCount = 0;
    if (existsSync(prevRunJsonPath)) {
      try {
        const prev = JSON.parse(readFileSync(prevRunJsonPath, 'utf8'));
        prevAssetContract = prev.assetContract ?? null;
        prevDurationMs = prev.durationMs ?? 0;
        prevBlockCount = prev.blockCount ?? 0;
        prevCharacterCount = prev.characterCount ?? 0;
      } catch { /* ignore */ }
    }
    return {
      brandKey,
      industry: dnaIndustry,
      selectedStrategy: strategy.selectedStrategy,
      axisScores: strategy.axisScores,
      weights: strategy.weights,
      confidence: strategy.confidence,
      gateStatus,
      gateRiskLevel,
      spaceType: 'reception',
      status: 'succeeded',
      durationMs: prevDurationMs,  // carry forward from previous real run
      imageBytes: stat.size,
      blockCount: prevBlockCount,
      characterCount: prevCharacterCount,
      reason: strategy.reason,
      imagePath: deliverable,
      assetContract: prevAssetContract,  // carry forward from previous run
    };
  }

  // Load space-runtime compileSpaceRuntime
  const runtime = await import(`file://${SPACE_RUNTIME_DIR.replace(/\\/g, '/')}/compile-space-runtime.mjs`);
  const { compileSpaceRuntime } = runtime as any;

  // Compile with auto-selected preset + spaceTypeOverride=reception (consistent with 9C.2 v1)
  const compiled = compileSpaceRuntime(brandKey, { preset: strategy.selectedStrategy, spaceTypeOverride: 'reception' });
  logProgress('compiled', {
    brandKey,
    preset: strategy.selectedStrategy,
    mode: compiled.mode,
    blocks: compiled.blockCount,
    chars: compiled.characterCount,
    runtimePath: compiled.runtimePath,
    spaceType: compiled.compiledSpaceRole?.spaceRole?.space_type,
  });

  const brandDir = path.join(VALIDATION_ROOT, brandKey);
  await fs.mkdir(brandDir, { recursive: true });
  await fs.writeFile(path.join(brandDir, 'prompt.md'), compiled.markdown, 'utf8');

  // Build asset contract (Phase 9C.2 v2 V5 production parity):
  // Detects logo / structure anchor / DNA constraints and produces
  // vnext-style snapshot + sourceMap + references with correct roles.
  // Per vnext-service line 396-400:
  //   - logo asset → identity_reference
  //   - structure anchor → structure_reference
  //   - staged reference → core_reference (or per staged role)
  const assetContractMod = await import(`file://${path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'space-runtime-asset-contract', 'space-runtime-asset-contract.mjs').replace(/\\/g, '/')}`);
  const { buildAssetContract } = assetContractMod as any;
  const stagedReference = hasReferenceImage
    ? {
        id: 'jzmx-arch-01-staged',
        role: 'structure_reference',  // JZMX-ARCH-01 是 architecture anchor, 不是 core reference
        projectRelativePath: 'input/assets/JZMX-ARCH-01-reference.png',
        includeReason: 'JZMX-ARCH-01 建筑结构 reference (staged outside project.json)',
      }
    : null;
  const assetContract = buildAssetContract({
    projectJson: project as any,
    brandDna: dnaLoaded?.dna,
    compiled,
    strategy,
    hasStagedReference: hasReferenceImage,
    stagedReference,
    dataPath,
  });
  logProgress('asset_contract', {
    brandKey,
    referenceCount: assetContract.references.length,
    referenceRoles: assetContract.references.map((r: any) => r.role),
    lockedAssetIds: assetContract.lockedAssetIds,
    lockedFactsCount: assetContract.lockedFacts.length,
    detection: assetContract.detection,
  });
  const references = assetContract.references;

  const imageStartedAt = Date.now();
  const promptVersion = assetContract.snapshot.taskContract.taskId;  // use vnext-style taskId
  const imageRun = await imageGeneration.startCompiledCreativeTask({
    projectId,
    compiledPrompt: compiled.markdown,
    promptVersion,
    snapshot: assetContract.snapshot,  // vnext-style with lockedAssetIds/lockedFacts
    sourceMap: assetContract.sourceMap,  // vnext-style with pipelineMode: 'space-runtime'
    references,
    event: `PHASE_9C_2_SPATIAL_VALIDATION_${brandKey.toUpperCase()}_${strategy.selectedStrategy.toUpperCase()}_STARTED`,
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
    // 1) deliverable in docs/reference (gitignored)
    const deliverable = path.join(OUTPUT_DIR, `${brandKey}.jpg`);
    await fs.copyFile(imagePath, deliverable);
    // 2) per-brand validation artifact (gitignored locally)
    const validationImage = path.join(brandDir, 'image.png');
    await fs.copyFile(imagePath, validationImage);
    copiedImagePath = deliverable;
  } catch (err) {
    logProgress('image_copy_failed', { brandKey, error: (err as Error).message });
  }

  const result: BrandRunResult = {
    brandKey,
    industry: dnaIndustry,
    selectedStrategy: strategy.selectedStrategy,
    axisScores: strategy.axisScores,
    weights: strategy.weights,
    confidence: strategy.confidence,
    gateStatus,
    gateRiskLevel,
    spaceType: 'reception',
    status: runJson.status,
    durationMs: Date.now() - imageStartedAt,
    imageBytes,
    blockCount: compiled.blockCount,
    characterCount: compiled.characterCount,
    reason: strategy.reason,
    imagePath: copiedImagePath,
    assetContract: {
      references: assetContract.references,
      lockedAssetIds: assetContract.lockedAssetIds,
      lockedFacts: assetContract.lockedFacts,
      detection: assetContract.detection,
    },
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

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Run 3 brands sequentially
  const allResults: BrandRunResult[] = [];
  for (const brand of brandKeys) {
    try {
      const r = await runOneBrand(brand, imageGeneration, dataPath, projects);
      allResults.push(r);
      logProgress('scene_complete', {
        brandKey: brand,
        runId: r.imagePath,
        status: r.status,
        durationMs: r.durationMs,
        imageBytes: r.imageBytes,
        selectedStrategy: r.selectedStrategy,
      });
    } catch (err) {
      const failed: BrandRunResult = {
        brandKey: brand,
        industry: '?',
        selectedStrategy: '?',
        axisScores: { brand: 0, architecture: 0, reference: 0 },
        weights: { brand: 0, architecture: 0, reference: 0, industry: 0 },
        confidence: { industry: 0, asset: 0, color: 0, motif: 0, narrative: 0, total: 0 },
        gateStatus: '?',
        gateRiskLevel: '?',
        spaceType: 'reception',
        status: 'failed',
        durationMs: 0,
        imageBytes: null,
        blockCount: 0,
        characterCount: 0,
        reason: '',
        imagePath: null,
        assetContract: null,
        errorMessage: (err as Error).message,
      };
      allResults.push(failed);
      logProgress('scene_failed', { brandKey: brand, error: failed.errorMessage });
    }
  }

  // Per-brand run.json + report.md
  for (const r of allResults) {
    const brandDir = path.join(VALIDATION_ROOT, r.brandKey);
    await fs.mkdir(brandDir, { recursive: true });
    await fs.writeFile(
      path.join(brandDir, 'run.json'),
      JSON.stringify(r, null, 2),
      'utf8',
    );

    let md = `# Phase 9C.2 v2 — ${r.brandKey} (${r.industry}) Auto-Strategy Validation\n\n`;
    md += `- **Generated**: ${new Date().toISOString()}\n`;
    md += `- **Brand**: ${r.brandKey} (${r.industry})\n`;
    md += `- **Project**: ${BRAND_PROJECT_ENV_MAP[r.brandKey]}\n`;
    md += `- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro)\n`;
    md += `- **Size**: ${imageSize} (16:9)\n`;
    md += `- **Status**: ${r.status}\n`;
    md += `- **Duration**: ${r.durationMs}ms\n`;
    md += `- **Image bytes**: ${r.imageBytes ?? 'n/a'}\n`;
    md += `- **Block count**: ${r.blockCount}\n`;
    md += `- **Char count**: ${r.characterCount}\n`;
    md += `- **Has reference image**: ${r.brandKey === 'jiuzhou-aesthetics' ? 'yes (JZMX-ARCH-01)' : 'no'}\n`;
    md += `- **9C.0.5 gate status**: ${r.gateStatus} (risk=${r.gateRiskLevel})\n`;
    md += `\n## Auto-selected Spatial Strategy\n\n`;
    md += `- **Strategy**: \`${r.selectedStrategy}\`\n`;
    md += `- **Reason**: ${r.reason}\n`;
    md += `- **3-axis scores**: brand=${r.axisScores.brand.toFixed(2)} / arch=${r.axisScores.architecture.toFixed(2)} / ref=${r.axisScores.reference.toFixed(2)}\n`;
    md += `- **Strategy weights**: brand=${(r.weights.brand*100).toFixed(0)}% / arch=${(r.weights.architecture*100).toFixed(0)}% / ref=${(r.weights.reference*100).toFixed(0)}% / industry=${(r.weights.industry*100).toFixed(0)}%\n`;
    md += `\n## Brand Identity Confidence (5 indicators, 0-100)\n\n`;
    md += `| Indicator | Weight | Score | Weighted |\n`;
    md += `| --- | --- | --- | --- |\n`;
    md += `| Industry Match | 30 | ${r.confidence.industry.toFixed(2)} | ${(r.confidence.industry*30).toFixed(1)} |\n`;
    md += `| Asset Preservation | 25 | ${r.confidence.asset.toFixed(2)} | ${(r.confidence.asset*25).toFixed(1)} |\n`;
    md += `| Color Match | 15 | ${r.confidence.color.toFixed(2)} | ${(r.confidence.color*15).toFixed(1)} |\n`;
    md += `| Motif Match | 15 | ${r.confidence.motif.toFixed(2)} | ${(r.confidence.motif*15).toFixed(1)} |\n`;
    md += `| Narrative Match | 15 | ${r.confidence.narrative.toFixed(2)} | ${(r.confidence.narrative*15).toFixed(1)} |\n`;
    md += `| **Total** | **100** | | **${r.confidence.total}** |\n`;
    md += `\n## Image Output\n\n`;
    md += `- **Output**: \`${r.imagePath}\`\n`;
    md += `- **Validation artifact**: \`${path.join(brandDir, 'image.png')}\`\n`;
    if (r.assetContract) {
      const ac = r.assetContract;
      md += `\n## Asset Contract (V5 production parity)\n\n`;
      md += `- **Reference count**: ${ac.references.length}\n`;
      if (ac.references.length > 0) {
        md += `- **References**:\n`;
        for (const ref of ac.references) {
          md += `  - \`${ref.id}\` → role=\`${ref.role}\` path=\`${ref.projectRelativePath}\`\n`;
        }
      }
      md += `- **Locked asset ids**: ${ac.lockedAssetIds.all.length} total (logo=${ac.lockedAssetIds.logoAssetIds.length} / structure=${ac.lockedAssetIds.structuralAssetIds.length} / dna=${ac.lockedAssetIds.dnaTokens.length})\n`;
      md += `  ${ac.lockedAssetIds.all.length > 0 ? '`' + ac.lockedAssetIds.all.join('`, `') + '`' : '(none)'}\n`;
      md += `- **Locked facts**: ${ac.lockedFacts.length} total\n`;
      if (ac.lockedFacts.length > 0) {
        for (const f of ac.lockedFacts) md += `  - ${f}\n`;
      }
      md += `- **Detection**:\n`;
      md += `  - logoSource: ${ac.detection.logoSource} (${ac.detection.logoCount} logos)\n`;
      md += `  - structureSource: ${ac.detection.structureSource} (${ac.detection.structureCount} anchors)\n`;
      md += `  - dnaTokens: ${ac.detection.literalAssetTokenCount}, prohibitions: ${ac.detection.prohibitionCount}\n`;
    } else {
      md += `\n## Asset Contract\n\n- (no assetContract in skip path; see previous run.json)\n`;
    }
    if (r.errorMessage) md += `\n## Error\n\n\`${r.errorMessage}\`\n`;
    await fs.writeFile(path.join(brandDir, 'report.md'), md, 'utf8');
  }

  // Integrated report
  const allSucceeded = allResults.every((r) => r.status === 'succeeded');
  const lines: string[] = [];
  lines.push(`# Phase 9C.2 v2 — Brand Identity Validation & Spatial Strategy Auto-Selection\n`);
  lines.push(`- **Generated**: ${new Date().toISOString()}`);
  lines.push(`- **Phase**: 9C.2 v2 — Brand Identity Confidence + Spatial Strategy Selection`);
  lines.push(`- **Provider**: ${imageProfileId} (image, volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628)`);
  lines.push(`- **Aspect ratio**: 16:9 (1024x576)`);
  lines.push(`- **Brands tested**: ${brandKeys.length} (${brandKeys.join(', ')})`);
  lines.push(`- **Strategy**: Auto-selected by Phase 9C.2 v2 selectSpatialStrategy()`);
  lines.push(`- **All succeeded**: ${allSucceeded ? '✓' : '✗'}`);
  lines.push(`- **Output dir**: ${OUTPUT_DIR}`);
  lines.push('');
  lines.push(`## Per-Brand Summary\n`);
  lines.push(`| Brand | Industry | Strategy | Confidence | Status | Duration | Image |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
  for (const r of allResults) {
    lines.push(`| ${r.brandKey} | ${r.industry} | ${r.selectedStrategy} | ${r.confidence.total}/100 | ${r.status} | ${r.durationMs}ms | ${r.imagePath ?? '—'} |`);
  }
  lines.push('');
  lines.push(`## Per-Brand Confidence Breakdown\n`);
  for (const r of allResults) {
    lines.push(`### ${r.brandKey} (${r.industry}) — ${r.selectedStrategy}\n`);
    lines.push(`- **Reason**: ${r.reason}`);
    lines.push(`- **Strategy weights**: brand=${(r.weights.brand*100).toFixed(0)}% / arch=${(r.weights.architecture*100).toFixed(0)}% / ref=${(r.weights.reference*100).toFixed(0)}% / industry=${(r.weights.industry*100).toFixed(0)}%`);
    lines.push(`- **Confidence**: industry=${r.confidence.industry.toFixed(2)} / asset=${r.confidence.asset.toFixed(2)} / color=${r.confidence.color.toFixed(2)} / motif=${r.confidence.motif.toFixed(2)} / narrative=${r.confidence.narrative.toFixed(2)} → **total=${r.confidence.total}/100**`);
    lines.push(`- **Image**: \`${r.imagePath}\` (${r.imageBytes ?? '?'} bytes, ${r.durationMs}ms)`);
    lines.push('');
  }
  lines.push(`## Doc §9 Acceptance Check\n`);
  lines.push(`- [${allResults.find((r) => r.brandKey === 'wa-ye')?.status === 'succeeded' ? 'x' : ' '}] **WAYE** image generated (post 9C.0.5 DNA correction, auto brand_driven strategy)`);
  lines.push(`- [${allResults.find((r) => r.brandKey === 'jiuzhou-aesthetics')?.status === 'succeeded' ? 'x' : ' '}] **九州美学** image generated (auto reference_driven with JZMX-ARCH-01 ref)`);
  lines.push(`- [${allResults.find((r) => r.brandKey === 'feng-tang-tang')?.status === 'succeeded' ? 'x' : ' '}] **冯烫烫** image generated (auto balanced)`);
  lines.push(``);
  lines.push(`## V5 Production Asset Contract Parity\n`);
  lines.push(`| Brand | Logo refs | Structure refs | Total refs | DNA tokens | Locked facts |\n`);
  lines.push(`| --- | --- | --- | --- | --- | --- |\n`);
  for (const r of allResults) {
    if (r.assetContract) {
      const ac = r.assetContract;
      // Count references by role for clarity
      const logoRefs = ac.references.filter((ref) => ref.role === 'identity_reference').length;
      const structRefs = ac.references.filter((ref) => ref.role === 'structure_reference').length;
      const totalRefs = ac.references.length;
      lines.push(`| ${r.brandKey} | ${logoRefs} | ${structRefs} | ${totalRefs} | ${ac.lockedAssetIds.dnaTokens.length} | ${ac.lockedFacts.length} |`);
    } else {
      lines.push(`| ${r.brandKey} | - | - | - | - | - |`);
    }
  }
  lines.push('');
  lines.push(`## Per-Brand Manual Verification\n`);
  lines.push(`Per doc §9 acceptance:\n`);
  lines.push(`- **WAYE**: 必须恢复 青蛙IP / 紫绿黄体系 / 餐饮属性 / 潮流品牌语言. 禁止 体育零售空间.`);
  lines.push(`- **九州美学**: 保持 建筑高级感 / 东方气质 / 医美属性.`);
  lines.push(`- **冯烫烫**: 保持 餐饮真实性 / 品牌视觉.\n`);
  lines.push(`查看各 brand 的 image 跟 report.md 自行核对:`);
  for (const b of brandKeys) {
    lines.push(`- \`${path.join(VALIDATION_ROOT, b, 'image.png')}\``);
  }
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.md'), lines.join('\n'), 'utf8');

  logProgress('done', { allSucceeded, results: allResults.length });

  process.exit(allSucceeded ? 0 : 1);
}

main().catch((err: any) => {
  process.stderr.write(`PHASE 9C.2 v2 SPATIAL VALIDATION FAILED: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
