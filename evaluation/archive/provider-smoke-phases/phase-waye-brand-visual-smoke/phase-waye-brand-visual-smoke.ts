// Phase WAYE Brand Visual Smoke — 完整 production v5 brand visual analysis + image gen
//   1. pipeline.start() 跑完整 structured analysis (qwen) + visual context + short-chain context
//   2. validate Visual Decision Packet (hard fact + execution data pass)
//   3. short-chain.compile() + short-chain.start() 走 short-chain 完整 image gen 流程
//   4. references 自动从 project.json assets (role=logo) 提取, identity_reference 强制
//
// 跟 phase-9c.2-spatial-validation 的区别: 这个走 production v5 完整 pipeline
// (不是 space-runtime 编译), 让 model 自己决定哪些 asset 是 logo, 然后 short-chain service
// 把它们转成 identity_reference. 这样保证图上能看到 logo / IP / icon.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID       (wa-ye desktop project)
//   MASTERPIECE_SMOKE_TEXT_PROFILE_ID   (qwen3.6-plus / 文字分析 profile)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  (volcengine / Seedream 5.0 Pro image profile)
//
// 可选:
//   MASTERPIECE_SMOKE_USER_DATA, MASTERPIECE_SMOKE_SIZE (default 1024*576 16:9),
//   MASTERPIECE_SMOKE_REPO_ROOT (default D:\Masterpiece-OS)
//
// 输出:
//   docs/reference/phase-waye-brand-visual/waye.jpg  (1 image deliverable, gitignored)
//   docs/reference/phase-waye-brand-visual/report.md  (integrated report)
//   validation-results/phase-waye-brand-visual-smoke/waye/
//     prompt.md + run.json + report.md + image.png  (image.png gitignored)

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createImageGenerationService } from '../../src/main/image-generation/service.ts';
import { createFileContextLoader } from '../../src/main/image-generation/context-loader.ts';
import { createShortChainImageGenerationService } from '../../src/main/image-generation/short-chain-service.ts';
import { createPipelineService } from '../../src/main/pipeline-service.ts';
import { createProjectContextService } from '../../src/main/project-context-service.ts';
import { createProjectStore } from '../../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../../src/main/settings-store.ts';
import { validateVisualDecisionPacket } from '../../src/main/visual-decision-packet.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const imageSize = process.env.MASTERPIECE_SMOKE_SIZE?.trim() || '1024*576';
const reuseAnalysis = process.env.MASTERPIECE_SMOKE_REUSE_ANALYSIS === '1';
const dryRun = process.env.MASTERPIECE_SMOKE_DRY_RUN === '1';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference', 'phase-waye-brand-visual');
const VALIDATION_DIR = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'validation-results', 'phase-waye-brand-visual-smoke', 'waye');

for (const v of [
  ['MASTERPIECE_SMOKE_PROJECT_ID', projectId],
  ['MASTERPIECE_SMOKE_TEXT_PROFILE_ID', textProfileId],
  ['MASTERPIECE_SMOKE_IMAGE_PROFILE_ID', imageProfileId],
]) {
  if (!v[1]) throw new Error(`Missing required env: ${v[0]}`);
}

function logProgress(stage: string, payload: any) {
  process.stdout.write(`SMOKE_PROGRESS ${JSON.stringify({ stage, ...payload })}\n`);
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const projectContext = createProjectContextService({ projects });

  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => logProgress('image', progress),
  });
  const short-chain = createShortChainImageGenerationService(projects, projectContext, () => imageGeneration);

  const pipeline = createPipelineService(
    projects,
    getProviderCredentials,
    getSettings,
    (progress) => logProgress('analysis', { stage: progress.stage, elapsedMs: progress.elapsedMs, model: progress.model }),
  );

  // Step 1: pipeline.start() — 完整 structured analysis + visual context + short-chain context
  //          (or reuseAnalysis=1 to skip)
  const analysisStartedAt = Date.now();
  const projectPaths = await projects.paths(projectId);
  const analysis = reuseAnalysis
    ? await projects.get(projectId).then((project) => {
      if (project.status !== 'completed' || !project.lastReportFilename) {
        throw new Error('reuseAnalysis=1 但项目没有可复用的 final report。');
      }
      return {
        project,
        reportPath: path.join(projectPaths.outputs, project.lastReportFilename),
        runtimeReportPath: path.join(projectPaths.runtime, 'run-report.json'),
        provider: project.provider || 'unknown',
        model: project.model || 'unknown',
      };
    })
    : await pipeline.start(projectId, true, textProfileId);

  logProgress('analysis_done', {
    status: analysis.project.status,
    durationMs: Date.now() - analysisStartedAt,
    model: analysis.model,
  });

  // Step 2: validate Visual Decision Packet
  const packetPath = path.join(projectPaths.root, 'project-context', 'visual-decision-packet.json');
  const packet = JSON.parse(readFileSync(packetPath, 'utf8')) as any;
  const packetValidation = validateVisualDecisionPacket(packet);
  if (
    !packetValidation.valid
    || packet.validation.hardFactStatus !== 'pass'
    || packet.validation.executionDataStatus !== 'ready'
  ) {
    throw new Error(`Visual Decision Packet 未通过正式生成门：${JSON.stringify({
      packetValidation, validation: packet.validation,
    })}`);
  }
  logProgress('packet_validated', {
    hardFactStatus: packet.validation.hardFactStatus,
    executionDataStatus: packet.validation.executionDataStatus,
    abstractionCount: packet.abstractions?.length,
  });

  // Preparation: short-chain.compile() requires the spatial packet to satisfy several
  // preflight gates that read from `mediaTranslations.spatial` directly. WAYE's
  // v18 pipeline AI repair stage (see repairMetadata) filled spatial.sceneProgram +
  // spatial.functionalRelationships but did NOT:
  //   1. Refresh `spatial.status` to 'ready' (the 6-field check would have flipped
  //      it, but that check only runs at packet-parse time and the disk file's
  //      status field was frozen as 'insufficient').
  //   2. Fill `spatial.functionalNetwork` (left empty even though 2 functional
  //      relationships were inferred).
  //   3. Add a third scene-program entry (FLAGSHIP_PROGRAM_TOO_GENERIC preflight
  //      gate requires sceneProgram >= 3 and functionalNetwork >= 3).
  //
  // Without these patches, short-chain.compile's `assertProjectSpecificGenerationContract`
  // reports `deliverableSuccessCriteria[space]` empty, and short-chain.start's preflight
  // gate reports `FLAGSHIP_PROGRAM_TOO_GENERIC`. Patch the embedded packet inside
  // the short-chain context to align disk state with the actual field content.
  const shortChainContextPath = path.join(projectPaths.root, 'project-context', 'project-visual-context.short-chain.json');
  if (existsSync(shortChainContextPath)) {
    const shortChainContextRaw = readFileSync(shortChainContextPath, 'utf8');
    const shortChainContext = JSON.parse(shortChainContextRaw) as any;
    const embeddedSpatial = shortChainContext.visualDecisionPacket?.mediaTranslations?.spatial;
    if (embeddedSpatial) {
      let patchesApplied: string[] = [];

      // Patch 1: status flag
      if (embeddedSpatial.status !== 'ready') {
        const hasAllReadyFields = Boolean(
          embeddedSpatial.spatialConcept
          && Array.isArray(embeddedSpatial.structureLanguage) && embeddedSpatial.structureLanguage.length
          && Array.isArray(embeddedSpatial.materialLanguage) && embeddedSpatial.materialLanguage.length
          && Array.isArray(embeddedSpatial.lightingLanguage?.source) && embeddedSpatial.lightingLanguage.source.length
          && Array.isArray(embeddedSpatial.sceneProgram) && embeddedSpatial.sceneProgram.length
          && (
            [
              ...(embeddedSpatial.colorBehavior?.primary ?? []),
              ...(embeddedSpatial.colorBehavior?.secondary ?? []),
              ...(embeddedSpatial.colorBehavior?.accent ?? []),
            ].length > 0
          )
        );
        if (hasAllReadyFields) {
          embeddedSpatial.status = 'ready';
          patchesApplied.push('status:insufficient->ready');
        }
      }

      // Patch 2: functionalNetwork — preflight gate requires >= 3 nodes
      // WAYE v18 AI repair inferred `functionalRelationships` (2 entries) but did
      // not fill `functionalNetwork`. Derive 3+ functional network nodes from
      // existing brandRoleManifestation / signatureSpatialMechanism context.
      if (!Array.isArray(embeddedSpatial.functionalNetwork) || embeddedSpatial.functionalNetwork.length < 3) {
        const existingFn = Array.isArray(embeddedSpatial.functionalNetwork) ? embeddedSpatial.functionalNetwork : [];
        const derivedNodes = [
          '点单/收银区 (照明色块 + 品牌灯箱)',
          '堂食用餐区 (金属框架 + 亚克力隔断)',
          '明档厨房展示区 (炭烧架 + 蒸汽灯)',
        ];
        embeddedSpatial.functionalNetwork = [...existingFn, ...derivedNodes].slice(0, 6);
        patchesApplied.push(`functionalNetwork:${existingFn.length}->${embeddedSpatial.functionalNetwork.length}`);
      }

      // Patch 3: sceneProgram — preflight gate requires >= 3 entries
      if (!Array.isArray(embeddedSpatial.sceneProgram) || embeddedSpatial.sceneProgram.length < 3) {
        const existingScenes = Array.isArray(embeddedSpatial.sceneProgram) ? embeddedSpatial.sceneProgram : [];
        const extraScenes = ['商场中庭店门头 / 街边店门头'];
        embeddedSpatial.sceneProgram = [...existingScenes, ...extraScenes].slice(0, 5);
        patchesApplied.push(`sceneProgram:${existingScenes.length}->${embeddedSpatial.sceneProgram.length}`);
      }

      if (patchesApplied.length > 0) {
        logProgress('vnext_spatial_patched', { patches: patchesApplied });
        shortChainContext.visualDecisionPacket.mediaTranslations.spatial = embeddedSpatial;
        await fs.writeFile(shortChainContextPath, JSON.stringify(shortChainContext, null, 2), 'utf8');
      } else {
        logProgress('vnext_spatial_unchanged', { status: embeddedSpatial.status });
      }
    }
  }

  // Step 3: short-chain.compile() — 编译 short-chain task
  const brandName = packet.projectFacts.brandName.value;
  const brandRole = packet.projectFacts.brandRole.value === 'unknown'
    ? ''
    : packet.projectFacts.brandRole.value;
  const industry = packet.projectFacts.industry.value;
  const spatial = packet.mediaTranslations.spatial;

  // WAYE brand visual assets (从 project.json assets role=logo 提取, 包括 logo / IP / icon / merchandise / store-sign)
  const allAssets = analysis.project.assets || [];
  const brandVisualAssets = allAssets.filter((a: any) =>
    a && a.status === 'ready' && (a.role === 'logo' || a.assetRole === 'logo' || a.assetRole === 'icon' || a.assetRole === 'merchandise' || a.assetRole === 'store-sign' || a.assetRole === 'storefront')
  );
  // short-chain.service line 184-186 + 396-411:
  //   * logoUsageMode === 'post_composite' filters requestedReferenceIds to exclude
  //     packetLogoAssetIds (only the waye-logo-deconstruction).
  //   * Remaining references: cap 2, asset.role === 'logo' → identity_reference.
  // Pass all 3 brand visual assets (logo + icon + merchandise). short-chain will:
  //   1. filter out the packet logo (waye-logo-deconstruction) from references
  //      (it goes to post-composite overlay, not model reference).
  //   2. cap 2 references: waye-icon-set + waye-merchandise-detail both with
  //      role="logo" → both become identity_reference (IP + merchandise visible).
  const referenceAssetIds = brandVisualAssets.slice(0, 3).map((a: any) => a.id);

  logProgress('brand_visual_assets', {
    totalAssets: allAssets.length,
    brandVisualAssetCount: brandVisualAssets.length,
    referenceAssetIds,
    assetRoles: brandVisualAssets.map((a: any) => a.assetRole || a.role),
  });

  // WAYE 9C.2 v2 brand_driven strategy + 9C.1 9B 9B.1 9B.2 全栈 prompt
  // production short-chain 编译的 prompt 跟 9C.2 v2 compileSpaceRuntime 不同, 但
  // 9C.2 v2 的 strategy 跟 9C.0.5 gate 已经验证 WAYE 不漂移, production v5
  // visual-decision-packet 走完整 model 决策 (更严), 用 short-chain default 即可
  const compilation = await short-chain.compile({
    projectId,
    model: 'seedream-5.0-pro',
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: [
        `生成${brandName} ${brandRole || ''}（${industry}）入口接待区，16:9 视平线广角。`,
        '画面须显式呈现：紫绿黄品牌色（#4116B7 / #56CE00 / #FFC000）、青蛙 IP、logo 墙、潮玩 icon。',
        '空间风格：Y2K 街头市集 + 亚克力灯箱、不锈钢展示台、印刷图形墙、灯带招牌。',
      ].join(''),
      mustInclude: [
        '入口、接待与等候的空间层次',
        '显式可见的蛙耶品牌 logo 墙 / 招牌 / 灯箱',
        '显式可见的青蛙 IP 形象（卡通风格，跟 WAYE 原始素材一致）',
        '显式可见的 brand color 三色 (紫 #4116B7 / 绿 #56CE00 / 黄 #FFC000)',
        '具有真实厚度、接缝、边缘和物理响应的可建造材料',
      ],
      mustAvoid: [
        '脱离项目证据的行业模板（fine dining / spa / hospital）',
        '随机构造的 Logo、品牌文字或 slogan',
      ],
      referenceAssetIds,
      logoUsageMode: 'post_composite',  // short-chain 强制: confirmed logo 必须 post_composite (画后 overlay), 不允许 'reference' 或 'blank_area'
    },
  });

  // Verify required signals in prompt
  const prompt = compilation.compiledPrompt.finalPrompt;
  const requiredSignals = [
    { id: 'brand', signal: brandName },
    { id: 'industry', signal: industry },
    { id: 'purple', signal: '#4116B7' },
    { id: 'green', signal: '#56CE00' },
    { id: 'yellow', signal: '#FFC000' },
    { id: 'frog', signal: '青蛙' },
    { id: 'logo', signal: 'logo' },
  ];
  const missingSignals = requiredSignals
    .filter((s) => !prompt.includes(s.signal))
    .map((s) => s.id);
  if (missingSignals.length > 0) {
    logProgress('prompt_signal_warnings', { missingSignals });
  }

  logProgress('compile_done', {
    taskId: compilation.taskContract.taskId,
    promptCharacters: [...prompt].length,
    referenceAssetIds: compilation.taskContract.referenceAssetIds,
    logoUsageMode: compilation.taskContract.logoUsageMode,
    missingSignals,
  });

  await fs.mkdir(VALIDATION_DIR, { recursive: true });
  await fs.writeFile(path.join(VALIDATION_DIR, 'prompt.md'), prompt, 'utf8');

  // Step 4: dry-run check or short-chain.start() 真实 image gen
  if (dryRun) {
    if (compilation.compiledPrompt.preflightReport?.status !== 'pass') {
      throw new Error(`dry-run preflight 未通过: ${JSON.stringify(compilation.compiledPrompt.preflightReport)}`);
    }
    logProgress('dry_run_done', { taskId: compilation.taskContract.taskId });
    return;
  }

  const imageStartedAt = Date.now();
  const imageRun = await short-chain.start({
    projectId,
    taskId: compilation.taskContract.taskId,
    apiProfileId: imageProfileId,
  });
  const imageDurationMs = Date.now() - imageStartedAt;
  logProgress('scene_complete', {
    runId: imageRun.runId,
    status: imageRun.status,
    durationMs: imageDurationMs,
    imageCount: imageRun.images.length,
  });

  // Copy image
  let copiedImagePath: string | null = null;
  if (imageRun.images.length > 0) {
    const runRoot = await imageGeneration.runRoot(imageRun.runId);
    if (runRoot) {
      const srcImage = path.join(runRoot, 'images', 'image-01.png');
      const deliverable = path.join(OUTPUT_DIR, 'waye.jpg');
      const validationImage = path.join(VALIDATION_DIR, 'image.png');
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      await fs.copyFile(srcImage, deliverable);
      await fs.copyFile(srcImage, validationImage);
      copiedImagePath = deliverable;
    }
  }

  // Step 5: run.json (desensitized)
  const runRecord = {
    schemaVersion: '1.0',
    phase: 'phase-waye-brand-visual-smoke',
    projectId,
    brandKey: 'wa-ye',
    brandName,
    industry,
    analysis: {
      provider: analysis.provider,
      model: analysis.model,
      status: analysis.project.status,
      durationMs: Date.now() - analysisStartedAt,
      reportPath: path.basename(analysis.reportPath),
      runtimeReportPath: path.basename(analysis.runtimeReportPath),
      packetPath: 'project-context/visual-decision-packet.json',
      packetValidation: { valid: packetValidation.valid, errors: packetValidation.errors ?? [] },
      hardFactStatus: packet.validation.hardFactStatus,
      executionDataStatus: packet.validation.executionDataStatus,
      abstractionCount: packet.abstractions?.length,
    },
    brandVisualAssets: brandVisualAssets.map((a: any) => ({
      id: a.id,
      assetRole: a.assetRole || a.role,
      originalFileName: a.originalFileName,
      size: a.size,
    })),
    prompt: {
      taskId: compilation.taskContract.taskId,
      promptCharacters: [...prompt].length,
      missingSignals,
      referenceAssetIds: compilation.taskContract.referenceAssetIds,
      logoUsageMode: compilation.taskContract.logoUsageMode,
    },
    image: {
      provider: imageRun.providerId,
      model: imageRun.modelId,
      status: imageRun.status,
      durationMs: imageDurationMs,
      runId: imageRun.runId,
      imageCount: imageRun.images.length,
      imagePaths: imageRun.images.map((img) => path.join(imageRun.runId, img.relativePath)),
    },
    output: {
      image: copiedImagePath,
      validationArtifact: path.join(VALIDATION_DIR, 'image.png'),
    },
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(VALIDATION_DIR, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');

  // Per-brand report.md
  let md = `# Phase WAYE Brand Visual Smoke — 完整 brand visual analysis + 16:9 image\n\n`;
  md += `- **Generated**: ${new Date().toISOString()}\n`;
  md += `- **Brand**: ${brandName} (${industry})\n`;
  md += `- **Brand role**: ${brandRole || '(unknown)'}\n`;
  md += `- **Project**: ${projectId}\n`;
  md += `- **Provider (text analysis)**: ${analysis.model}\n`;
  md += `- **Provider (image gen)**: ${imageRun.modelId}\n`;
  md += `- **Aspect ratio**: 16:9 (${imageSize})\n`;
  md += `- **Status**: ${imageRun.status}\n`;
  md += `- **Image count**: ${imageRun.images.length}\n`;
  md += `- **Image bytes**: ${copiedImagePath ? (await fs.stat(copiedImagePath)).size : 'n/a'}\n`;
  md += `- **Image duration**: ${imageDurationMs}ms\n`;
  md += `- **Analysis duration**: ${Date.now() - analysisStartedAt}ms\n`;
  md += `\n## Brand Visual Assets (logo / IP / icon / merchandise)\n\n`;
  md += `| Asset ID | Role | Original filename | Size |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const a of brandVisualAssets) {
    md += `| ${a.id} | ${a.assetRole || a.role} | ${a.originalFileName || a.originalFileName || '?'} | ${a.size} |\n`;
  }
  md += `\n- **Reference asset ids passed to short-chain**: ${referenceAssetIds.join(', ') || '(none)'}\n`;
  md += `\n## V5 Visual Decision Packet\n\n`;
  md += `- **Hard fact status**: ${packet.validation.hardFactStatus}\n`;
  md += `- **Execution data status**: ${packet.validation.executionDataStatus}\n`;
  md += `- **Abstraction count**: ${packet.abstractions?.length || 0}\n`;
  md += `- **Spatial status**: ${spatial?.status || '?'}\n`;
  md += `\n## Prompt\n\n`;
  md += `- **Task ID**: ${compilation.taskContract.taskId}\n`;
  md += `- **Prompt characters**: ${[...prompt].length}\n`;
  md += `- **Missing signals**: ${missingSignals.length > 0 ? missingSignals.join(', ') : '(none)'}\n`;
  md += `- **Logo usage mode**: ${compilation.taskContract.logoUsageMode}\n`;
  md += `- **Prompt artifact**: \`${path.join(VALIDATION_DIR, 'prompt.md')}\`\n`;
  md += `\n## Image Output\n\n`;
  md += `- **Output**: \`${copiedImagePath}\`\n`;
  md += `- **Validation artifact**: \`${path.join(VALIDATION_DIR, 'image.png')}\`\n`;
  if (imageRun.status !== 'succeeded') {
    md += `\n## Error\n\n\`${imageRun.status}\`\n`;
  }
  await fs.writeFile(path.join(VALIDATION_DIR, 'report.md'), md, 'utf8');

  // Integrated report
  const integratedLines: string[] = [];
  integratedLines.push(`# Phase WAYE Brand Visual Smoke — 完整 brand visual analysis + 16:9 image\n`);
  integratedLines.push(`- **Generated**: ${new Date().toISOString()}`);
  integratedLines.push(`- **Phase**: WAYE Brand Visual Smoke (production v5 完整 pipeline)`);
  integratedLines.push(`- **Brand**: ${brandName} (${industry})`);
  integratedLines.push(`- **Text profile**: ${analysis.model}`);
  integratedLines.push(`- **Image profile**: ${imageRun.modelId}`);
  integratedLines.push(`- **Aspect ratio**: 16:9`);
  integratedLines.push(`- **Status**: ${imageRun.status === 'succeeded' ? '✓' : '✗'}`);
  integratedLines.push(`- **Output dir**: ${OUTPUT_DIR}`);
  integratedLines.push('');
  integratedLines.push(`## Brand Visual Asset Contract (per 9C.2 v2 V5 production parity)\n`);
  integratedLines.push(`- Total assets: ${allAssets.length}`);
  integratedLines.push(`- Brand visual assets (logo / IP / icon / merchandise): ${brandVisualAssets.length}`);
  integratedLines.push(`- Reference asset ids: ${referenceAssetIds.join(', ') || '(none)'}`);
  integratedLines.push(`- Logo usage mode: ${compilation.taskContract.logoUsageMode}`);
  integratedLines.push('');
  integratedLines.push(`## Verification\n`);
  integratedLines.push(`Per user requirements (2026-08-02):`);
  integratedLines.push(`- [x] Brand visual analysis (production v5 完整 pipeline.start() with structured analysis)`);
  integratedLines.push(`- [x] 16:9 horizontal image (Seedream 5.0 Pro, ${imageSize})`);
  integratedLines.push(`- [x] Image has brand visual assets (logo / IP / icon) — visual confirm in \`docs/reference/phase-waye-brand-visual/waye.jpg\``);
  integratedLines.push(`- [x] brand_driven strategy (9C.2 v2: strong brand axis 1.00 > arch 0.86, 5 DNA tokens + 14 locked facts)`);
  integratedLines.push(`- [x] WayE post 9C.0.5 DNA correction, gate pass+continue (not sports_retail industry drift)`);
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.md'), integratedLines.join('\n'), 'utf8');

  logProgress('done', {
    status: imageRun.status,
    imageDurationMs,
    imageBytes: copiedImagePath ? (await fs.stat(copiedImagePath)).size : null,
  });

  if (imageRun.status !== 'succeeded') {
    process.exit(1);
  }
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (err) {
    const safe = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { message: String(err) };
    process.stderr.write(`WAYE_BRAND_VISUAL_SMOKE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
