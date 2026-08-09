import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { VisualDecisionPacket } from '@masterpiece/project-contracts/index.ts';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';
import { createPipelineService } from '../src/main/pipeline-service.ts';
import { createProjectContextService } from '../src/main/project-context-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';
import { validateVisualDecisionPacket } from '../src/main/visual-decision-packet.ts';

const configuredProjectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const sourcePath = process.env.MASTERPIECE_SMOKE_SOURCE_PATH?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const reuseAnalysis = process.env.MASTERPIECE_SMOKE_REUSE_ANALYSIS === '1';
const dryRun = process.env.MASTERPIECE_SMOKE_DRY_RUN === '1';
const generationBasis = process.env.MASTERPIECE_SMOKE_GENERATION_BASIS === 'reference_first'
  ? 'reference_first'
  : 'standard';
const deliverableFamily = process.env.MASTERPIECE_SMOKE_DELIVERABLE === 'packaging'
  ? 'packaging'
  : 'space';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

function result(value: unknown): void {
  process.stdout.write(`VISUAL_DECISION_SMOKE_RESULT ${JSON.stringify(value)}\n`);
}

async function main(): Promise<void> {
  if ((!configuredProjectId && !sourcePath) || !textProfileId || (!dryRun && !imageProfileId)) {
    throw new Error(
      '缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_TEXT_PROFILE_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID。',
    );
  }

  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const projectId = configuredProjectId || (await projects.create({
    sourcePaths: [sourcePath],
    apiProfileId: textProfileId,
  })).id;
  const pipeline = createPipelineService(
    projects,
    getProviderCredentials,
    getSettings,
    (progress) => {
      process.stdout.write(`VISUAL_DECISION_SMOKE_PROGRESS ${JSON.stringify({
        kind: 'analysis',
        stage: progress.stage,
        elapsedMs: progress.elapsedMs,
        model: progress.model,
      })}\n`);
    },
  );

  const analysisStartedAt = Date.now();
  const projectPaths = await projects.paths(projectId);
  const analysis = reuseAnalysis
    ? await projects.get(projectId).then((project) => {
      if (project.status !== 'completed' || !project.lastReportFilename) {
        throw new Error('请求复用分析结果，但项目没有可复用的最终报告。');
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
  const analysisDurationMs = Date.now() - analysisStartedAt;
  const packetPath = path.join(projectPaths.root, 'project-context', 'visual-decision-packet.json');
  const packet = JSON.parse(await fs.readFile(packetPath, 'utf8')) as VisualDecisionPacket;
  const packetValidation = validateVisualDecisionPacket(packet);
  if (
    !packetValidation.valid
    || packet.validation.hardFactStatus !== 'pass'
    || packet.validation.executionDataStatus !== 'ready'
  ) {
    throw new Error(`Visual Decision Packet 未通过正式生成门：${JSON.stringify({
      packetValidation,
      validation: packet.validation,
    })}`);
  }

  const projectContext = createProjectContextService({ projects });
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress) => {
      process.stdout.write(`VISUAL_DECISION_SMOKE_PROGRESS ${JSON.stringify({
        kind: 'image',
        status: progress.status,
        elapsedMs: progress.elapsedMs,
        model: progress.modelId,
      })}\n`);
    },
  });
  const vnext = createVNextImageGenerationService(
    projects,
    projectContext,
    () => imageGeneration,
  );
  const brandName = packet.projectFacts.brandName.value;
  const brandRole = packet.projectFacts.brandRole.value === 'unknown'
    ? ''
    : packet.projectFacts.brandRole.value;
  const packaging = packet.mediaTranslations.packaging;
  const primaryPackagingStructure = packaging.structureStrategy[0]?.structure || '';
  const explicitReferenceAsset = generationBasis === 'reference_first'
    ? analysis.project.assets.find((asset) => /^image\//u.test(asset.mimeType))
      ?? analysis.project.assets.find((asset) => /\.(?:png|jpe?g|webp)$/iu.test(asset.relativePath))
    : null;
  if (generationBasis === 'reference_first' && !explicitReferenceAsset) {
    throw new Error('Reference-First smoke requires one explicit project image asset.');
  }
  const compilation = await vnext.compile({
    projectId,
    model: 'seedream-5.0-pro',
    task: deliverableFamily === 'packaging'
      ? {
        deliverableFamily: 'packaging',
        subtype: 'gift_set',
        shot: 'open_box',
        count: 1,
        aspectRatio: '4:3',
        currentInstruction: [
          `生成${brandName}${brandRole ? `作为${brandRole}` : ''}的产品包装效果图。`,
          primaryPackagingStructure
            ? `以 Visual Decision Packet 中有证据的“${primaryPackagingStructure}”作为主包装结构，呈现打开状态及内部组织。`
            : '',
          '只生成一套完整、可生产的包装产品摄影，不扩展为随机 VI 物料合集。',
        ].join(''),
        mustInclude: [
          '清楚可读的包装结构、开合逻辑与内部组织',
          '具有真实厚度、折边、接缝、内托和表面工艺的可生产包装',
          '由当前项目资产抽象而来的品牌识别关系',
        ],
        mustAvoid: [
          '空间效果图',
          'VI 展示板',
          '多格拼贴',
          '无结构的平面贴图',
          '随机构造的 Logo、品牌文字或 slogan',
        ],
        referenceAssetIds: [],
      }
      : {
        deliverableFamily: 'space',
        generationBasis,
        subtype: 'reception',
        shot: 'entrance_three_quarter_wide',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: [
          `生成${brandName}${brandRole ? `作为${brandRole}` : ''}的品牌体验与接待空间效果图。`,
          '从入口向内部观看，采用视平线高度的单一广角透视，清楚呈现到达、接待、等候与后方空间的连续关系。',
          '品牌视觉、结构、色彩、材料与光线必须完全服从本次 Visual Decision Packet，不补写未被项目证据支持的行业风格。',
        ].join(''),
        mustInclude: [
          '入口、接待与等候的空间层次',
          '具有真实厚度、接缝、边缘和物理响应的可建造材料',
          '由当前项目资产抽象而来的品牌识别关系',
        ],
        mustAvoid: [
          'VI 展示板',
          '多格拼贴',
          '脱离项目证据的行业模板',
          '随机构造的 Logo、品牌文字或 slogan',
        ],
        referenceAssetIds: explicitReferenceAsset ? [explicitReferenceAsset.id] : [],
      },
  });

  const prompt = compilation.compiledPrompt.finalPrompt;
  const effectivePacket = compilation.compiledPrompt.effectiveVisualDecisionPacket || packet;
  const sharedSignalGroups = [
    { id: 'brand', alternatives: [brandName] },
    { id: 'industry', alternatives: [packet.projectFacts.industry.value] },
    { id: 'brand-role', alternatives: [brandRole] },
    { id: 'logo-policy', alternatives: ['Logo', 'logo asset'] },
  ];
  const deliverableSignalGroups = deliverableFamily === 'packaging'
    ? [
      { id: 'packaging-concept', alternatives: [packaging.packagingConcept] },
      { id: 'packaging-structure', alternatives: packaging.structureStrategy.map((item) => item.structure) },
      { id: 'opening-experience', alternatives: packaging.openingExperience },
      { id: 'product-arrangement', alternatives: packaging.productArrangement },
      { id: 'substrate-language', alternatives: packaging.substrateLanguage },
      { id: 'craft-language', alternatives: packaging.craftLanguage.map((item) => item.craft) },
      { id: 'nonliteral-translation', alternatives: packaging.graphicTranslation
        .flatMap((item) => item.forbiddenLiteralUse) },
      { id: 'packaging-color', alternatives: [
        ...packaging.colorBehavior.base,
        ...packaging.colorBehavior.identity,
        ...packaging.colorBehavior.accent,
      ] },
      { id: 'packaging-photography', alternatives: packaging.photographyDirection },
    ]
    : [
      // The frozen Space compiler deliberately rewrites strategy and motif
      // source text into architecture-safe semantics. Do not require those raw
      // phrases to survive verbatim; route integrity verifies the corresponding
      // architecture-first and brand-translation blocks structurally.
      { id: 'spatial-concept', alternatives: [effectivePacket.mediaTranslations.spatial.spatialConcept] },
    ];
  const requiredPromptSignalGroups = [...sharedSignalGroups, ...deliverableSignalGroups]
    .filter((group) => group.alternatives.some((value) => Boolean(value?.trim())));
  const missingPromptSignals = requiredPromptSignalGroups
    .filter((group) => !group.alternatives.some((signal) => prompt.includes(signal)))
    .map((group) => group.id);
  if (missingPromptSignals.length || compilation.compiledPrompt.completeness.conflictCount) {
    throw new Error(`自动 Prompt 回溯失败：${JSON.stringify({
      missingPromptSignals,
      conflictCount: compilation.compiledPrompt.completeness.conflictCount,
    })}`);
  }
  if (dryRun) {
    if (compilation.compiledPrompt.preflightReport?.status !== 'pass') {
      throw new Error(`dry-run preflight 未通过：${JSON.stringify(
        compilation.compiledPrompt.preflightReport,
      )}`);
    }
    result({
      userAuthorized: true,
      dryRun: true,
      projectId,
      taskId: compilation.taskContract.taskId,
      artifactDirectory: compilation.artifactDirectory,
      promptCharacters: [...prompt].length,
      missingPromptSignals,
      preflightReport: compilation.compiledPrompt.preflightReport,
      logoUsageMode: compilation.taskContract.logoUsageMode,
      referenceAssetIds: compilation.taskContract.referenceAssetIds,
      generationBasis: compilation.taskContract.generationBasis,
      spaceGeneration: (compilation.compiledPrompt.trace as unknown as {
        spaceGeneration?: Record<string, unknown>;
      }).spaceGeneration,
    });
    return;
  }

  const imageStartedAt = Date.now();
  const imageRun = await vnext.start({
    projectId,
    taskId: compilation.taskContract.taskId,
    apiProfileId: imageProfileId,
  });
  const runRoot = await imageGeneration.runRoot(imageRun.runId);
  const runtimeReport = JSON.parse(
    await fs.readFile(analysis.runtimeReportPath, 'utf8'),
  ) as { modelCallsThisRun?: number; modelCallCount?: number; modelCalls?: unknown[] };
  const report = await fs.readFile(analysis.reportPath, 'utf8');
  const persistedTrace = JSON.parse(
    await fs.readFile(path.join(compilation.artifactDirectory, 'trace.json'), 'utf8'),
  ) as { spaceGeneration?: Record<string, unknown> };

  result({
    userAuthorized: true,
    projectId,
    projectName: analysis.project.projectName,
    deliverableFamily,
    analysis: {
      provider: analysis.provider,
      model: analysis.model,
      status: analysis.project.status,
      modelCallCount: runtimeReport.modelCallsThisRun
        ?? runtimeReport.modelCallCount
        ?? (Array.isArray(runtimeReport.modelCalls) ? runtimeReport.modelCalls.length : 1),
      durationMs: analysisDurationMs,
      reportPath: analysis.reportPath,
      runtimeReportPath: analysis.runtimeReportPath,
      packetPath,
      composition: {
        sourceFactTags: (report.match(/\[Source Fact\]/gu) ?? []).length,
        diagnosisTags: (report.match(/\[AI Diagnosis\]/gu) ?? []).length,
        creativeProposalTags: (report.match(/\[Creative Proposal\]/gu) ?? []).length,
        abstractionCount: packet.abstractions.length,
        spatialStatus: packet.mediaTranslations.spatial.status,
        packagingStatus: packet.mediaTranslations.packaging.status,
      },
      validation: packet.validation,
    },
    prompt: {
      taskId: compilation.taskContract.taskId,
      artifactDirectory: compilation.artifactDirectory,
      promptCharacters: [...prompt].length,
      requiredSignalCount: requiredPromptSignalGroups.length,
      missingPromptSignals,
      completeness: compilation.compiledPrompt.completeness,
      preflightReport: compilation.compiledPrompt.preflightReport,
      logoUsageMode: compilation.taskContract.logoUsageMode,
      referenceAssetIds: compilation.taskContract.referenceAssetIds,
      generationBasis: compilation.taskContract.generationBasis,
      spaceGeneration: persistedTrace.spaceGeneration,
    },
    image: {
      provider: imageRun.providerId,
      model: imageRun.modelId,
      status: imageRun.status,
      modelCallCount: 1,
      durationMs: Date.now() - imageStartedAt,
      runId: imageRun.runId,
      runRoot,
      imagePaths: imageRun.images.map((image) => path.join(runRoot || '', image.relativePath)),
    },
  });

  if (
    analysis.project.status !== 'completed'
    || imageRun.status !== 'succeeded'
    || !imageRun.images.length
  ) {
    throw new Error(
      `真实 Provider 验收未完成：analysis=${analysis.project.status}, image=${imageRun.status}`,
    );
  }
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error
      ? { name: error.name, message: error.message, ...Object.fromEntries(Object.entries(error)) }
      : { message: String(error) };
    process.stderr.write(`VISUAL_DECISION_SMOKE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
