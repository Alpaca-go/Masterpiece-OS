import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { VisualDecisionPacket } from '../../../packages/project-contracts/src/index.ts';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';
import { createPipelineService } from '../src/main/pipeline-service.ts';
import { createProjectContextService } from '../src/main/project-context-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';
import { validateVisualDecisionPacket } from '../src/main/visual-decision-packet.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const textProfileId = process.env.MASTERPIECE_SMOKE_TEXT_PROFILE_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const reuseAnalysis = process.env.MASTERPIECE_SMOKE_REUSE_ANALYSIS === '1';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

function result(value: unknown): void {
  process.stdout.write(`VISUAL_DECISION_SMOKE_RESULT ${JSON.stringify(value)}\n`);
}

async function main(): Promise<void> {
  if (!projectId || !textProfileId || !imageProfileId) {
    throw new Error(
      '缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_TEXT_PROFILE_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID。',
    );
  }

  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
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
  const compilation = await vnext.compile({
    projectId,
    model: 'seedream-5.0-pro',
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: [
        '生成九州美学高端医美全链生态平台的旗舰品牌体验与接待空间，不是单一消费型美容门店。',
        '从入口向内部观看，35mm 镜头、视平线高度、45 度单一透视；前景承担到达与等候/咨询，中景以半透明界面组织展示与分区，背景为克制接待识别和后方服务空间，并显示连续动线。',
        '把原视觉中的孔雀羽毛抽象为柔性层叠曲线、生长与精密秩序，分散融入隔断、曲面墙体、天花层次和光线过滤界面；禁止单一巨大羽毛雕塑、放大图标或打卡装置。',
        'Logo 仅小面积置于后方内部识别节点，不能位于顶部中央或成为门头主招牌。',
      ].join(''),
      mustInclude: [
        '接待、咨询、展示和品牌沟通中的至少两类复合功能',
        '前景、中景、背景和从入口前往后方的连续动线',
        '至少两个空间界面承担羽毛的分散式抽象转译',
        '具有真实厚度、接缝、边缘和透射行为的半透明生物组织结构',
      ],
      mustAvoid: [
        'VI 展示板',
        '多格拼贴',
        '普通美容院',
        '传统医院诊室',
        '茶空间',
        '生活方式零售店',
        '售楼处',
        '单一巨型羽毛雕塑或打卡装置',
        '顶部中央门头式 Logo 主招牌',
      ],
      referenceAssetIds: [],
    },
  });

  const prompt = compilation.compiledPrompt.finalPrompt;
  const requiredPromptSignalGroups = [
    { id: 'brand', alternatives: ['九州美学'] },
    { id: 'industry-role', alternatives: ['医美', '医疗美容'] },
    { id: 'cultural-worldview', alternatives: ['东方美学', '东方雅致', '文化根基', '传统符号'] },
    { id: 'professional-trust', alternatives: ['科学严谨', '医疗专业', '专业医美', '专业'] },
    { id: 'contemporary', alternatives: ['现代', '当代'] },
    { id: 'human-warmth', alternatives: ['人文温度', '美学温度', '温暖'] },
    { id: 'nonliteral-feather', alternatives: ['禁止照搬羽毛', '具象羽毛复制', '不得字面复制'] },
    { id: 'biomorphic-transparency', alternatives: ['半透明生物组织'] },
    { id: 'layered-curves', alternatives: ['柔性层叠曲线', '流线型曲线', '层叠结构'] },
    {
      id: 'white-purple-system',
      alternatives: [
        '孔雀紫',
        '九州紫',
        'Peacock Violet',
        '浅紫',
        '矿物紫',
        '珍珠白',
        '珠光白',
        '浅灰白',
        '暖白',
        '米灰',
      ],
    },
    { id: 'material-behavior', alternatives: ['微水泥', '磨砂玻璃', '哑光金属', '半透明织物'] },
    { id: 'lighting-behavior', alternatives: ['柔和漫反射', '自然光', '光线穿透'] },
    { id: 'logo-lock', alternatives: ['Logo', 'logo asset'] },
    { id: 'beauty-salon-misread', alternatives: ['普通美容院', '高端美容院'] },
    { id: 'clinic-misread', alternatives: ['传统医院诊室', '冷漠的临床感', '冰冷医疗'] },
    { id: 'adjacent-scene-misread', alternatives: ['艺术展览馆', '传统中式会所', '科技实验室', 'KTV', '夜店', '高档会所', '商业化的陈列'] },
  ];
  const missingPromptSignals = requiredPromptSignalGroups
    .filter((group) => !group.alternatives.some((signal) => prompt.includes(signal)))
    .map((group) => group.id);
  if (missingPromptSignals.length || compilation.compiledPrompt.completeness.conflictCount) {
    throw new Error(`自动 Prompt 回溯失败：${JSON.stringify({
      missingPromptSignals,
      conflictCount: compilation.compiledPrompt.completeness.conflictCount,
    })}`);
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

  result({
    userAuthorized: true,
    projectId,
    projectName: analysis.project.projectName,
    analysis: {
      provider: analysis.provider,
      model: analysis.model,
      status: analysis.project.status,
      modelCallCount: runtimeReport.modelCallsThisRun
        ?? runtimeReport.modelCallCount
        ?? (Array.isArray(runtimeReport.modelCalls) ? runtimeReport.modelCalls.length : 1),
      durationMs: Date.now() - analysisStartedAt,
      reportPath: analysis.reportPath,
      runtimeReportPath: analysis.runtimeReportPath,
      packetPath,
      composition: {
        sourceFactTags: (report.match(/\[Source Fact\]/gu) ?? []).length,
        diagnosisTags: (report.match(/\[AI Diagnosis\]/gu) ?? []).length,
        creativeProposalTags: (report.match(/\[Creative Proposal\]/gu) ?? []).length,
        abstractionCount: packet.abstractions.length,
        spatialStatus: packet.mediaTranslations.spatial.status,
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
      logoUsageMode: compilation.taskContract.logoUsageMode,
      referenceAssetIds: compilation.taskContract.referenceAssetIds,
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
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    process.stderr.write(`VISUAL_DECISION_SMOKE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
