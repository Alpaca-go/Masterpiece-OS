import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createVNextImageGenerationService } from '../src/main/image-generation/vnext-service.ts';
import { createProjectContextService } from '../src/main/project-context-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

async function main(): Promise<void> {
  if (!projectId || !imageProfileId) {
    throw new Error('缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID。');
  }
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
    emitRunUpdated: (progress) => {
      process.stdout.write(`PRODUCTION_STABILITY_PROGRESS ${JSON.stringify({
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
      logoUsageMode: 'post_composite',
      currentInstruction: [
        '生成九州美学高端医美全链生态平台的旗舰品牌体验与合作空间，不是单一消费型美容门店。',
        '入口向内的 35mm 视平线 45 度单一透视；前景到达/等候，中景咨询/展示，背景接待并连接后方专业区。',
        '羽毛只转译为分散在隔断、墙体、天花和滤光界面的层叠曲线与精密秩序，不做巨型装置。',
        '加入 1-3 位自然中国成年人，以克制的接待、等候、咨询或合作交流证明尺度和平台协同，人物不是主体。',
        '后方保留干净正向识别留白，不生成 Logo、文字、英文或 slogan，供真实 Logo 受控后贴。',
      ].join(''),
      mustInclude: [
        '至少两类平台功能关系',
        '1-3 位自然人物和一种明确使用行为',
        '前中后景与通往后方的动线',
        '至少两个界面的羽毛抽象转译',
        '有厚度、接缝、边缘与透射的半透明结构',
        '后方干净正向 Logo 后贴留白',
      ],
      mustAvoid: [
        '生活方式零售店',
        '数据大屏、复杂信息墙或零售货架',
        '摆拍、自拍、迎宾列队、夸张微笑或广告人像',
        '注射、护理床、诊疗或护理服务',
        '生成 Logo、文字、英文或 slogan',
      ],
      referenceAssetIds: [],
    },
  });
  const prompt = compilation.compiledPrompt.finalPrompt;
  for (const signal of [
    'controlled post-compositing',
    '至少两类平台功能关系',
    '1-3 位自然人物',
  ]) {
    if (!prompt.includes(signal)) throw new Error(`收尾自动 Prompt 缺少信号：${signal}`);
  }
  if (/Platform relationship contract|Human behavior contract|Medical-aesthetics boundary/u.test(prompt)) {
    throw new Error('生产 Prompt 出现基于行业或品牌角色关键词的公共注入规则');
  }

  const results = [];
  for (let index = 0; index < 3; index += 1) {
    const startedAt = Date.now();
    const run = await vnext.start({
      projectId,
      taskId: compilation.taskContract.taskId,
      apiProfileId: imageProfileId,
    });
    const runRoot = await imageGeneration.runRoot(run.runId);
    const request = JSON.parse(await fs.readFile(
      path.join(runRoot || '', 'provider-request.redacted.json'),
      'utf8',
    )) as { referenceCount?: number };
    const task = JSON.parse(await fs.readFile(
      path.join(runRoot || '', 'task.json'),
      'utf8',
    )) as { references?: unknown[]; promptVersion?: string };
    if (request.referenceCount !== 0 || task.references?.length) {
      throw new Error(`Post-composite 稳定性样本 ${index + 1} 意外向 Provider 发送了参考资产`);
    }
    results.push({
      sample: index + 1,
      runId: run.runId,
      status: run.status,
      provider: run.providerId,
      model: run.modelId,
      durationMs: Date.now() - startedAt,
      promptVersion: task.promptVersion,
      providerReferenceCount: request.referenceCount,
      runRoot,
      imageId: run.images[0]?.imageId,
      imagePath: run.images[0]
        ? path.join(runRoot || '', run.images[0].relativePath)
        : null,
    });
    if (run.status !== 'succeeded' || !run.images.length) {
      throw new Error(`稳定性样本 ${index + 1} 未完成：${run.status}`);
    }
  }
  process.stdout.write(`PRODUCTION_STABILITY_RESULT ${JSON.stringify({
    userAuthorized: true,
    projectId,
    taskId: compilation.taskContract.taskId,
    promptPath: path.join(compilation.artifactDirectory, 'compiled-prompt.md'),
    promptCharacters: [...prompt].length,
    logoUsageMode: compilation.taskContract.logoUsageMode,
    modelCallCount: results.length,
    results,
  })}\n`);
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    process.stderr.write(`PRODUCTION_STABILITY_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
