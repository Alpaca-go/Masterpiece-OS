import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createMultiModelImageAdapter } from './image-adapter/multi-model.js';
import { assertId, inside, readJson, writeJson } from './configuration.js';

export function createImageService(root, projects, configuration, emit, fetchImpl = fetch) {
  const controllers = new Map();
  const runRoot = async id => path.join(root, 'runs', assertId(id));
  async function getRun(id) {
    const run = await readJson(path.join(await runRoot(id), 'run.json'), null);
    if (run && run.workflowOwner !== 'visual-workflow') throw new Error('VISUAL_WORKFLOW_RUN_OWNERSHIP_REQUIRED');
    if (run) await projects.get(run.projectId);
    return run;
  }
  async function save(run) {
    await writeJson(path.join(await runRoot(run.runId), 'run.json'), run);
    emit('visual-workflow:image-progress', run);
    return run;
  }
  async function startCompiledCreativeTask(input) {
    await projects.get(input.projectId);
    if (input.references?.length || input.snapshot?.taskContract?.generationBasis !== 'standard') throw new Error('VISUAL_WORKFLOW_STANDARD_ONLY');
    const settings = await configuration.get();
    const credential = await configuration.readCredentials(input.apiProfileId || settings.imageProfileId);
    if (credential.modelType !== 'image_generation') throw new Error('请选择独立生图模型');
    const adapterId = ({'seedream-image': 'seedream-5.0-pro', 'openai-image-generation': 'gpt-image-2', 'google-gemini-image': 'nano-banana'})[credential.protocol];
    if (!adapterId) throw new Error('当前独立生图配置协议不受支持');
    const adapter = createMultiModelImageAdapter({ adapterId, modelId: credential.model, apiKey: credential.apiKey, baseUrl: credential.baseUrl });
    const runId = crypto.randomUUID();
    const directory = await runRoot(runId);
    const now = new Date().toISOString();
    let run = { runId, projectId: input.projectId, workflowOwner: 'visual-workflow', status: 'ready', images: [], createdAt: now, updatedAt: now, modelId: credential.model, provider: credential.provider, apiProfileId: credential.profileId, errorCode: null, errorMessage: null };
    const universalInput = { prompt: input.compiledPrompt, negativeRules: [], aspectRatio: input.snapshot.taskContract.aspectRatio, imageSize: '2K', outputCount: 1, references: [] };
    adapter.compileRequest(universalInput);
    await fs.mkdir(directory, { recursive: true });
    await writeJson(path.join(directory, 'source-context-snapshot.json'), input.snapshot);
    await fs.writeFile(path.join(directory, 'compiled-prompt.txt'), input.compiledPrompt, 'utf8');
    await writeJson(path.join(directory,'request-metadata.json'), {
      workflowOwner:'visual-workflow', adapterId, profileId:credential.profileId,
      provider:credential.provider, model:credential.model, baseUrl:credential.baseUrl,
      aspectRatio:universalInput.aspectRatio, imageSize:universalInput.imageSize,
      promptSha256:crypto.createHash('sha256').update(input.compiledPrompt).digest('hex'),
      promptVersion:input.promptVersion, outputCount:1, referenceCount:0,
    });
    await save(run);
    if (input.dryRun) return run;
    const controller = new AbortController();
    controllers.set(runId, controller);
    try {
      run = await save({ ...run, status: 'running' });
      const response = await adapter.execute(universalInput, { fetchImpl, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15 * 60_000)]) });
      const image = response.images[0];
      let bytes;
      if (image.b64) bytes = Buffer.from(image.b64, 'base64');
      else {
        const url = new URL(image.url);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('生图结果地址无效');
        const download = await fetchImpl(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]) });
        if (!download.ok || Number(download.headers.get('content-length')) > 64 * 1024 * 1024) throw new Error('生图结果下载失败');
        bytes = Buffer.from(await download.arrayBuffer());
      }
      if (!bytes.length || bytes.length > 64 * 1024 * 1024) throw new Error('生图结果大小无效');
      const png = await sharp(bytes, { limitInputPixels: 80_000_000 }).png().toBuffer();
      const metadata = await sharp(png).metadata();
      if (!metadata.width || !metadata.height) throw new Error('生图结果不是有效图片');
      const relativePath = 'images/output.png';
      const thumbnailRelativePath = 'thumbnails/output.jpg';
      await fs.mkdir(path.join(directory, 'images'), { recursive: true });
      await fs.mkdir(path.join(directory, 'thumbnails'), { recursive: true });
      await fs.writeFile(path.join(directory, relativePath), png);
      await sharp(png).resize({ width: 480, height: 480, fit: 'inside' }).jpeg().toFile(path.join(directory, thumbnailRelativePath));
      run = await save({ ...run, status: 'succeeded', completedAt: new Date().toISOString(), images: [{ imageId: crypto.randomUUID(), relativePath, thumbnailRelativePath, mimeType: 'image/png', width: metadata.width, height: metadata.height, sha256: crypto.createHash('sha256').update(png).digest('hex'), sizeBytes: png.length }] });
      return run;
    } catch (error) {
      return save({ ...run, status: controller.signal.aborted ? 'cancelled' : 'failed', errorCode: error.code || 'VISUAL_WORKFLOW_IMAGE_FAILED', errorMessage: String(error.message).split(credential.apiKey).join('[REDACTED]') });
    } finally { controllers.delete(runId); }
  }
  async function imageData(runId, imageId) {
    const run = await getRun(runId);
    const image = run?.images.find(item => item.imageId === imageId);
    if (!image) throw new Error('独立工作流图片不存在');
    const bytes = await fs.readFile(inside(await runRoot(runId), image.relativePath));
    return { dataUrl: `data:${image.mimeType};base64,${bytes.toString('base64')}` };
  }
  async function listRuns(projectId) {
    await projects.get(projectId);
    const directory = path.join(root, 'runs');
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
    const runs = [];
    for (const entry of entries) if (entry.isDirectory()) { const run = await getRun(entry.name); if (run?.projectId === projectId) runs.push(run); }
    return runs.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async function logoSource(projectId, assetId) {
    const project=await projects.get(projectId);
    const asset=project.assets.find(item => item.id===assetId && item.role==='logo' && item.mimeType.startsWith('image/'));
    if (!asset) throw new Error('此项目尚未确认原始 Logo');
    const bytes=await fs.readFile(inside((await projects.paths(projectId)).input,asset.relativePath));
    const metadata=await sharp(bytes).metadata();
    return {assetId, width:metadata.width,height:metadata.height,dataUrl:`data:${asset.mimeType};base64,${bytes.toString('base64')}`};
  }
  return { startCompiledCreativeTask, getRun, runRoot, imageData, logoSource, listRuns, cancel: runId => { const controller = controllers.get(runId); controller?.abort(); return Boolean(controller); } };
}
