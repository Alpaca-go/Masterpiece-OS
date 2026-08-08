// Phase R8 golden image generator (real provider).
//
// Runs inside Electron (safeStorage decrypts the Desktop API key), iterates
// every frozen golden scene under quality-baselines/phase9b-recovered, and
// generates one Phase 9B image per scene using the FROZEN prompt.md +
// reference-trace.json. Writes output.png, run.json and updates manifest
// output fields in place. No credentials are committed.
//
// Run from repo root:
//   .\node_modules\.bin\electron.cmd apps/desktop/scripts/space-quality/generate-golden-images.ts
//
// Optional env:
//   SPACE_GOLDEN_PROFILE_ID   Desktop API profile (default: the active profile)
//   SPACE_GOLDEN_BRAND        only this brand key
//   SPACE_GOLDEN_SCENE        only this scene id
//   SPACE_GOLDEN_FORCE        regenerate even when output.png already exists

import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.SPACE_AB_REPO_ROOT?.trim()
  || path.resolve(__dirname, '..', '..', '..', '..');
const SERIES_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'phase9b-recovered');

const profileId = process.env.SPACE_GOLDEN_PROFILE_ID?.trim()
  || 'profile-e871b4c5-7499-4749-b838-02410ad19cb1';
const onlyBrand = process.env.SPACE_GOLDEN_BRAND?.trim() || null;
const onlyScene = process.env.SPACE_GOLDEN_SCENE?.trim() || null;
const force = process.env.SPACE_GOLDEN_FORCE === '1' || process.env.SPACE_GOLDEN_FORCE === 'true';

const MODEL = 'doubao-seedream-5-0-pro-260628';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const SIZE = '2K';

app.setPath('userData', path.join(process.env.APPDATA || '', 'masterpiece-os-desktop'));
app.setAppPath(REPO_ROOT);

function emit(event: string, payload?: unknown): void {
  process.stdout.write(`SPACE_GOLDEN ${event} ${payload ? JSON.stringify(payload) : ''}\n`);
}

async function decryptApiKey(): Promise<string> {
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    throw new Error('safeStorage unavailable: run inside Electron');
  }
  const credPath = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'credentials', `${profileId}.bin`);
  const buf = await fs.readFile(credPath);
  return (await safeStorage.decryptStringAsync(buf)).result;
}

function discoverScenes(): Array<{ brandKey: string; scene: string; dir: string; manifest: any }> {
  const out: Array<{ brandKey: string; scene: string; dir: string; manifest: any }> = [];
  for (const brandEntry of readdirSync(SERIES_ROOT, { withFileTypes: true })) {
    if (!brandEntry.isDirectory() || brandEntry.name.startsWith('_')) continue;
    if (onlyBrand && brandEntry.name !== onlyBrand) continue;
    const brandDir = path.join(SERIES_ROOT, brandEntry.name);
    for (const sceneEntry of readdirSync(brandDir, { withFileTypes: true })) {
      if (!sceneEntry.isDirectory()) continue;
      if (onlyScene && sceneEntry.name !== onlyScene) continue;
      const dir = path.join(brandDir, sceneEntry.name);
      const manifestPath = path.join(dir, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      out.push({
        brandKey: brandEntry.name,
        scene: sceneEntry.name,
        dir,
        manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
      });
    }
  }
  return out;
}

async function callSeedream(apiKey: string, prompt: string, referenceImages: string[]) {
  const images: string[] = [];
  for (const p of referenceImages) {
    if (!existsSync(p)) {
      emit('REFERENCE_MISSING', { path: p });
      continue;
    }
    const buf = readFileSync(p);
    const ext = path.extname(p).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    images.push(`data:${mime};base64,${buf.toString('base64')}`);
  }

  const startedAt = Date.now();
  const body: any = {
    model: MODEL,
    prompt,
    ...(images.length ? { image: images } : {}),
    size: SIZE,
    response_format: 'b64_json',
    watermark: false,
  };
  const resp = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsedMs = Date.now() - startedAt;
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Seedream ${resp.status}: ${t.slice(0, 800)}`);
  }
  const json: any = await resp.json();
  const item = json.data?.[0];
  if (!item?.b64_json && !item?.url) {
    throw new Error(`Seedream unexpected response: ${JSON.stringify(json).slice(0, 400)}`);
  }
  let buffer: Buffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64');
  } else {
    const ir = await fetch(item.url);
    buffer = Buffer.from(await ir.arrayBuffer());
  }
  return {
    buffer,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    elapsedMs,
    requestId: json.id,
    modelUsed: json.model || MODEL,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKey = await decryptApiKey();
  const scenes = discoverScenes();
  emit('START', { startedAt, scenes: scenes.length, profileId });

  const results: any[] = [];
  for (const scene of scenes) {
    const outImage = path.join(scene.dir, 'output.png');
    if (existsSync(outImage) && !force) {
      emit('SKIP_EXISTING', { brand: scene.brandKey, scene: scene.scene });
      results.push({ brand: scene.brandKey, scene: scene.scene, skipped: true });
      continue;
    }

    const prompt = readFileSync(path.join(scene.dir, 'prompt.md'), 'utf8');
    const refTrace = JSON.parse(readFileSync(path.join(scene.dir, 'reference-trace.json'), 'utf8'));
    const referenceImages = (refTrace.references || [])
      .map((r: any) => path.resolve(REPO_ROOT, r.imagePath));

    const wrapped = [
      '生成一张完整、可商用的商业空间视觉效果图。',
      '准确执行已确认的品牌规则、中文商业设计语境与交付物职责。',
      'Output aspect ratio: 16:9. Generate exactly one image.',
      prompt,
    ].join('\n');

    emit('GENERATE_START', { brand: scene.brandKey, scene: scene.scene, promptChars: [...prompt].length, refs: referenceImages.length });
    // eslint-disable-next-line no-await-in-loop
    const gen = await callSeedream(apiKey, wrapped, referenceImages);
    writeFileSync(outImage, gen.buffer);

    const runId = `golden-${scene.brandKey}-${scene.scene}-${Date.now()}`;
    const runRecord = {
      runId,
      brandKey: scene.brandKey,
      scene: scene.scene,
      startedAt: new Date().toISOString(),
      provider: 'volcengine',
      model: gen.modelUsed,
      profileId,
      size: SIZE,
      aspectRatio: '16:9',
      promptChars: [...prompt].length,
      promptHash: scene.manifest.promptHash,
      architectureAnchorIds: refTrace.anchorIds || [],
      referenceCount: referenceImages.length,
      requestId: gen.requestId,
      elapsedMs: gen.elapsedMs,
      imageFile: 'output.png',
      imageSha256: gen.sha256,
      imageBytes: gen.buffer.length,
    };
    writeFileSync(path.join(scene.dir, 'run.json'), `${JSON.stringify(runRecord, null, 2)}\n`, 'utf8');

    // Backfill manifest output + provider profile.
    scene.manifest.provider.profileId = profileId;
    scene.manifest.output = {
      runId,
      imageFile: 'output.png',
      imageSha256: gen.sha256,
      promptFile: 'prompt.md',
      providerPayloadFile: 'provider-payload.redacted.json',
      referenceTraceFile: 'reference-trace.json',
      runFile: 'run.json',
    };
    writeFileSync(path.join(scene.dir, 'manifest.json'), `${JSON.stringify(scene.manifest, null, 2)}\n`, 'utf8');

    emit('GENERATE_DONE', { brand: scene.brandKey, scene: scene.scene, sha256: gen.sha256, bytes: gen.buffer.length, elapsedMs: gen.elapsedMs });
    results.push({ brand: scene.brandKey, scene: scene.scene, runId, sha256: gen.sha256 });
  }

  emit('DONE', { count: results.length, results });
}

app.whenReady().then(() => {
  main().then(() => app.exit(0)).catch((err) => {
    emit('FAILED', { error: err?.stack || err?.message || String(err) });
    app.exit(1);
  });
});
