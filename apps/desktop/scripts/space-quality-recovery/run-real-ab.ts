// Phase R6 real-provider A/B smoke (Recovery doc §17).
//
// Drives Electron (for safeStorage API key decryption), compiles BOTH
//   Mode A: legacy vNext space compiler (current default)
//   Mode B: Phase 9B-quality production compiler (MASTERPIECE_SPACE_COMPILER_MODE)
// against the SAME JZMX project / packet / task / reference set, calls
// Seedream for each, and writes both images + a report JSON into
// .runtime/phase9b-ab/ for the user to score per recovery doc §18.
//
// Run from repo root:
//   .\node_modules\.bin\electron.cmd apps\desktop\scripts\space-quality-recovery\run-real-ab.ts
//
// Optional env:
//   SPACE_AB_PROJECT_ID    default: 13c636af-... suffix of the JZMX project dir
//   SPACE_AB_PROFILE_ID    default: profile-e871b4c5-7499-4749-b838-02410ad19cb1
//   SPACE_AB_DATA_ROOT     default: %USERPROFILE%\Documents\Masterpiece OS Data

import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When esbuild bundles this into apps/desktop/out/, __dirname points there.
// The script source lives in apps/desktop/scripts/space-quality-recovery/,
// so the repo root is always 4 levels up from __dirname regardless of
// bundling. Override with SPACE_AB_REPO_ROOT if needed.
const REPO_ROOT = process.env.SPACE_AB_REPO_ROOT?.trim()
  || path.resolve(__dirname, '..', '..', '..', '..');

const projectSuffix = process.env.SPACE_AB_PROJECT_ID?.trim() || '13c636af';
const profileId = process.env.SPACE_AB_PROFILE_ID?.trim() || 'profile-e871b4c5-7499-4749-b838-02410ad19cb1';
const dataRoot = process.env.SPACE_AB_DATA_ROOT?.trim()
  || path.join(process.env.USERPROFILE || '', 'Documents', 'Masterpiece OS Data');

const ASPECT = '16:9';
const SIZE = '2K';
const MODEL = 'doubao-seedream-5-0-pro-260628';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

app.setPath('userData', path.join(process.env.APPDATA || '', 'masterpiece-os-desktop'));
app.setAppPath(REPO_ROOT);

function emit(event: string, payload: unknown): void {
  process.stdout.write(`SPACE_AB ${event} ${JSON.stringify(payload)}\n`);
}

function findProjectDir(): string {
  const projectsRoot = path.join(dataRoot, 'projects');
  if (!existsSync(projectsRoot)) throw new Error(`projects root not found: ${projectsRoot}`);
  // Match prefix `九州美学-` + suffix.
  for (const entry of readdirSync(projectsRoot)) {
    if (entry.startsWith(`九州美学-${projectSuffix}`)) return path.join(projectsRoot, entry);
  }
  throw new Error(`JZMX project with suffix ${projectSuffix} not found under ${projectsRoot}`);
}

async function decryptApiKey(): Promise<string> {
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    throw new Error('safeStorage unavailable: cannot decrypt API key');
  }
  const credPath = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'credentials', `${profileId}.bin`);
  const buf = await fs.readFile(credPath);
  return (await safeStorage.decryptStringAsync(buf)).result;
}

async function loadPacketAndContext(projectDir: string) {
  const packetPath = path.join(projectDir, 'project-context', 'visual-decision-packet.json');
  const ctxPath = path.join(projectDir, 'project-context', 'project-visual-context.vnext.json');
  if (!existsSync(packetPath)) throw new Error(`packet not found: ${packetPath}`);
  if (!existsSync(ctxPath)) throw new Error(`vnext context not found: ${ctxPath}`);
  const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
  const context = JSON.parse(readFileSync(ctxPath, 'utf8'));
  context.visualDecisionPacket = packet;
  return { packet, context };
}

function makeTaskContract(projectId: string) {
  const taskId = `ab-real-${Date.now()}`;
  return {
    schemaVersion: '1.0' as const,
    taskId,
    projectId,
    deliverableFamily: 'space' as const,
    subtype: 'reception' as const,
    shot: 'entrance_view' as const,
    count: 1 as const,
    aspectRatio: ASPECT as const,
    currentInstruction: 'Phase R6 A/B smoke: same task for both modes.',
    mustInclude: [] as string[],
    mustAvoid: [] as string[],
    referenceAssetIds: [] as string[],
    // JZMX packet has a confirmed logo asset -> compile.js requires
    // post_composite to avoid accidental in-prompt logo rendering.
    logoUsageMode: 'post_composite' as const,
    createdAt: new Date().toISOString(),
  };
}

async function compileMode(mode: 'legacy' | 'phase9b', context: any, taskContract: any) {
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = mode === 'phase9b' ? 'phase9b_quality' : 'vnext_legacy';
  const compileUrl = pathToFileURL(path.join(
    REPO_ROOT, 'packages/image-generation-runtime/src/vnext/compile.js',
  )).href;
  const { compileVNextImageGeneration } = await import(compileUrl);
  const result = compileVNextImageGeneration({
    projectContext: context,
    model: MODEL,
    task: taskContract,
    brandKey: 'jiuzhou-aesthetics',
  });
  return result;
}

function providerPrompt(mode: 'A' | 'B', finalPrompt: string): string {
  // Seedream prompt wrapper consistent with the existing real-provider smoke
  // (apps/desktop/scripts/space-generator-real-test.ts).
  return [
    '生成一张完整、可商用的商业空间视觉效果图。',
    '准确执行已确认的品牌规则、中文商业设计语境与交付物职责。',
    `Output aspect ratio: ${ASPECT}. Generate exactly one image.`,
    `Mode: ${mode} (Phase 9B A/B smoke)`,
    finalPrompt,
  ].join('\n');
}

async function callSeedream(apiKey: string, prompt: string) {
  const startedAt = Date.now();
  const resp = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: SIZE,
      response_format: 'b64_json',
      watermark: false,
    }),
  });
  const elapsedMs = Date.now() - startedAt;
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Seedream ${resp.status}: ${t.slice(0, 800)}`);
  }
  const json: any = await resp.json();
  const item = json.data?.[0];
  if (!item?.b64_json) throw new Error('Seedream response missing b64_json');
  const buffer = Buffer.from(item.b64_json, 'base64');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return { buffer, sha256, elapsedMs, requestId: json.id, modelUsed: json.model };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  emit('START', { startedAt, projectSuffix, profileId, dataRoot });

  const projectDir = findProjectDir();
  emit('PROJECT_FOUND', { projectDir });

  const [apiKey, { packet, context }] = await Promise.all([
    decryptApiKey(),
    loadPacketAndContext(projectDir),
  ]);
  emit('INPUTS_READY', {
    apiKeyLength: apiKey.length,
    packetSchema: packet.schemaVersion,
    packetBrand: packet.projectFacts?.brandName?.value,
    packetIndustry: packet.projectFacts?.industry?.value,
    contextProjectId: context.projectId,
    functionalNetworkCount: packet.mediaTranslations?.spatial?.functionalNetwork?.length ?? 0,
  });

  const taskContract = makeTaskContract(context.projectId);
  const outDir = path.join(REPO_ROOT, '.runtime', 'phase9b-ab', taskContract.taskId);
  mkdirSync(outDir, { recursive: true });

  // Mode A: legacy vNext.
  emit('COMPILE_A_START', { mode: 'legacy_vnext' });
  const compiledA = await compileMode('legacy', context, taskContract);
  const promptA = compiledA.compiledPrompt.finalPrompt as string;
  writeFileSync(path.join(outDir, 'prompt-A.md'), promptA, 'utf8');
  emit('COMPILE_A_DONE', {
    chars: [...promptA].length,
    blockIds: compiledA.compiledPrompt.blocks?.map((b: any) => b.id),
    adapter: compiledA.payload.adapterId,
  });

  // Mode B: phase9b quality.
  emit('COMPILE_B_START', { mode: 'phase9b_quality' });
  const compiledB = await compileMode('phase9b', context, taskContract);
  const promptB = compiledB.compiledPrompt.finalPrompt as string;
  writeFileSync(path.join(outDir, 'prompt-B.md'), promptB, 'utf8');
  emit('COMPILE_B_DONE', {
    chars: [...promptB].length,
    blockIds: compiledB.compiledPrompt.blocks?.map((b: any) => b.id),
    phase9b: (compiledB.compiledPrompt as any).phase9b,
  });

  // Call Seedream for both. Use same reference set: for A that's empty
  // (legacy vnext with no user refs), for B the policy enforces at least
  // one reference. We attach the JZMX anchor images as multi-image refs.
  const refImages: string[] = ((compiledB.compiledPrompt as any).phase9b?.referenceImages ?? [])
    .map((r: any) => r.imagePath)
    .filter(Boolean);
  emit('REFERENCES', { count: refImages.length, paths: refImages });

  // For Mode A, use the same reference images to keep parity (this is what
  // recovery doc §17 requires: same reference for both).
  async function generateWithRefs(mode: 'A' | 'B', prompt: string) {
    emit(`GENERATE_${mode}_START`, { promptChars: [...prompt].length });
    const images: string[] = [];
    for (const p of refImages) {
      const buf = readFileSync(p);
      const ext = path.extname(p).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      images.push(`data:${mime};base64,${buf.toString('base64')}`);
    }
    const body: any = {
      model: MODEL,
      prompt: providerPrompt(mode, prompt),
      ...(images.length ? { image: images } : {}),
      size: SIZE,
      response_format: 'b64_json',
      watermark: false,
    };
    const startedAt = Date.now();
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
      throw new Error(`Seedream ${mode} unexpected response: ${JSON.stringify(json).slice(0, 400)}`);
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
      modelUsed: json.model,
    };
  }

  const [genA, genB] = await Promise.all([
    generateWithRefs('A', promptA),
    generateWithRefs('B', promptB),
  ]);

  for (const [mode, gen] of [['A', genA], ['B', genB]] as const) {
    const imgPath = path.join(outDir, `image-${mode}.png`);
    writeFileSync(imgPath, gen.buffer);
    emit(`GENERATE_${mode}_DONE`, {
      imagePath: imgPath,
      bytes: gen.buffer.length,
      sha256: gen.sha256,
      requestId: gen.requestId,
      modelUsed: gen.modelUsed,
    });
  }

  const report = {
    schemaVersion: '1.0',
    taskId: taskContract.taskId,
    startedAt,
    completedAt: new Date().toISOString(),
    projectDir,
    model: MODEL,
    aspectRatio: ASPECT,
    size: SIZE,
    referenceImages: refImages,
    modeA: {
      compiler: 'vnext_legacy',
      promptChars: [...promptA].length,
      blockIds: compiledA.compiledPrompt.blocks?.map((b: any) => b.id),
      imagePath: path.join(outDir, 'image-A.png'),
      imageSha256: genA.sha256,
      imageBytes: genA.buffer.length,
      requestId: genA.requestId,
      modelUsed: genA.modelUsed,
    },
    modeB: {
      compiler: 'phase9b_quality',
      promptChars: [...promptB].length,
      blockIds: compiledB.compiledPrompt.blocks?.map((b: any) => b.id),
      anchors: (compiledB.compiledPrompt as any).phase9b?.anchorIds ?? [],
      budget: (compiledB.compiledPrompt as any).phase9b?.budget,
      imagePath: path.join(outDir, 'image-B.png'),
      imageSha256: genB.sha256,
      imageBytes: genB.buffer.length,
      requestId: genB.requestId,
      modelUsed: genB.modelUsed,
    },
    scoring: {
      rubric: 'recovery doc §18 (Architecture 25 / Brand 20 / Functional 20 / Material&Light 15 / Composition 10 / Rendering 10)',
      diagnostics: {
        genericAiSpaceRisk: { scale: '1-5', target: '<=2', scoreA: null, scoreB: null },
        referenceAlignment: { scale: '1-5', target: '>=4', scoreA: null, scoreB: null },
      },
      scores: { A: null, B: null },
      notes: 'Fill in after visual inspection. R7 proceeds only if B ≈ A.',
    },
  };
  writeFileSync(path.join(outDir, 'ab-report.json'), JSON.stringify(report, null, 2), 'utf8');
  emit('DONE', {
    outDir,
    imageA: path.join(outDir, 'image-A.png'),
    imageB: path.join(outDir, 'image-B.png'),
    report: path.join(outDir, 'ab-report.json'),
  });
}

app.whenReady().then(() => {
  main().then(() => app.exit(0)).catch((err) => {
    emit('FAILED', { error: err?.stack || err?.message || String(err) });
    app.exit(1);
  });
});
