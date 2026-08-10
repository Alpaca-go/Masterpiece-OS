// R2.0 §4.10 / B-4: Real Seedream Reference-First cross-scene smoke.
//
// Verifies the full R11.2.3 + B-1 + B-2 + B-3 stack end to end on a live
// Seedream 5.0 Pro call. The smoke picks a concrete reference image from
// the user's JZMX project and asks the model to generate a Consultation
// scene (subtype=consultation, shot=human_scale_consultation_view) with
// referenceSceneRelation = "cross_scene" so the Reference Boundary text
// block takes the cross-scene intent line.
//
// What this smoke checks:
// - REFERENCE_ASSET_NOT_FOUND (A0) does NOT fire: the asset is in the
//   vnext sourceAssetRefs.
// - The compiled prompt reflects the target scene (consultation-only
//   functional program, no project-wide reception / treatment / rest /
//   waiting leak into required program nodes).
// - The reference is resolved through the new Product Policy +
//   Adapter Capability seam (B-2): exactly 1 reference is sent.
// - The Reference Boundary text block (B-3) is appended; it is honest
//   about providerStrengthControl = "unsupported".
// - The output is materially different from the reference (the r2.0
//   C0 gate). The user judges the visual outcome from output.png and
//   the saved prompt.
//
// What this smoke does NOT do:
// - No automated multimodal audit. The user reviews output.png directly.
//   Adding a second model call would be a separate authorization.
// - No reference_first path for Continuation; Continuation's world_consistency
//   path is exercised by r2.0 v1.2 smokes elsewhere.

import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.env.R2B4_REPO_ROOT?.trim() || 'D:/Masterpiece-OS';
const OUTPUT_ROOT = process.env.R2B4_OUTPUT_ROOT?.trim()
  || path.join(REPO_ROOT, 'space-generator/quality-baselines/r2-b4-reference-first-smoke');
const projectSuffix = process.env.R2B4_PROJECT_SUFFIX?.trim() || '590eadf2';
const dataRoot = process.env.R2B4_DATA_ROOT?.trim()
  || path.join(process.env.USERPROFILE || '', 'Documents', 'Masterpiece OS Data');

// Frozen-packet mode (default for v2.0): the V5 JZMX packet's
// mediaTranslations.spatial was authored before the v11+ spatial semantic gate
// and contains brand motifs / identity / color-geometry in the functional
// layers — the gate blocks on ANALYSIS_SPATIAL_SEMANTICS_INVALID before the
// phase9b adapter can demote them. The v2.0 B-4 smoke therefore points at a
// hand-authored v11+ compliant packet under
// space-generator/quality-baselines/r2-b4-reference-first-smoke/_packets/.
// This is a smoke fixture (not a product change) and matches the r85
// frozen-packet pattern. The live V5 packet is unchanged and the gate
// itself is unchanged.
const FROZEN_PACKET_PATH = process.env.R2B4_PACKET_PATH?.trim()
  || path.join(
    REPO_ROOT,
    'space-generator/quality-baselines/r2-b4-reference-first-smoke/_packets/jiuzhou-aesthetics/visual-decision-packet.json',
  );
const FROZEN_CONTEXT_PATH = process.env.R2B4_CONTEXT_PATH?.trim() || '';

// Reference asset: a JZMX brand image the user uploaded. The originalName
// is "九州美学视觉提案-XX.png" — there is no scene label yet (Phase F adds
// asset metadata). We treat the image as "reception-class" by convention
// (the user's smoke scenario says "前台参考图 → 咨询室").
const REFERENCE_ASSET_ID = process.env.R2B4_REFERENCE_ASSET_ID?.trim()
  || '357df67c-bbaa-4f79-8cf3-4f90cd81719d';

// Target scene. consultation exercises the R11.2.3 target scene projection
// end to end. The shot MUST be a vnext-registered one (the vnext template
// router throws otherwise); the R11.2.3 view-strategy resolution runs
// on top of whichever shot is chosen and still produces the target-scene-
// default view internally for the scene program — the shot is only the
// camera lens, not the program authority. three_quarter_wide is the
// natural choice for a consultation room: it shows the room fully with
// clear foreground / midground / background, which is what the user
// needs to compare against the reference.
const SUBTYPE = process.env.R2B4_SUBTYPE?.trim() || 'consultation';
const SHOT = process.env.R2B4_SHOT?.trim() || 'three_quarter_wide';
const ASPECT = process.env.R2B4_ASPECT?.trim() || '16:9';
const SIZE = process.env.R2B4_SIZE?.trim() || '2K';
// Manual scene relation override until Phase F adds asset-level scene
// detection. Cross-scene triggers the cross-scene intent line in the
// Reference Boundary text block.
const REFERENCE_SCENE_RELATION = process.env.R2B4_REFERENCE_SCENE_RELATION?.trim() || 'cross_scene';

const TASK_INSTRUCTION = process.env.R2B4_TASK_INSTRUCTION?.trim()
  || '延续参考图的设计语言与材质气质，生成咨询师与客户一对一的咨询空间。';
const SCENE_PREFIX = process.env.R2B4_SCENE_PREFIX?.trim() || 'jzrx-reception-to-consultation';
const RUN_LABEL = process.env.R2B4_RUN_LABEL?.trim() || 'b4-1';
const BRAND_KEY = 'jiuzhou-aesthetics';
const MODEL = 'doubao-seedream-5-0-pro-260628';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

app.setPath('userData', path.join(process.env.APPDATA || '', 'masterpiece-os-desktop'));
app.setAppPath(REPO_ROOT);

function emit(event: string, payload: unknown): void {
  process.stdout.write(`R2B4 ${event} ${JSON.stringify(payload)}\n`);
}

function findProjectDir(): string {
  const projectsRoot = path.join(dataRoot, 'projects');
  const entries = readdirSync(projectsRoot);
  for (const entry of entries) {
    if (entry.endsWith(`-${projectSuffix}`)) return path.join(projectsRoot, entry);
  }
  throw new Error(`Project suffix ${projectSuffix} not found under ${projectsRoot}`);
}

function sha256OfFile(filePath: string): string {
  const data = readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// R2B4_API_PROFILE_ID overrides the project.json apiProfileId. The user's
// JZMX project (suffix 590eadf2) currently binds to profile-397281cc whose
// stored key is in a different platform's format (sk-ws-... 117 chars) and is
// rejected by Seedream as 401 "API key format is incorrect". The r85 smoke
// worked because it pinned profile-e871b4c5 (ark-... 46 chars, valid ARK).
// Set this env var to one of the user's valid profiles to run the smoke
// without touching the project's project.json.
const R2B4_API_PROFILE_ID = process.env.R2B4_API_PROFILE_ID?.trim() || '';

function readProject(): {
  projectId: string;
  projectName: string;
  apiProfileId: string;
  visualContextVNextPath: string;
} {
  const projectDir = findProjectDir();
  const projectJsonPath = path.join(projectDir, 'project.json');
  const pj = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
  const vnextContextPath = path.join(projectDir, 'project-context', 'project-visual-context.vnext.json');
  if (!existsSync(vnextContextPath)) {
    throw new Error(`vnext visual context not found at ${vnextContextPath}; cannot run reference_first smoke`);
  }
  return {
    projectId: pj.id,
    projectName: pj.projectName,
    apiProfileId: R2B4_API_PROFILE_ID || pj.apiProfileId,
    visualContextVNextPath: vnextContextPath,
  };
}

async function readApiKey(profileId: string): Promise<{ apiKey: string; profileName: string; model: string }> {
  const credsDir = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'credentials');
  if (!existsSync(credsDir)) {
    throw new Error(`Credentials directory not found at ${credsDir}`);
  }
  const credPath = path.join(credsDir, `${profileId}.bin`);
  if (!existsSync(credPath)) {
    throw new Error(`API profile ${profileId} not found at ${credPath}`);
  }
  // The desktop stores credentials as <profileId>.bin — safeStorage
  // encrypted ciphertext. The .bin IS the encrypted API key bytes;
  // decryptStringAsync returns { result: <plaintext> } (matching the
  // settings-store.ts readCredentials pattern at apps/desktop/src/main/
  // settings-store.ts:254).
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    throw new Error('safeStorage is not available on this machine; cannot decrypt credentials');
  }
  const buf = await fs.readFile(credPath);
  const decrypted = (await safeStorage.decryptStringAsync(buf)) as unknown as { result: string };
  if (!decrypted?.result) throw new Error(`Profile ${profileId} decrypted but result is empty`);
  return {
    apiKey: decrypted.result,
    profileName: profileId,
    model: MODEL,
  };
}

async function ensureOutputDir(): Promise<string> {
  const outDir = path.join(OUTPUT_ROOT, BRAND_KEY, `${SCENE_PREFIX}-${RUN_LABEL}`);
  await fs.mkdir(outDir, { recursive: true });
  return outDir;
}

async function compileTaskContract(projectId: string, profileId: string): Promise<{
  taskContract: object;
  compiledPrompt: {
    finalPrompt: string;
    editablePrompt: string;
    trace?: { spaceGeneration?: { targetSceneAuthority?: object } };
  };
}> {
  // r85 redirect smoke pattern: pin the compiler mode to phase9b_quality so
  // the r8_6_golden + phase9b-quality path is exercised end to end. Without
  // this the vnext default is the legacy compiler, which would change the
  // route integrity gate and the target scene projection path.
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'phase9b_quality';
  // Step 1: compileVNextImageGeneration. This is the high-level vnext
  // compile that combines the brand visual decision packet and the
  // task contract. It returns the VNextCompiledPrompt with the r8_6_golden
  // output (NOT yet including the B-3 Reference Boundary).
  const compileUrl = pathToFileURL(path.join(
    REPO_ROOT,
    'packages/image-generation-runtime/src/vnext/compile.js',
  )).href;
  const compileMod = await import(compileUrl);
  if (!existsSync(FROZEN_PACKET_PATH)) {
    throw new Error(`frozen v11+ packet not found at ${FROZEN_PACKET_PATH}; set R2B4_PACKET_PATH to override`);
  }
  const packet = JSON.parse(readFileSync(FROZEN_PACKET_PATH, 'utf8'));
  // When an explicit context file is supplied, merge it on top of the
  // synthesized projectContext so the compile is reproducible across runs.
  let projectContext: { projectId: string; visualDecisionPacket: object };
  if (FROZEN_CONTEXT_PATH && existsSync(FROZEN_CONTEXT_PATH)) {
    const ctx = JSON.parse(readFileSync(FROZEN_CONTEXT_PATH, 'utf8'));
    ctx.projectId = projectId;
    ctx.visualDecisionPacket = packet;
    projectContext = ctx;
  } else {
    projectContext = { projectId, visualDecisionPacket: packet };
  }
  const compiled = await compileMod.compileVNextImageGeneration({
    projectContext,
    model: MODEL,
    task: {
      schemaVersion: '1.0',
      taskId: `r2b4-${Date.now()}`,
      projectId,
      deliverableFamily: 'space',
      subtype: SUBTYPE,
      shot: SHOT,
      count: 1,
      aspectRatio: ASPECT,
      currentInstruction: TASK_INSTRUCTION,
      generationBasis: 'reference_first',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [REFERENCE_ASSET_ID],
      logoUsageMode: 'post_composite',
      referenceSceneRelation: REFERENCE_SCENE_RELATION,
      createdAt: new Date().toISOString(),
    },
    brandKey: BRAND_KEY,
  });

  // Step 2: seedream-adapter.compile. This is the B-3 seam. It appends the
  // Reference Boundary text block to the compiled prompt when basis is
  // reference_first. The block is honest about providerStrengthControl.
  const seedreamAdapterUrl = pathToFileURL(path.join(
    REPO_ROOT,
    'packages/image-generation-runtime/src/vnext/seedream-adapter.js',
  )).href;
  const seedreamAdapterMod = await import(seedreamAdapterUrl);
  const adapter = seedreamAdapterMod.createSeedreamVNextAdapter({ model: MODEL });
  const adapterCompiled = adapter.compile(compiled.compiledPrompt);
  // Replace the compiled prompt with the adapter-augmented version so
  // the smoke sends the prompt with the boundary.
  return {
    ...(compiled as { taskContract: object }),
    compiledPrompt: {
      ...(compiled.compiledPrompt as object),
      finalPrompt: adapterCompiled.prompt,
      editablePrompt: adapterCompiled.prompt,
      seedreamAdapter: {
        referenceBoundary: adapterCompiled.referenceBoundary,
        size: adapterCompiled.size,
        aspectRatio: adapterCompiled.aspectRatio,
        referenceAssetIds: adapterCompiled.referenceAssetIds,
      },
    },
  };
}

async function sendToSeedream(
  apiKey: string,
  prompt: string,
  referenceDataUrl: string,
  size: string,
  aspectRatio: string,
): Promise<{ id: string; dataUrl: string }> {
  // Seedream Doubao images generations endpoint. Match the payload shape
  // the desktop's ImageGenerationService already uses; we keep this
  // minimal and self-contained for the smoke.
  //
  // For 2K the model expects "2048x2048" or "2048x<height>". Seedream 5.0
  // does not yet accept aspect-ratio strings, so we map the requested
  // aspect ratio to a concrete pixel size.
  const seedreamSize = sizeToSeedreamSize(size, aspectRatio);
  const body = {
    model: MODEL,
    prompt,
    image: [referenceDataUrl],
    size: seedreamSize,
    response_format: 'url',
  };
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seedream call failed (${res.status}): ${text}`);
  }
  const json = await res.json() as { data?: Array<{ url?: string; b64_json?: string }> };
  const first = json.data?.[0];
  if (!first) throw new Error('Seedream returned no image data');
  if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Seedream URL fetch failed (${imgRes.status})`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { id: `seedream-${Date.now()}`, dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  }
  if (first.b64_json) {
    return { id: `seedream-${Date.now()}`, dataUrl: `data:image/png;base64,${first.b64_json}` };
  }
  throw new Error('Seedream response had neither url nor b64_json');
}

function sizeToSeedreamSize(size: string, aspectRatio: string): string {
  if (size === '2K') {
    // 2K = 2048 long edge.
    const map: Record<string, string> = {
      '16:9': '2048x1152',
      '9:16': '1152x2048',
      '1:1': '2048x2048',
      '4:3': '2048x1536',
      '3:4': '1536x2048',
    };
    return map[aspectRatio] ?? '2048x1152';
  }
  // 1K fallback.
  const map: Record<string, string> = {
    '16:9': '1024x576',
    '9:16': '576x1024',
    '1:1': '1024x1024',
    '4:3': '1024x768',
    '3:4': '768x1024',
  };
  return map[aspectRatio] ?? '1024x576';
}

async function readImageDataUrl(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function main(): Promise<void> {
  emit('start', {
    repoRoot: REPO_ROOT,
    outputRoot: OUTPUT_ROOT,
    projectSuffix,
    referenceAssetId: REFERENCE_ASSET_ID,
    subtype: SUBTYPE,
    shot: SHOT,
    referenceSceneRelation: REFERENCE_SCENE_RELATION,
    model: MODEL,
    frozenPacketPath: FROZEN_PACKET_PATH,
  });

  const project = readProject();
  emit('project-loaded', {
    projectId: project.projectId,
    projectName: project.projectName,
    apiProfileId: project.apiProfileId,
    apiProfileIdOverridden: Boolean(R2B4_API_PROFILE_ID),
  });

  const credentials = await readApiKey(project.apiProfileId);
  emit('credentials-loaded', {
    profileName: credentials.profileName,
    model: credentials.model,
  });

  // Resolve the reference image on disk.
  const vnextContext = JSON.parse(readFileSync(project.visualContextVNextPath, 'utf8'));
  const refs = Array.isArray(vnextContext.sourceAssetRefs) ? vnextContext.sourceAssetRefs : [];
  const refEntry = refs.find((r: { assetId: string }) => r.assetId === REFERENCE_ASSET_ID);
  if (!refEntry) {
    throw new Error(`Reference asset ${REFERENCE_ASSET_ID} not in vnext sourceAssetRefs`);
  }
  const projectDir = findProjectDir();
  // The vnext sourceAssetRefs stores relativePath as "assets/<id>.png" (the
  // path under the project root, not under input/). The actual file lives
  // at projectRoot/input/assets/<id>.png because the desktop's input
  // pipeline uploads under input/. We prefix "input/" only when the path
  // does not already start with it.
  const projectRelative = refEntry.relativePath.startsWith('input/')
    ? refEntry.relativePath
    : `input/${refEntry.relativePath}`;
  const refPath = path.join(projectDir, projectRelative);
  if (!existsSync(refPath)) throw new Error(`Reference file not found at ${refPath}`);
  const referenceDataUrl = await readImageDataUrl(refPath);
  const referenceSha256 = sha256OfFile(refPath);
  emit('reference-resolved', {
    assetId: REFERENCE_ASSET_ID,
    relativePath: refEntry.relativePath,
    sha256: referenceSha256,
    bytes: readFileSync(refPath).length,
  });

  // Compile the task contract through the vnext compiler.
  const compiled = await compileTaskContract(project.projectId, project.apiProfileId);
  // The compiled result is opaque; pull the final prompt + a few metadata fields.
  const finalPrompt = compiled.compiledPrompt?.finalPrompt
    || compiled.compiledPrompt?.editablePrompt
    || '';
  const referenceBoundary = (compiled.compiledPrompt as { seedreamAdapter?: { referenceBoundary?: object } })
    .seedreamAdapter?.referenceBoundary ?? null;
  emit('compiled', {
    taskContract: compiled.taskContract,
    finalPromptCharacters: finalPrompt.length,
    referenceBoundary,
  });

  // Save task contract + trace + prompt + reference-trace + target-scene-projection.
  const outDir = await ensureOutputDir();
  writeFileSync(path.join(outDir, 'task-contract.json'),
    `${JSON.stringify(compiled.taskContract ?? {}, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(outDir, 'reference-trace.json'),
    `${JSON.stringify({ referenceAssetIds: [REFERENCE_ASSET_ID], referenceSceneRelation: REFERENCE_SCENE_RELATION, resolvedAssetId: REFERENCE_ASSET_ID, relativePath: refEntry.relativePath, sha256: referenceSha256 }, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(outDir, 'target-scene-projection.json'),
    `${JSON.stringify(compiled.compiledPrompt?.trace?.spaceGeneration?.targetSceneAuthority ?? {}, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(outDir, 'prompt.md'),
    `${finalPrompt}\n`, 'utf8');
  writeFileSync(path.join(outDir, 'provider-payload.redacted.json'),
    `${JSON.stringify({
      model: MODEL,
      prompt: finalPrompt,
      size: SIZE,
      aspectRatio: ASPECT,
      count: 1,
      referenceAssetIds: [REFERENCE_ASSET_ID],
      // Image data is intentionally NOT included in the redacted payload.
      referenceAssetMeta: {
        assetId: REFERENCE_ASSET_ID,
        relativePath: refEntry.relativePath,
        sha256: referenceSha256,
        sizeBytes: readFileSync(refPath).length,
      },
      referenceSceneRelation: REFERENCE_SCENE_RELATION,
      referenceBoundary,
    }, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(outDir, 'trace.json'),
    `${JSON.stringify(compiled.compiledPrompt?.trace ?? {}, null, 2)}\n`, 'utf8');

  // Call Seedream.
  emit('seedream-call-start', { model: MODEL, promptCharacters: finalPrompt.length, referenceBoundary });
  const image = await sendToSeedream(credentials.apiKey, finalPrompt, referenceDataUrl, SIZE, ASPECT);
  const outputPath = path.join(outDir, 'output.png');
  const base64 = image.dataUrl.split(',')[1];
  await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));
  const outputSha256 = sha256OfFile(outputPath);
  emit('seedream-call-done', {
    imageId: image.id,
    outputSha256,
    outputBytes: readFileSync(outputPath).length,
  });

  // Save run.json summary.
  writeFileSync(path.join(outDir, 'run.json'),
    `${JSON.stringify({
      schemaVersion: 'vnext-1.0',
      projectId: project.projectId,
      apiProfileId: project.apiProfileId,
      brandKey: BRAND_KEY,
      model: MODEL,
      referenceAssetId: REFERENCE_ASSET_ID,
      referenceSha256,
      outputSha256,
      outputPath,
      referenceSceneRelation: REFERENCE_SCENE_RELATION,
      targetSubtype: SUBTYPE,
      targetShot: SHOT,
      referenceBoundary,
      targetSceneAuthority: compiled.compiledPrompt?.trace?.spaceGeneration?.targetSceneAuthority ?? null,
      completedAt: new Date().toISOString(),
    }, null, 2)}\n`, 'utf8');

  emit('done', {
    outputDir: outDir,
    outputPath,
    referenceSha256,
    outputSha256,
  });
}

// r2.0 B-4: safeStorage requires the app to be ready. Wrap main() in
// app.whenReady() the same way the r85 stability smoke does — without
// this wrapper, safeStorage.isAsyncEncryptionAvailable() returns false
// because the OS-level encryption key has not been initialised yet.
app.whenReady().then(() => main().then(() => app.exit(0)).catch((error) => {
  emit('error', { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  app.exit(1);
}));
