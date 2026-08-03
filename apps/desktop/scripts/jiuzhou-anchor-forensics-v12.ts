// 九州美学空间生图链路取证 v1.2 — 第二阶段 A/B/C1/C2 最小对照生成
//
// 用途: 不接 production UI, 复用 image-generation service 的真实 Provider 提交链路,
//   在「同模型 / 同基础 Prompt / 同画幅」下仅改变参考图组合, 生成 4 张对照图:
//     A  = Golden Anchor Only            [JZMX-SGR-02-Reception]
//     B  = Source Space Only             [九州美学视觉方案-11.png]  (复刻失败 run 输入)
//     C1 = Source First + Anchor Second  [source, anchor]
//     C2 = Anchor First + Source Second  [anchor, source]
//
// 红线:
//   - 不修改任何 production 代码; 不触碰包装/VI 生图链路; 不启用 Vertical Archetype。
//   - 基础 Prompt 逐字使用第一阶段冻结的 compiled-prompt.md (run-b7a794e0),
//     四次测试不调整 Prompt。
//   - Anchor 未进入模型时必须中止: 提交前校验 Anchor 文件 sha256 == anchor-manifest-v1.json;
//     每次 run 完成后回读 task.json, 校验 references 的 id/顺序与变体规格一致, 否则 exit 1。
//   - Seed 不支持 (provider 链路无 seed 参数), 以同 Prompt/同参考图逐次执行代替, 报告如实标注。
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID        = 80b80c56-e470-40e1-9e15-05eb3c787eca (九州美学)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = image profile id (volcengine / Seedream 5.0 Pro)
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_USER_DATA = 默认 APPDATA/masterpiece-os-desktop
//   MASTERPIECE_SMOKE_REPO_ROOT = 默认 cwd/../.. (D:\Masterpiece-OS)
//   MASTERPIECE_FORENSICS_ONLY  = 只跑指定变体 (如 "A" 或 "C1,C2"), 默认全部

import { app } from 'electron';

// 取证脚本为无界面跑批：沙箱/远程环境下 GPU 进程不可用时必须禁用，否则 FATAL 退出。
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createFileContextLoader } from '../src/main/image-generation/context-loader.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { resolveProjectRoot } from '../src/main/image-generation/paths.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const imageProfileId = process.env.MASTERPIECE_SMOKE_IMAGE_PROFILE_ID?.trim() || '';
const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(process.cwd(), '..', '..');
const FORENSICS_ROOT = path.join(REPO_ROOT, 'evaluation', 'reports', 'jiuzhou-anchor-forensics-v1.2');
const PHASE2_ROOT = path.join(FORENSICS_ROOT, 'phase2');
const ONLY = (process.env.MASTERPIECE_FORENSICS_ONLY?.trim() || '')
  .split(',').map((v) => v.trim().toUpperCase()).filter(Boolean);

const MODEL_ID = 'doubao-seedream-5-0-pro-260628';
const SIZE = '2560*1440'; // 与两次失败 run 一致 (16:9)
const REGION = 'beijing';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

if (!projectId || !imageProfileId) {
  throw new Error('Missing required env: MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_IMAGE_PROFILE_ID');
}

function out(line: string, payload: Record<string, unknown> = {}) {
  process.stdout.write(`FORENSICS ${JSON.stringify({ line, ...payload })}\n`);
}

async function sha256File(absPath: string): Promise<string> {
  return crypto.createHash('sha256').update(await fs.readFile(absPath)).digest('hex');
}

interface Variant {
  id: 'A' | 'B' | 'C1' | 'C2';
  label: string;
  references: Array<{ id: string; role: 'core_reference' | 'structure_reference'; projectRelativePath: string }>;
}

async function main() {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  const projects = createProjectStore(getSettings);
  const project = await projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const projectRoot = await resolveProjectRoot(dataPath, projectId);

  // === 0. 基础 Prompt: 逐字使用冻结证据 (四次测试不调整) ===
  const basePrompt = await fs.readFile(
    path.join(FORENSICS_ROOT, 'run-b7a794e0', 'compiled-prompt.md'), 'utf8',
  );

  // === 1. 资产就位与完整性校验 ===
  const anchorRepoFile = path.join(
    REPO_ROOT, 'assets', 'golden-references', 'spatial', 'jiuzhou-aesthetics', 'JZMX-SGR-02-Reception.png',
  );
  const anchorManifest = JSON.parse(readFileSync(
    path.join(REPO_ROOT, 'packages', 'image-generation-runtime', 'config', 'spatial',
      'projects', 'jiuzhou-aesthetics', 'anchor-manifest-v1.json'), 'utf8',
  ));
  const manifestEntry = (anchorManifest.anchors ?? []).find((a: any) => a.id === 'JZMX-SGR-02-Reception');
  const anchorSha = await sha256File(anchorRepoFile);
  if (manifestEntry?.sha256 && manifestEntry.sha256 !== anchorSha) {
    throw new Error(`ABORT: JZMX-SGR-02-Reception sha256 与 manifest 不一致 (${anchorSha} != ${manifestEntry.sha256})`);
  }
  const anchorRel = 'input/forensics-v12/JZMX-SGR-02-Reception.png';
  const anchorAbs = path.join(projectRoot, 'forensics-v12-anchor.tmp');
  // 放入项目 input 以便 projectRelativePath 解析
  const anchorStagedAbs = path.join(projectRoot, 'input', 'forensics-v12', 'JZMX-SGR-02-Reception.png');
  await fs.mkdir(path.dirname(anchorStagedAbs), { recursive: true });
  await fs.copyFile(anchorRepoFile, anchorStagedAbs);
  await fs.rm(anchorAbs, { force: true });

  const sourceRel = 'input/assets/12c8d0b4-714e-443b-8c16-dbd0366fa755.png';
  const sourceAbs = path.join(projectRoot, 'input', 'assets', '12c8d0b4-714e-443b-8c16-dbd0366fa755.png');
  const sourceSha = await sha256File(sourceAbs);
  out('assets_ready', { anchorSha256: anchorSha, sourceSha256: sourceSha });

  const anchorRef = { id: 'JZMX-SGR-02-Reception', role: 'core_reference' as const, projectRelativePath: anchorRel };
  const sourceRef = { id: 'source-space-12c8d0b4', role: 'core_reference' as const, projectRelativePath: sourceRel };

  const variants: Variant[] = [
    { id: 'A', label: 'Golden Anchor Only', references: [anchorRef] },
    { id: 'B', label: 'Source Space Only', references: [sourceRef] },
    { id: 'C1', label: 'Source First + Anchor Second', references: [sourceRef, anchorRef] },
    { id: 'C2', label: 'Golden Anchor First + Source Second', references: [anchorRef, sourceRef] },
  ].filter((v) => !ONLY.length || ONLY.includes(v.id));

  // === 2. 生图服务 (与 production 同一条真实 Provider 提交链路) ===
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    sleepMs: 1_000,
    emitRunUpdated: (progress: any) => out('run_updated', progress),
  });

  await fs.mkdir(PHASE2_ROOT, { recursive: true });
  const results: any[] = [];

  for (const variant of variants) {
    const variantDir = path.join(PHASE2_ROOT, `test-${variant.id.toLowerCase()}`);
    await fs.mkdir(variantDir, { recursive: true });
    await fs.writeFile(path.join(variantDir, 'prompt.md'), basePrompt, 'utf8');
    out('variant_start', { variant: variant.id, label: variant.label, refs: variant.references.map((r) => r.id) });

    const startedAt = Date.now();
    const run = await imageGeneration.startCompiledCreativeTask({
      projectId,
      compiledPrompt: basePrompt,
      promptVersion: `jiuzhou-anchor-forensics-v1.2-test-${variant.id.toLowerCase()}`,
      snapshot: {
        schemaVersion: '1.0',
        kind: 'jiuzhou-anchor-forensics-v1.2',
        variant: variant.id,
        label: variant.label,
        projectId,
        userAuthorized: true,
        seedSupported: false,
        createdAt: new Date().toISOString(),
      },
      sourceMap: {
        projectId,
        forensics: 'jiuzhou-anchor-forensics-v1.2',
        variant: variant.id,
        referenceOrder: variant.references.map((r) => r.id),
      },
      references: variant.references,
      event: `JIUZHOU_FORENSICS_V12_TEST_${variant.id}_STARTED`,
      apiProfileId: imageProfileId,
      modelId: MODEL_ID,
      region: REGION,
      size: SIZE,
    });

    // === 3. 中止规则: 回读 task.json, references 必须与设计一致 (Anchor 未进入即中止) ===
    const runRoot = await imageGeneration.runRoot(run.runId);
    const persistedTask = JSON.parse(readFileSync(path.join(runRoot, 'task.json'), 'utf8'));
    const actualOrder = (persistedTask.references ?? []).map((r: any) => path.basename(r.localPath ?? ''));
    const expectedOrder = variant.references.map((r) => path.basename(r.projectRelativePath));
    const orderMatch = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);
    const anchorRequired = variant.references.some((r) => r.id === 'JZMX-SGR-02-Reception');
    const anchorPresent = (persistedTask.references ?? []).some((r: any) =>
      String(r.localPath ?? '').includes('JZMX-SGR-02-Reception'));
    if (!orderMatch || (anchorRequired && !anchorPresent)) {
      throw new Error(`ABORT: Test ${variant.id} 参考图未按规格进入模型请求。expected=${JSON.stringify(expectedOrder)} actual=${JSON.stringify(actualOrder)}`);
    }

    const runJson = JSON.parse(readFileSync(path.join(runRoot, 'run.json'), 'utf8'));
    const imagePath = path.join(runRoot, 'images', 'image-01.png');
    let imageBytes: number | null = null;
    try {
      await fs.copyFile(imagePath, path.join(variantDir, 'image.png'));
      imageBytes = (await fs.stat(imagePath)).size;
    } catch (err) {
      out('image_copy_failed', { variant: variant.id, error: (err as Error).message });
    }
    await fs.writeFile(path.join(variantDir, 'run.json'), JSON.stringify({
      variant: variant.id,
      label: variant.label,
      status: runJson.status,
      runId: run.runId,
      modelId: runJson.modelId,
      providerId: runJson.providerId,
      size: SIZE,
      seed: null,
      seedSupported: false,
      durationMs: Date.now() - startedAt,
      referenceOrder: expectedOrder,
      persistedReferenceOrder: actualOrder,
      imageBytes,
      errorMessage: runJson.status !== 'succeeded' ? runJson.errorMessage ?? null : null,
    }, null, 2), 'utf8');
    results.push({ variant: variant.id, status: runJson.status, runId: run.runId, imageBytes });
    out('variant_complete', { variant: variant.id, status: runJson.status, runId: run.runId, imageBytes });
  }

  out('forensics_complete', { results });
  app.exit(0);
}

main().catch((error) => {
  process.stderr.write(`FORENSICS_ABORT ${(error as Error).message}\n`);
  app.exit(1);
});
