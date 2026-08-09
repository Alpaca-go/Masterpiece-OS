// R8.5 redirected stability smoke — Phase 9B quality compiler with the
// action-verb architecture IR (P9B-B register forward-port, commit 342ee2c).
//
// Generates THREE text-only (refs=0) JZMX reception images at 2K / 16:9
// against doubao-seedream-5-0-pro-260628. The stability gate (R8.5 redirected)
// requires >= 2/3 runs at >= 4/5 Architecture Expressiveness AND >= 4/5
// Literal Motif Risk, with >= 1 run >= 4/5 Functional Realism.
//
// This is NOT production code. It only exists for the R8.5 gate.
import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.env.R85_REPO_ROOT?.trim() || 'D:/Masterpiece-OS';
const OUTPUT_ROOT = process.env.R85_OUTPUT_ROOT?.trim()
  || path.join(REPO_ROOT, 'space-generator/quality-baselines/r85-redirect-text-only-smokes');
const projectSuffix = process.env.R85_PROJECT_SUFFIX?.trim() || '13c636af';
const profileId = process.env.R85_PROFILE_ID?.trim() || 'profile-e871b4c5-7499-4749-b838-02410ad19cb1';
const RUN_COUNT = Number(process.env.R85_RUN_COUNT?.trim() || '3');
const dataRoot = process.env.R85_DATA_ROOT?.trim()
  || path.join(process.env.USERPROFILE || '', 'Documents', 'Masterpiece OS Data');

// Brand/scene are parameterizable via env so the same runner can drive the
// FTT / YJLF generalization smokes from frozen V5 packets. JZMX reception
// remains the default stability-gate configuration.
const BRAND_KEY = process.env.R85_BRAND_KEY?.trim() || 'jiuzhou-aesthetics';
const BRAND_DISPLAY = process.env.R85_BRAND_DISPLAY?.trim() || '九州美学';
const SCENE_PREFIX = process.env.R85_SCENE_PREFIX?.trim() || 'reception-stab';
const PACKET_PATH = process.env.R85_PACKET_PATH?.trim() || '';
const CONTEXT_PATH = process.env.R85_CONTEXT_PATH?.trim() || '';
const ASPECT = process.env.R85_ASPECT?.trim() || '16:9';
const SIZE = process.env.R85_SIZE?.trim() || '2K';
const TASK_INSTRUCTION = process.env.R85_TASK_INSTRUCTION?.trim()
  || '生成九州美学医疗美容机构的接待与挂号空间效果图。以视平线高度单一广角透视呈现到达、接待台与后方品牌墙的层次关系，品牌识别由项目资产抽象转译，Logo 后期合成。';
const SUBTYPE = process.env.R85_SUBTYPE?.trim() || 'reception';
const SHOT = process.env.R85_SHOT?.trim() || 'entrance_view';
const MODEL = 'doubao-seedream-5-0-pro-260628';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const COMPILER_MODE = process.env.R85_COMPILER_MODE?.trim() || 'phase9b_quality';

// R11.1 continuation smoke: when R85_CONTINUATION=1, the runner emits a
// continuation task (generationBasis=continuation) with the confirmed source
// image as the single reference and source/target scene from env.
const CONTINUATION_MODE = process.env.R85_CONTINUATION?.trim() === '1';
const SOURCE_SCENE = process.env.R85_SOURCE_SCENE?.trim() || '';
const TARGET_SCENE = process.env.R85_TARGET_SCENE?.trim() || '';

// R8.6 reuse: the same runner drives the final smokes. Defaults keep the R8.5
// redirected gate labels so existing behavior is unchanged; override via env
// to emit R8.6 golden-baseline-labeled records.
const BASELINE_LABEL = process.env.R85_BASELINE_LABEL?.trim() || 'r85-redirect-text-only-smoke';
const REDIRECT_LABEL = process.env.R85_REDIRECT_LABEL?.trim() || 'r8.5-action-verb-ir';
const RUNID_PREFIX = process.env.R85_RUNID_PREFIX?.trim() || 'r85-redirect';
const TASKID_PREFIX = process.env.R85_TASKID_PREFIX?.trim() || 'r85-stab';
const EPOCH_LABEL = process.env.R85_EPOCH_LABEL?.trim()
  || 'Epoch: R8.5 redirected (action-verb architecture IR, P9B-B register forward-port).';
const RUN_INSTRUCTION = process.env.R85_RUN_INSTRUCTION?.trim()
  || 'R8.5 redirected stability run';

app.setPath('userData', path.join(process.env.APPDATA || '', 'masterpiece-os-desktop'));
app.setAppPath(REPO_ROOT);

function emit(event: string, payload: unknown): void {
  process.stdout.write(`R85_STAB ${event} ${JSON.stringify(payload)}\n`);
}

function findProjectDir(): string {
  // When an explicit frozen-packet path is supplied (generalization smokes
  // for FTT / YJLF), the packet directory is the source of truth and there
  // is no live project folder.
  if (PACKET_PATH) return path.dirname(path.dirname(PACKET_PATH));
  const projectsRoot = path.join(dataRoot, 'projects');
  for (const entry of readdirSync(projectsRoot)) {
    if (entry.endsWith(`-${projectSuffix}`)) return path.join(projectsRoot, entry);
  }
  throw new Error(`Project suffix ${projectSuffix} not found under ${projectsRoot}`);
}

async function decryptApiKey(): Promise<string> {
  if (!await safeStorage.isAsyncEncryptionAvailable()) throw new Error('safeStorage unavailable');
  const credPath = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'credentials', `${profileId}.bin`);
  const buf = await fs.readFile(credPath);
  return (await safeStorage.decryptStringAsync(buf) as unknown as { result: string }).result;
}

function loadPacketContext(projectDir: string) {
  // Frozen-packet mode: the caller points R85_PACKET_PATH at a V5 packet and
  // (optionally) R85_CONTEXT_PATH at a vnext context. If no context file is
  // given we synthesize the minimal shape compilePhase9bSpaceGeneration needs
  // ({ projectId, visualDecisionPacket }); the Phase 9B compiler reads the
  // packet directly and projectContext only for projectId/brandKey passthrough.
  if (PACKET_PATH) {
    if (!existsSync(PACKET_PATH)) throw new Error(`packet not found: ${PACKET_PATH}`);
    const packet = JSON.parse(readFileSync(PACKET_PATH, 'utf8'));
    let context: any;
    if (CONTEXT_PATH && existsSync(CONTEXT_PATH)) {
      context = JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));
    } else {
      context = { projectId: packet.projectId || BRAND_KEY };
    }
    context.visualDecisionPacket = packet;
    return { packet, context };
  }
  const packetPath = path.join(projectDir, 'project-context', 'visual-decision-packet.json');
  const ctxPath = path.join(projectDir, 'project-context', 'project-visual-context.vnext.json');
  if (!existsSync(packetPath)) throw new Error(`packet not found: ${packetPath}`);
  if (!existsSync(ctxPath)) throw new Error(`vnext context not found: ${ctxPath}`);
  const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
  const context = JSON.parse(readFileSync(ctxPath, 'utf8'));
  context.visualDecisionPacket = packet;
  return { packet, context };
}

function makeTask(runIndex: number, projectId: string) {
  const referenceAssetIds = CONTINUATION_MODE && REFERENCE_IMAGE
    ? [confirmedAssetId()]
    : [];
  const continuation = CONTINUATION_MODE
    ? buildContinuationIntent(projectId, referenceAssetIds[0] ?? '')
    : undefined;
  return {
    schemaVersion: '1.0' as const,
    taskId: `${TASKID_PREFIX}-${BRAND_KEY}-${SUBTYPE}-${runIndex + 1}-${Date.now()}`,
    projectId,
    deliverableFamily: 'space' as const,
    subtype: SUBTYPE,
    shot: SHOT,
    count: 1 as const,
    aspectRatio: ASPECT as const,
    currentInstruction: `${RUN_INSTRUCTION} ${runIndex + 1}/${RUN_COUNT} (${CONTINUATION_MODE ? 'continuation, refs=1' : 'text-only, refs=0'}).`,
    mustInclude: [] as string[],
    mustAvoid: [] as string[],
    referenceAssetIds,
    ...(CONTINUATION_MODE ? { generationBasis: 'continuation' as const, continuation } : {}),
    logoUsageMode: 'post_composite' as const,
    createdAt: new Date().toISOString(),
  };
}

// Stable asset id derived from the reference image path so the manifest /
// trace record the same confirmed source across runs.
function confirmedAssetId(): string {
  return `asset-confirmed-${crypto.createHash('sha256').update(REFERENCE_IMAGE).digest('hex').slice(0, 12)}`;
}

// R11.1 v1.1 continuation intent: world-consistency reference + a compiled
// target functional program (from the registry) that overrides the source
// program, plus the preserve/regenerate boundary. Kept compact.
function buildContinuationIntent(projectId: string, sourceAssetId: string): Record<string, unknown> {
  const program = targetFunctionalProgramFor(TARGET_SCENE);
  return {
    schemaVersion: '1.0',
    mode: 'continuation',
    projectId,
    sourceReferenceAssetIds: [sourceAssetId],
    confirmedSourceAssetId: sourceAssetId,
    sourceRunId: `source-run-${SOURCE_SCENE}-${Date.now()}`,
    sourceScene: SOURCE_SCENE,
    targetScene: TARGET_SCENE,
    generationBasis: 'continuation',
    referenceMode: 'reference_assisted',
    referenceRole: 'world_consistency',
    referenceSource: 'confirmed_generated_output',
    referenceCount: 1,
    targetFunctionalProgram: program,
    continuationBoundary: {
      preserve: ['brand world', 'architecture language', 'material palette', 'lighting temperament', 'boundary language', 'spatial rhythm', 'color roles'],
      regenerate: ['functional program', 'floor plan', 'furniture layout', 'circulation', 'privacy level', 'equipment', 'room scale', 'composition'],
    },
    confirmationSource: 'user_explicit',
    confirmedAt: new Date().toISOString(),
  };
}

// Deterministic target functional program for a scene id (mirrors the registry).
function targetFunctionalProgramFor(scene: string): Record<string, unknown> {
  const id = String(scene ?? '').trim().toLowerCase();
  const registry: Record<string, Record<string, unknown>> = {
    consultation: {
      sceneId: 'consultation', sceneLabel: '咨询室',
      requiredFunctions: ['1 对 1 / 1 对 2 专业咨询', '产品 / 服务信息展示与说明'],
      requiredSpatialElements: ['咨询桌或低桌', '2–3 人咨询座位', '半私密或私密边界', '医疗 / 产品信息展示面'],
      circulationRequirements: ['从公共等候区明确进入咨询单元的过渡'],
      privacyRequirements: ['半私密到私密边界', '与公共接待 / 等候区明确区分'],
      scaleRequirements: ['较小尺度、人尺度咨询单元'],
      operationalRequirements: ['咨询过程所需的桌面与座位关系'],
      sourceProgramElementsToDrop: ['大型公共接待台', '大尺度 Lobby 构图', '大面积公共等候区', '前厅式迎宾轴线'],
    },
    entrance: {
      sceneId: 'entrance', sceneLabel: '门店入口',
      requiredFunctions: ['门店到达、识别与欢迎', '进入堂食 / 内部空间的引导'],
      requiredSpatialElements: ['storefront / threshold 门槛', 'arrival sequence 到达序列', 'welcome / host 迎宾点', '入口与内部空间的局部可见关系'],
      circulationRequirements: ['从街道 / 室外到内部的清晰进入路径'],
      privacyRequirements: ['入口开敞、欢迎、透明'],
      scaleRequirements: ['人尺度入口宽度与净高', '街面尺度而非堂食大厅尺度'],
      operationalRequirements: ['迎宾 / 引导可达'],
      sourceProgramElementsToDrop: ['中央开放厨房作为画面主体', '完整堂食大厅布局', '大面积餐桌卡座', '以出餐区为中心的内部运营构图'],
    },
  };
  return registry[id] ?? {
    sceneId: id, sceneLabel: id,
    requiredFunctions: [`生成${id}空间`],
    requiredSpatialElements: [],
    circulationRequirements: [],
    privacyRequirements: [],
    scaleRequirements: ['人尺度'],
    operationalRequirements: [],
    sourceProgramElementsToDrop: ['原场景的大型公共接待台', '原场景的大堂级布局'],
  };
}

function providerPrompt(finalPrompt: string): string {
  return [
    '生成一张完整、可商用的商业空间视觉效果图。',
    '准确执行已确认的品牌规则、中文商业设计语境与交付物职责。',
    `Output aspect ratio: ${ASPECT}. Generate exactly one image.`,
    EPOCH_LABEL,
    finalPrompt,
  ].join('\n');
}

async function compilePhase9B(context: any, task: any) {
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = COMPILER_MODE;
  const compileUrl = pathToFileURL(path.join(REPO_ROOT, 'packages/image-generation-runtime/src/vnext/compile.js')).href;
  const mod = await import(compileUrl) as {
    compileVNextImageGeneration: (input: any) => {
      compiledPrompt: { finalPrompt: string; blocks?: any[]; phase9b?: any };
      payload: any;
    };
  };
  return mod.compileVNextImageGeneration({
    projectContext: context,
    model: MODEL,
    task,
    brandKey: BRAND_KEY,
  });
}

// Optional High-Fidelity reference image (R9 parity): when R85_REFERENCE_IMAGE
// points at a PNG, it is base64-encoded into the Seedream `image` reference
// array so the reference-assisted (High Fidelity) route is exercised end to end.
const REFERENCE_IMAGE = process.env.R85_REFERENCE_IMAGE?.trim() || '';

async function callSeedream(apiKey: string, prompt: string) {
  const t0 = Date.now();
  const imageRefs: string[] = [];
  if (REFERENCE_IMAGE) {
    const buf = readFileSync(REFERENCE_IMAGE);
    // Detect mime by magic bytes so JPEG-backed references (Seedream output
    // files are often named .png but contain JPEG) upload correctly.
    const magic = buf.subarray(0, 4).toString('hex');
    const mime = magic === '89504e47' ? 'image/png'
      : magic.startsWith('ffd8ff') ? 'image/jpeg'
        : 'image/png';
    imageRefs.push(`data:${mime};base64,${buf.toString('base64')}`);
  }
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt,
    size: SIZE,
    response_format: 'b64_json',
    watermark: false,
  };
  if (imageRefs.length) body.image = imageRefs;
  const resp = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsedMs = Date.now() - t0;
  if (!resp.ok) throw new Error(`Seedream ${resp.status}: ${(await resp.text()).slice(0, 800)}`);
  const j = await resp.json() as { data?: Array<{ b64_json?: string; url?: string }>; id?: string; model?: string };
  const item = j.data?.[0];
  if (!item?.b64_json && !item?.url) throw new Error('unexpected response');
  let buffer: Buffer;
  if (item.b64_json) buffer = Buffer.from(item.b64_json, 'base64');
  else buffer = Buffer.from(await (await fetch(item.url!)).arrayBuffer());
  return {
    buffer,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    elapsedMs,
    requestId: j.id,
    modelUsed: j.model,
  };
}

function redactPayload(payload: any): any {
  // Strip anything that could carry a credential; keep request shape for audit.
  const clone = JSON.parse(JSON.stringify(payload ?? {}));
  const redact = (node: any): any => {
    if (!node || typeof node !== 'object') return node;
    for (const key of Object.keys(node)) {
      if (/authorization|api[-_]?key|token|secret|bearer/i.test(key)) {
        node[key] = '[REDACTED]';
      } else if (typeof node[key] === 'object') {
        redact(node[key]);
      }
    }
    return node;
  };
  return redact(clone);
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  emit('START', { REPO_ROOT, OUTPUT_ROOT, projectSuffix, runCount: RUN_COUNT, model: MODEL });
  const projectDir = findProjectDir();
  emit('PROJECT_FOUND', { projectDir });
  const [apiKey, { packet, context }] = await Promise.all([decryptApiKey(), loadPacketContext(projectDir)]);
  emit('INPUTS_READY', {
    apiKeyLength: apiKey.length,
    packetBrand: packet.projectFacts?.brandName?.value,
    functionalNetworkCount: packet.mediaTranslations?.spatial?.functionalNetwork?.length ?? 0,
  });

  const brandRoot = path.join(OUTPUT_ROOT, BRAND_KEY);
  mkdirSync(brandRoot, { recursive: true });

  // Compile once — the prompt is deterministic for the same packet/task.
  const probeTask = makeTask(0, context.projectId);
  emit('COMPILE_START');
  const compiled = await compilePhase9B(context, probeTask);
  const finalPrompt = compiled.compiledPrompt.finalPrompt;
  const blockIds = compiled.compiledPrompt.blocks?.map((b) => b.id) ?? [];
  const promptHash = crypto.createHash('sha256').update(Buffer.from(finalPrompt, 'utf8')).digest('hex');
  const promptChars = [...finalPrompt].length;
  emit('COMPILE_DONE', { chars: promptChars, blocks: blockIds, promptHash });

  const results: Array<{ runIndex: number; dir: string; sha: string; bytes: number; elapsedMs: number; requestId?: string }> = [];

  for (let i = 0; i < RUN_COUNT; i += 1) {
    const scene = `${SCENE_PREFIX}-${i + 1}`;
    const dir = path.join(brandRoot, scene);
    mkdirSync(dir, { recursive: true });
    emit('GENERATE_START', { runIndex: i + 1, scene });

    const providerPreamble = providerPrompt(finalPrompt);
    const gen = await callSeedream(apiKey, providerPreamble);

    const runId = `${RUNID_PREFIX}-${BRAND_KEY}-${SUBTYPE}-${i + 1}-${Date.now()}`;
    const completedAt = new Date().toISOString();
    writeFileSync(path.join(dir, 'output.png'), gen.buffer);
    writeFileSync(path.join(dir, 'prompt.md'), finalPrompt, 'utf8');

    const runRecord = {
      runId,
      baseline: BASELINE_LABEL,
      brandKey: BRAND_KEY,
      scene,
      startedAt,
      completedAt,
      provider: 'volcengine',
      model: MODEL,
      modelUsed: gen.modelUsed,
      requestId: gen.requestId,
      profileId,
      size: SIZE,
      aspectRatio: ASPECT,
      compilerMode: COMPILER_MODE,
      promptChars,
      promptHash,
      referenceCount: REFERENCE_IMAGE ? 1 : 0,
      elapsedMs: gen.elapsedMs,
      imageFile: 'output.png',
      imageSha256: gen.sha256,
      imageBytes: gen.buffer.length,
    };
    writeFileSync(path.join(dir, 'run.json'), `${JSON.stringify(runRecord, null, 2)}\n`, 'utf8');

    writeFileSync(
      path.join(dir, 'provider-payload.redacted.json'),
      `${JSON.stringify(redactPayload({
        model: MODEL,
        size: SIZE,
        response_format: 'b64_json',
        watermark: false,
        image: REFERENCE_IMAGE ? ['data:<detected-mime>;base64,<redacted>'] : undefined,
        prompt: providerPreamble,
        promptChars: [...providerPreamble].length,
      }), null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      path.join(dir, 'reference-trace.json'),
      `${JSON.stringify({
        referenceCount: REFERENCE_IMAGE ? 1 : 0,
        referenceMode: CONTINUATION_MODE ? 'reference_assisted' : (REFERENCE_IMAGE ? 'reference_assisted' : 'text_only'),
        references: REFERENCE_IMAGE
          ? [{
              id: confirmedAssetId(),
              role: 'core_reference',
              source: CONTINUATION_MODE ? 'confirmed_generated_output' : 'user_explicit',
              ...(CONTINUATION_MODE ? { sourceScene: SOURCE_SCENE, targetScene: TARGET_SCENE } : {}),
              projectRelativePath: REFERENCE_IMAGE,
            }]
          : [],
      }, null, 2)}\n`,
      'utf8',
    );

    const manifest = {
      schemaVersion: '1.0',
      baseline: BASELINE_LABEL,
      brandKey: BRAND_KEY,
      brandDisplayName: BRAND_DISPLAY,
      scene,
      type: 'text-only-stability-smoke',
      project: {
        projectId: context.projectId,
        projectDir,
        note: PACKET_PATH
          ? `Frozen ${BRAND_KEY} packet at ${PACKET_PATH}; same compiler input across all runs, references emptied.`
          : 'Live JZMX packet; same compiler input across all 3 runs, references emptied.',
      },
      compiler: {
        id: 'phase9b-quality-compiler',
        mode: COMPILER_MODE,
        // The redirect lives in the source-adapter / semantic layer; this
        // string is the gate label, not a runtime version probe.
        redirect: REDIRECT_LABEL,
      },
      provider: { provider: 'volcengine', model: MODEL, profileId, size: SIZE, aspectRatio: ASPECT },
      referenceIds: REFERENCE_IMAGE ? [confirmedAssetId()] : [],
      taskInstruction: TASK_INSTRUCTION,
      blockIds,
      promptHash,
      output: {
        runId,
        imageFile: 'output.png',
        imageSha256: gen.sha256,
        promptFile: 'prompt.md',
        providerPayloadFile: 'provider-payload.redacted.json',
        referenceTraceFile: 'reference-trace.json',
        runFile: 'run.json',
      },
      evaluation: { file: 'evaluation.json', status: 'pending' },
      createdAt: completedAt,
    };
    writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    results.push({
      runIndex: i + 1, dir, sha: gen.sha256, bytes: gen.buffer.length,
      elapsedMs: gen.elapsedMs, requestId: gen.requestId,
    });
    emit('GENERATE_DONE', { runIndex: i + 1, bytes: gen.buffer.length, sha: gen.sha256, elapsedMs: gen.elapsedMs });
  }

  emit('DONE', { promptChars, promptHash, runs: results });
}

app.whenReady().then(() => main().then(() => app.exit(0)).catch((err) => {
  emit('FAILED', { error: err?.message || String(err), stack: err?.stack });
  app.exit(1);
}));
