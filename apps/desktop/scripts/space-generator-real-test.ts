// Space Generator v1 真实 Provider 集成测试
// 用 Space Generator Phase 5 field-enriched prompt + 用户已配置的 Seedream API
// 在 JZMX 项目上生成一张空间效果图, 验证 Space Generator 是否能保留项目气质.
//
// 入口: JZMX DNA (space-generator/v1-experimental/field-schema/examples/)
// 出口: 16:9 单张图, 保存到 <projectContext>/image-generation/<runId>/images/

import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const projectId = process.env.SPACE_GEN_TEST_PROJECT_ID?.trim() || 'a7a56ed7-849f-4671-b47a-466394d7298d';
const profileId = process.env.SPACE_GEN_TEST_PROFILE_ID?.trim() || 'profile-e871b4c5-7499-4749-b838-02410ad19cb1';
const dataRoot = process.env.SPACE_GEN_TEST_DATA_ROOT?.trim()
  || 'C:\\Users\\Administrator\\Documents\\Masterpiece OS Data';
const aspectRatio = '16:9';
const imageSize = '2K';

app.setPath('userData', path.resolve(path.join(process.env.APPDATA || '', 'masterpiece-os-desktop')));
app.setAppPath(path.resolve(process.cwd()));

function emit(event: string, payload: unknown): void {
  process.stdout.write(`SPACE_GEN_TEST ${event} ${JSON.stringify(payload)}\n`);
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const runId = createHash('sha256').update(`space-gen-${startedAt}`).digest('hex').slice(0, 12);
  emit('START', { runId, projectId, profileId, startedAt });

  // 1. 解密 API Key (Electron safeStorage)
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    throw new Error('系统安全凭据服务不可用, 无法解密 API Key');
  }
  const credPath = path.join(
    process.env.APPDATA || '',
    'masterpiece-os-desktop', 'credentials', `${profileId}.bin`,
  );
  const encrypted = await fs.readFile(credPath);
  const apiKey = (await safeStorage.decryptStringAsync(encrypted)).result;
  emit('API_KEY_DECRYPTED', { profileId, apiKeyLength: apiKey.length });

  // 2. 加载 JZMX DNA
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const dnaPath = path.resolve(
    repoRoot,
    'space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json',
  );
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  emit('DNA_LOADED', { dnaPath, brandName: dna.project.brandName, dnaVersion: dna.dnaVersion });

  // 3. 编译 Field-Enriched Prompt (Phase 5)
  const compilePromptUrl = pathToFileURL(path.resolve(
    repoRoot,
    'space-generator/v1-experimental/prompt-compiler/field-enriched/compile-prompt.mjs',
  )).href;
  const { compileFieldEnrichedPrompt } = await import(compilePromptUrl);
  const compiled = compileFieldEnrichedPrompt(dna);
  emit('PROMPT_COMPILED', {
    blockCount: compiled.blockCount,
    characterCount: compiled.characterCount,
    withinSeedreamLimit: compiled.characterCount <= 7500,
  });

  // 4. 准备请求体 (Seedream 多模型协议)
  const modelId = 'doubao-seedream-5-0-pro-260628';
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  const seedreamPrompt = [
    '生成一张完整、可商用的商业视觉效果图。',
    '准确执行已确认的品牌规则、中文商业设计语境与交付物职责。',
    `Output aspect ratio: ${aspectRatio}. Generate exactly one image.`,
    compiled.markdown,
  ].join('\n');

  const requestBody = {
    model: modelId,
    prompt: seedreamPrompt,
    size: imageSize,
    response_format: 'b64_json',
    watermark: false,
  };

  emit('PROVIDER_REQUEST', {
    url: `${baseUrl}/images/generations`,
    modelId,
    promptLength: seedreamPrompt.length,
  });

  // 5. 调 Provider
  const providerStartedAt = Date.now();
  const resp = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const providerElapsedMs = Date.now() - providerStartedAt;

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Seedream ${resp.status}: ${errText.slice(0, 800)}`);
  }
  const respJson = await resp.json() as { data?: Array<{ b64_json?: string; url?: string }>; model?: string; id?: string };
  const img = respJson.data?.[0];
  if (!img?.b64_json) throw new Error('Seedream response missing b64_json');
  const buffer = Buffer.from(img.b64_json, 'base64');
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  emit('PROVIDER_RESPONSE', {
    providerElapsedMs,
    modelUsed: respJson.model,
    requestId: respJson.id,
    imageBytes: buffer.length,
    imageSha256: sha256,
  });

  // 6. 落到项目目录 (跟生产 flow 一致)
  const projectContextRoot = path.join(dataRoot, 'projects', `九州美学-${projectId.slice(0, 8)}`, 'image-generation', runId);
  const imagesDir = path.join(projectContextRoot, 'images');
  const thumbsDir = path.join(projectContextRoot, 'thumbnails');
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(thumbsDir, { recursive: true });

  const imageName = 'image-01.png';
  const imagePath = path.join(imagesDir, imageName);
  await fs.writeFile(imagePath, buffer);
  const thumbPath = path.join(thumbsDir, imageName.replace('.png', '.webp'));
  // 最简 thumbnail 标记: 复制一份小写版本, 真要 webp 转换用 sharp. 这里只做占位
  await fs.writeFile(thumbPath, buffer);

  // 7. 写产物 JSON (desensitized — 不带 apiKey, 不带 raw provider response)
  const runJson = {
    schemaVersion: '1.0',
    runId,
    projectId,
    testMode: 'space-generator-phase-5-real-provider',
    status: 'succeeded',
    providerId: 'volcengine',
    modelId,
    region: 'beijing',
    apiProfileId: profileId,
    createdAt: startedAt,
    updatedAt: new Date().toISOString(),
    startedAt,
    completedAt: new Date().toISOString(),
    providerExecutionMode: 'synchronous',
    providerRequestId: respJson.id,
    spaceGenerator: {
      dnaVersion: dna.dnaVersion,
      dnaSource: dnaPath,
      promptBlockCount: compiled.blockCount,
      promptCharacterCount: compiled.characterCount,
      promptVersion: 'phase-5-field-enriched-v0.1',
    },
    parameters: {
      aspectRatio,
      imageSize,
      watermark: false,
    },
    images: [{
      imageId: 'image-01',
      relativePath: `images/${imageName}`,
      thumbnailRelativePath: `thumbnails/${imageName.replace('.png', '.webp')}`,
      mimeType: 'image/png',
      sizeBytes: buffer.length,
      sha256,
    }],
  };
  const taskJson = {
    schemaVersion: '1.0',
    runId,
    projectId,
    testMode: 'space-generator-phase-5-real-provider',
    outputType: 'concept_image',
    providerId: 'volcengine',
    modelId,
    region: 'beijing',
    parameters: { size: imageSize, aspectRatio, outputCount: 1, watermark: false },
    promptSource: 'space-generator-field-enriched',
    compiledPromptLength: seedreamPrompt.length,
    spaceGeneratorDnaVersion: dna.dnaVersion,
    createdAt: startedAt,
  };
  await fs.writeFile(path.join(projectContextRoot, 'run.json'), JSON.stringify(runJson, null, 2));
  await fs.writeFile(path.join(projectContextRoot, 'task.json'), JSON.stringify(taskJson, null, 2));
  await fs.writeFile(path.join(projectContextRoot, 'compiled-prompt.md'), compiled.markdown);

  emit('RUN_COMPLETED', {
    runId,
    imagePath,
    imageBytes: buffer.length,
    imageSha256: sha256,
    providerElapsedMs,
    totalElapsedMs: Date.now() - new Date(startedAt).getTime(),
  });

  console.log('SPACE_GEN_TEST_FINAL_IMAGE', imagePath);
}

app.whenReady().then(() => main().then(() => {
  app.exit(0);
}).catch((err) => {
  emit('FAILED', { error: err?.message || String(err) });
  app.exit(1);
}));
