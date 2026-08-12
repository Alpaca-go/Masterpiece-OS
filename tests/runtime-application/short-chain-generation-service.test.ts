import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
// These tests exercise the legacy vNext space service path with a V2 context
// (no V5 VisualDecisionPacket); after R7 phase9b_quality is the default, so pin
// the legacy compiler to keep testing that route's service behavior.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'vnext_legacy';
import type {
  ImageGenerationRun,
  ProjectVisualContextShortChain,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { createShortChainGenerationService } from '@masterpiece/runtime-core/application/image-generation/short-chain-service.ts';

const projectId = 'project-vnext-session';
const context: ProjectVisualContextShortChain = {
  schemaVersion: '2.0',
  projectId,
  version: 1,
  generatedAt: '2026-07-29T00:00:00.000Z',
  brandCore: { name: 'Session Brand', industry: 'test', brandRole: null, audience: [] },
  lockedAssets: {
    logoAssetIds: ['logo-asset'],
    brandNameLocked: true,
    confirmedColors: [],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: ['logo-asset'],
    mustPreserve: [],
  },
  visualIdentity: {
    tone: ['clear and warm'],
    colorBehavior: [],
    graphicBehavior: [],
    materialBehavior: [],
    compositionBehavior: [],
    lightingBehavior: [],
  },
  styleBoundaries: { mustAvoid: [], uncertainItems: [] },
  confirmedDecisions: [],
  sourceAssetRefs: [{
    assetId: 'logo-asset',
    name: 'Confirmed Logo',
    relativePath: 'brand/logo.png',
    role: 'source',
  }],
  provenance: {
    builderId: 'test',
    builderVersion: '1',
    sourceKinds: ['project_record'],
    sourceFingerprint: 'session-context-fingerprint',
  },
};

test('vNext session promotes a formal result to a family-scoped implicit anchor', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vnext-session-'));
  const runs = new Map<string, ImageGenerationRun>();
  let latestReferences: Array<{ id: string; role: string; projectRelativePath: string }> = [];
  let latestModelId: string | undefined;
  let latestApiProfileId: string | undefined;
  let counter = 0;
  const imageGeneration = {
    async startCompiledCreativeTask(options: {
      projectId: string;
      references?: Array<{ id: string; role: string; projectRelativePath: string }>;
      modelId?: string;
      apiProfileId?: string;
    }) {
      latestReferences = options.references ?? [];
      latestModelId = options.modelId;
      latestApiProfileId = options.apiProfileId;
      counter += 1;
      const runId = `run-${counter}`;
      const run: ImageGenerationRun = {
        schemaVersion: '1.0',
        runId,
        projectId: options.projectId,
        taskId: `task-${counter}`,
        status: 'succeeded',
        outputType: 'concept_image',
        providerId: 'dashscope',
        modelId: 'seedream-5',
        region: 'beijing',
        createdAt: '2026-07-29T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:01.000Z',
        completedAt: '2026-07-29T00:00:01.000Z',
        gate: { blocked: false, errors: [], warnings: [] },
        images: [{
          imageId: `image-${counter}`,
          relativePath: `images/image-${counter}.png`,
          mimeType: 'image/png',
          sizeBytes: 10,
          sha256: `sha-${counter}`,
          downloadedAt: '2026-07-29T00:00:01.000Z',
        }],
      };
      runs.set(runId, run);
      return run;
    },
    async getRun(runId: string) {
      return runs.get(runId) ?? null;
    },
  };
  let validationCalls = 0;
  const validator = {
    async validate(input: { projectId: string; taskContract: { taskId: string }; runId: string }) {
      validationCalls += 1;
      return {
        schemaVersion: '1.0',
        projectId: input.projectId,
        taskId: input.taskContract.taskId,
        runId: input.runId,
        imageId: `image-${validationCalls + 2}`,
        status: validationCalls === 1 ? 'failed' : 'passed',
        detectedFamily: validationCalls === 1 ? 'vi' : 'poster',
        detectedSubtype: validationCalls === 1 ? 'business_card' : 'brand_key_visual',
        visibleEvidence: ['visible result'],
        missingRequiredItems: [],
        forbiddenItemsFound: validationCalls === 1 ? ['VI display board'] : [],
        lockedAssetViolations: [],
        brandMatch: 'matched',
        mismatchTypes: validationCalls === 1 ? ['wrong_family', 'forbidden_content'] : [],
        retryRecommended: validationCalls === 1,
        validatorId: 'test-validator',
        validatorVersion: '1',
        validatedAt: '2026-07-29T00:00:02.000Z',
      };
    },
  };
  const service = createShortChainGenerationService(
    { paths: async () => ({
      root,
      input: path.join(root, 'input'),
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    {
      getShortChain: async () => context,
      rebuildShortChain: async () => context,
    } as never,
    () => imageGeneration as never,
    () => validator as never,
  );

  const compiled = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  const firstRun = await service.start({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  assert.equal(latestModelId, undefined);
  assert.equal(latestApiProfileId, 'seedream-profile');
  assert.deepEqual(latestReferences, []);
  assert.deepEqual(compiled.payload.referenceAssetIds, []);
  assert.equal(compiled.compiledPrompt.logoUsageMode, 'post_composite');
  const confirmed = await service.confirmDirection(
    projectId,
    firstRun.runId,
    firstRun.images[0]!.imageId,
  );
  assert.equal(confirmed.implicitAnchors.space?.runId, firstRun.runId);
  assert.equal(confirmed.implicitAnchors.packaging, undefined);

  const nextRun = await service.continueSameType(
    projectId,
    'Continue with the same space direction and show a quieter variant.',
  );
  assert.equal(nextRun.status, 'succeeded');
  const nextSession = await service.getSession(projectId);
  assert.equal(nextSession.currentTask?.deliverableFamily, 'space');
  assert.equal(nextSession.history.some((entry) => entry.type === 'direction_confirmed'), true);

  const asset = await service.saveProjectPromptAsset({
    projectId,
    deliverableFamily: 'space',
    name: 'Approved space behavior',
    promptFragments: ['Keep the confirmed spatial restraint.'],
    negativeConstraints: ['ornamental clutter'],
  });
  assert.equal(asset.version, 1);
  assert.equal((await service.getSession(projectId)).projectPromptAssets.space, asset.id);

  await assert.rejects(() => service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception with a clean signage area.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['logo-asset'],
      logoUsageMode: 'blank_area',
    },
  }), (error: unknown) =>
    (error as { code?: string }).code === 'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED');

  // Regression: when a project confirms a logo, `logoUsageMode: 'reference'`
  // must also be rejected. The renderer workspace used to default to this
  // value for every logo-locked project, which made every compile call fail
  // with `LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED`. The default has since
  // been flipped to `post_composite`, but the backend must keep enforcing
  // the contract in case a stale or programmatic caller still sends
  // `reference`.
  await assert.rejects(() => service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Try to use the real logo as a model reference.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['logo-asset'],
      logoUsageMode: 'reference',
    },
  }), (error: unknown) =>
    (error as { code?: string }).code === 'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED');

  const postComposite = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception with a front-facing identity area for exact post-compositing.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['logo-asset'],
      logoUsageMode: 'post_composite',
    },
  });
  assert.deepEqual(postComposite.payload.referenceAssetIds, []);
  assert.equal(postComposite.compiledPrompt.logoUsageMode, 'post_composite');
  assert.match(postComposite.compiledPrompt.finalPrompt, /controlled post-compositing/u);
  assert.equal(
    await fs.stat(path.join(
      postComposite.artifactDirectory,
      'logo-post-composite-plan.json',
    )).then(() => true),
    true,
  );

  const poster = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'poster',
      subtype: 'brand_key_visual',
      shot: 'subject_centered',
      count: 1,
      aspectRatio: '3:4',
      currentInstruction: 'Create one formal brand poster.',
      mustInclude: [],
      mustAvoid: ['VI display board'],
      referenceAssetIds: [],
    },
  });
  const validated = await service.startValidated({
    projectId,
    taskId: poster.taskContract.taskId,
  });
  assert.equal(validated.automaticRetryCount, 1);
  assert.equal(validated.terminalStatus, 'passed');
  assert.equal(validationCalls, 2);
  assert.equal(counter, 4);
});

// Regression: previously `vnext-service.start` trusted the
// `preflightReport` cached in the compile artifact verbatim. That meant
// any change to the preflight gate rules (or any pre-existing compile
// artifact that was written by an older client build) could keep
// surfacing `PROMPT_PREFLIGHT_BLOCKED` even after the underlying
// problem was fixed. The service now transparently re-compiles the
// task using the stored `task-contract.json` + the current context, and
// only raises the block error if the *fresh* preflight still fails.
test('vNext start recompiles when the cached preflight is stale and would otherwise block', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vnext-stale-preflight-'));
  const runs = new Map<string, ImageGenerationRun>();
  const localImageGeneration = {
    async startCompiledCreativeTask(options: { compiledPrompt: string }) {
      const run: ImageGenerationRun = {
        schemaVersion: '1.0',
        runId: `run-${runs.size + 1}`,
        projectId,
        taskId: options.compiledPrompt.slice(0, 4),
        status: 'succeeded',
        outputType: 'concept_image',
        providerId: 'dashscope',
        modelId: 'seedream-5',
        region: 'beijing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        gate: { blocked: false, errors: [], warnings: [] },
        images: [{
          imageId: 'image-1',
          relativePath: 'image-1.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          width: 1024,
          height: 576,
          sha256: 'image-1-sha256',
          downloadedAt: new Date().toISOString(),
        }],
      };
      runs.set(run.runId, run);
      return run;
    },
    async getRun(runId: string) { return runs.get(runId) ?? null; },
    async runRoot() { return path.join(root, 'image-generation'); },
  };
  const localProjects = {
    async paths(_id: string) {
      return {
        root,
        input: path.join(root, 'input'),
        prepared: path.join(root, 'prepared'),
        outputs: path.join(root, 'outputs'),
        runtime: path.join(root, 'runtime'),
      };
    },
    async get() { return { apiProfileId: 'stale-profile' }; },
  } as never;
  const localContext = {
    getShortChain: async () => context,
    rebuildShortChain: async () => context,
  } as never;
  const service = createShortChainGenerationService(
    localProjects,
    localContext,
    () => localImageGeneration as never,
  );

  // Compile once, then poison the cached preflight report so the next
  // start() would block under the old code path.
  const initialCompile = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  const compiledPromptPath = path.join(
    initialCompile.artifactDirectory,
    'compiled-prompt.json',
  );
  const cached = JSON.parse(await fs.readFile(compiledPromptPath, 'utf8'));
  cached.preflightReport = {
    status: 'blocked',
    findings: [
      { code: 'PROJECT_SPECIFICITY_TOO_LOW', severity: 'block' },
      { code: 'GENERIC_INDUSTRY_FALLBACK', severity: 'block' },
    ],
  };
  await fs.writeFile(compiledPromptPath, JSON.stringify(cached, null, 2));

  // Without the regression fix this call would throw
  // `PROMPT_PREFLIGHT_BLOCKED`. With the fix it must transparently
  // re-compile the task using the current context (which carries a
  // valid `visualDecisionPacket`, so the synthesised
  // `projectSpecificDecisions` will be `ready`) and proceed without
  // surfacing the stale block codes.
  const run = await service.start({
    projectId,
    taskId: initialCompile.taskContract.taskId,
    apiProfileId: 'stale-profile',
  });
  assert.equal(run.status, 'succeeded');
  // The recompile must have replaced the on-disk cached preflight
  // report with a passing one; otherwise the next start would still
  // need to recompile.
  const refreshed = JSON.parse(await fs.readFile(compiledPromptPath, 'utf8'));
  assert.equal(refreshed.preflightReport?.status, 'pass');
});

// r2.0 / r10.4 UX regression: previously `vnext-service.start` failed
// closed with `VNEXT_COMPILE_INPUT_STALE` whenever the project context
// fingerprint drifted (e.g. the user added a reference image, re-ran
// analysis, or any other operation that rebuilds the context). The only
// recovery path for the user was "回到报告页 → 强制重新分析", which
// burned the analysis cache for no good reason — the compile contract
// itself is intact, only the cached compile is stale. The service now
// transparently re-compiles using the cached task contract + the
// current context, reusing the same `taskId` so the artifact directory
// is overwritten in place. Only when the *fresh* compile still fails
// to pick up the current context do we surface VNEXT_COMPILE_INPUT_STALE.
test('vNext start recompiles when the project context fingerprint has drifted', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vnext-stale-fingerprint-'));
  const runs = new Map<string, ImageGenerationRun>();
  const localImageGeneration = {
    async startCompiledCreativeTask(options: { compiledPrompt: string }) {
      const run: ImageGenerationRun = {
        schemaVersion: '1.0',
        runId: `run-${runs.size + 1}`,
        projectId,
        taskId: options.compiledPrompt.slice(0, 4),
        status: 'succeeded',
        outputType: 'concept_image',
        providerId: 'dashscope',
        modelId: 'seedream-5',
        region: 'beijing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        gate: { blocked: false, errors: [], warnings: [] },
        images: [{
          imageId: 'image-1',
          relativePath: 'image-1.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          width: 1024,
          height: 576,
          sha256: 'image-1-sha256',
          downloadedAt: new Date().toISOString(),
        }],
      };
      runs.set(run.runId, run);
      return run;
    },
    async getRun(runId: string) { return runs.get(runId) ?? null; },
    async runRoot() { return path.join(root, 'image-generation'); },
  };
  const localProjects = {
    async paths(_id: string) {
      return {
        root,
        input: path.join(root, 'input'),
        prepared: path.join(root, 'prepared'),
        outputs: path.join(root, 'outputs'),
        runtime: path.join(root, 'runtime'),
      };
    },
    async get() { return { apiProfileId: 'fingerprint-profile' }; },
  } as never;
  // The project context will return a NEW fingerprint on the second
  // call. We use a mutable wrapper so the second start() invocation
  // (the one being tested) sees the new fingerprint, while the first
  // compile() invocation saw the original.
  const fingerprintHolder = { value: 'fp-original' };
  const localContext = {
    getShortChain: async () => ({
      ...context,
      provenance: { ...context.provenance, sourceFingerprint: fingerprintHolder.value },
    }),
    rebuildShortChain: async () => ({
      ...context,
      provenance: { ...context.provenance, sourceFingerprint: fingerprintHolder.value },
    }),
  } as never;
  const service = createShortChainGenerationService(
    localProjects,
    localContext,
    () => localImageGeneration as never,
  );

  // Compile once. The cached trace.json now carries the ORIGINAL
  // fingerprint.
  const initialCompile = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  const compiledPromptPath = path.join(
    initialCompile.artifactDirectory,
    'compiled-prompt.json',
  );
  const tracePath = path.join(
    initialCompile.artifactDirectory,
    'trace.json',
  );
  // Sanity: the cached trace.json carries the original fingerprint.
  const cachedTrace = JSON.parse(await fs.readFile(tracePath, 'utf8'));
  assert.equal(cachedTrace.contextFingerprint, 'fp-original');

  // Simulate the project context being rebuilt (e.g. user added a
  // reference image, re-ran analysis). The cached trace.json still
  // holds the OLD fingerprint, so without the regression fix the next
  // start() would throw VNEXT_COMPILE_INPUT_STALE.
  fingerprintHolder.value = 'fp-after-context-rebuild';

  // With the fix this call must transparently re-compile using the
  // current context (which now carries the new fingerprint), overwrite
  // the same artifact directory, and proceed without surfacing the
  // stale-fingerprint error to the user.
  const run = await service.start({
    projectId,
    taskId: initialCompile.taskContract.taskId,
    apiProfileId: 'fingerprint-profile',
  });
  assert.equal(run.status, 'succeeded');
  // The recompile must have replaced the on-disk cached trace.json
  // with one that carries the NEW fingerprint. Otherwise the next
  // start would still need to recompile.
  const refreshedTrace = JSON.parse(await fs.readFile(tracePath, 'utf8'));
  assert.equal(refreshedTrace.contextFingerprint, 'fp-after-context-rebuild');
  // The compiled-prompt.json also has to reflect the new context
  // (so any preflight / continuity check that reads from it sees
  // consistent state).
  const refreshed = JSON.parse(await fs.readFile(compiledPromptPath, 'utf8'));
  assert.equal(refreshed.preflightReport?.status, 'pass');
});
