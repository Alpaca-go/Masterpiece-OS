import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import type {
  ImageGenerationRun,
  ProjectVisualContextShortChain,
} from '../src/shared/types.ts';
import { createShortChainImageGenerationService } from '../src/main/image-generation/short-chain-service.ts';

const projectId = 'project-short-chain-session';
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
  }, {
    assetId: 'identity-asset',
    name: 'Locked Mascot',
    relativePath: 'brand/mascot.png',
    role: 'identity',
  }],
  provenance: {
    builderId: 'test',
    builderVersion: '1',
    sourceKinds: ['project_record'],
    sourceFingerprint: 'session-context-fingerprint',
  },
};

test('Short-Chain session promotes a formal result to a family-scoped implicit anchor', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-short-chain-session-'));
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
  const service = createShortChainImageGenerationService(
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
  const firstValidated = await service.startValidated({
    projectId,
    taskId: compiled.taskContract.taskId,
    apiProfileId: 'seedream-profile',
  });
  const firstRun = firstValidated.correctionRun ?? firstValidated.initialRun;
  assert.equal(latestModelId, undefined);
  assert.equal(latestApiProfileId, 'seedream-profile');
  assert.deepEqual(latestReferences, []);
  assert.deepEqual(compiled.payload.referenceAssetIds, []);
  assert.equal(compiled.compiledPrompt.logoUsageMode, 'blank_area');
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
  await assert.rejects(() => service.confirmDirection(
    projectId,
    nextRun.runId,
    nextRun.images[0]!.imageId,
  ), (error: unknown) => (
    (error as { code?: string }).code === 'SHORT_CHAIN_DIRECTION_VALIDATION_REQUIRED'
  ));
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

  const selectedLogo = await service.compile({
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
      brandMarkRenderMode: 'locked_asset_render',
      materialMode: 'front_lit_acrylic',
      brandIntensity: 'balanced',
      logoUsageMode: 'blank_area',
    },
  });
  assert.equal(selectedLogo.compiledPrompt.logoUsageMode, 'reference');
  assert.equal(selectedLogo.taskContract.brandMarkRenderMode, 'locked_asset_render');
  assert.equal(selectedLogo.taskContract.materialMode, 'front_lit_acrylic');
  assert.equal(selectedLogo.taskContract.brandIntensity, 'balanced');
  assert.equal(selectedLogo.compiledPrompt.lockedAssetPlacementPlan?.placements.length, 1);
  assert.equal(selectedLogo.compiledPrompt.lockedAssetPlacementPlan?.placements[0]?.zone, 'reception_back_wall');
  assert.deepEqual(selectedLogo.payload.referenceAssetIds, ['logo-asset']);
  assert.match(selectedLogo.compiledPrompt.finalPrompt, /MANDATORY SELECTED VISUAL ASSET 1: Provider reference image 1: Confirmed Logo/u);
  assert.match(selectedLogo.compiledPrompt.finalPrompt, /prominent, camera-visible brand touchpoint/u);
  assert.match(selectedLogo.compiledPrompt.finalPrompt, /palette, lighting, line rhythm, geometry or mood alone does not count/u);
  assert.match(selectedLogo.compiledPrompt.finalPrompt, /front-lit acrylic/u);
  assert.match(selectedLogo.compiledPrompt.finalPrompt, /one primary asset and no competing focal points/u);
  assert.equal(await fs.stat(path.join(
    selectedLogo.artifactDirectory,
    'locked-asset-placement-plan.json',
  )).then(() => true), true);

  const logoAndIp = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception with the selected Logo and IP in a clear hierarchy.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['logo-asset', 'identity-asset'],
      brandMarkRenderMode: 'locked_asset_render',
      materialMode: 'metal_dimensional',
      brandIntensity: 'balanced',
      logoUsageMode: 'reference',
    },
  });
  assert.deepEqual(
    logoAndIp.compiledPrompt.lockedAssetPlacementPlan?.placements.map((item) => item.role),
    ['primary_signage', 'hero_installation'],
  );
  assert.equal(new Set(
    logoAndIp.compiledPrompt.lockedAssetPlacementPlan?.placements.map((item) => item.zone),
  ).size, 2);
  assert.match(logoAndIp.compiledPrompt.finalPrompt, /one primary asset and no competing focal points/u);

  await assert.rejects(() => service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Use a missing identity reference.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['missing-ip-asset'],
      logoUsageMode: 'post_composite',
    },
  }), (error: unknown) =>
    (error as { code?: string }).code === 'SHORT_CHAIN_REFERENCE_ASSET_INVALID');

  const migratedPostComposite = await service.compile({
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
  assert.deepEqual(migratedPostComposite.payload.referenceAssetIds, ['logo-asset']);
  assert.equal(migratedPostComposite.taskContract.brandMarkRenderMode, 'locked_asset_render');
  assert.equal(migratedPostComposite.compiledPrompt.logoUsageMode, 'reference');
  assert.match(migratedPostComposite.compiledPrompt.finalPrompt, /MANDATORY SELECTED VISUAL ASSET 1/u);
  assert.doesNotMatch(migratedPostComposite.compiledPrompt.finalPrompt, /controlled post-compositing/u);

  const identityBound = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception that visibly integrates the locked mascot.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['identity-asset'],
      logoUsageMode: 'post_composite',
    },
  });
  assert.match(identityBound.compiledPrompt.finalPrompt, /MANDATORY SELECTED VISUAL ASSET 1: Provider reference image 1: Locked Mascot/u);
  assert.match(identityBound.compiledPrompt.finalPrompt, /selected identity\/IP character/u);
  assert.equal(identityBound.compiledPrompt.lockedAssetPlacementPlan?.placements[0]?.assetType, 'ip_character');
  assert.equal(identityBound.compiledPrompt.lockedAssetPlacementPlan?.placements[0]?.role, 'hero_installation');
  assert.match(identityBound.compiledPrompt.finalPrompt, /head-to-body proportion range/u);
  assert.doesNotMatch(identityBound.compiledPrompt.finalPrompt, /Do not render any logo, letters, words, or signage copy/u);

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
  assert.equal(validated.automaticRetryCount, 0);
  assert.equal(validated.terminalStatus, 'passed');
  assert.equal(validationCalls, 3);
  assert.equal(counter, 4);
});

// Regression: previously `short-chain-service.start` trusted the
// `preflightReport` cached in the compile artifact verbatim. That meant
// any change to the preflight gate rules (or any pre-existing compile
// artifact that was written by an older client build) could keep
// surfacing `PROMPT_PREFLIGHT_BLOCKED` even after the underlying
// problem was fixed. The service now transparently re-compiles the
// task using the stored `task-contract.json` + the current context, and
// only raises the block error if the *fresh* preflight still fails.
test('Short-Chain start recompiles when the cached preflight is stale and would otherwise block', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-short-chain-stale-preflight-'));
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
  const service = createShortChainImageGenerationService(
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

test('Short-Chain validates the effective edited prompt before calling the provider', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-short-chain-effective-prompt-'));
  let providerCalls = 0;
  const service = createShortChainImageGenerationService(
    {
      async paths() {
        return {
          root,
          input: path.join(root, 'input'),
          prepared: path.join(root, 'prepared'),
          outputs: path.join(root, 'outputs'),
          runtime: path.join(root, 'runtime'),
        };
      },
      async get() { return { apiProfileId: 'image-profile' }; },
    } as never,
    {
      getShortChain: async () => context,
      rebuildShortChain: async () => context,
    } as never,
    () => ({
      async startCompiledCreativeTask() {
        providerCalls += 1;
        throw new Error('provider must not be called');
      },
    }) as never,
  );
  const compiled = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'poster',
      subtype: 'brand_key_visual',
      shot: 'subject_centered',
      count: 1,
      aspectRatio: '3:4',
      currentInstruction: 'Create one formal brand poster.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  await assert.rejects(() => service.start({
    projectId,
    taskId: compiled.taskContract.taskId,
    editedPrompt: 'x'.repeat(7_501),
  }), (error: unknown) => (
    (error as { code?: string }).code === 'PROMPT_CHARACTER_BUDGET_EXCEEDED'
  ));
  assert.equal(providerCalls, 0);
  const artifact = await fs.stat(path.join(
    compiled.artifactDirectory,
    'effective-prompt.json',
  )).then(() => true).catch(() => false);
  assert.equal(artifact, false);
});

test('Short-Chain repairs then falls back for a locked Logo without regenerating the space', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-short-chain-logo-repair-'));
  const inputRoot = path.join(root, 'input');
  const runRoot = path.join(root, 'image-generation', 'run-logo');
  const scenePath = path.join(runRoot, 'images', 'image-01.png');
  const logoPath = path.join(inputRoot, 'brand', 'logo.png');
  await fs.mkdir(path.dirname(scenePath), { recursive: true });
  await fs.mkdir(path.dirname(logoPath), { recursive: true });
  await sharp({ create: { width: 960, height: 540, channels: 3, background: '#cbc6bc' } })
    .png().toFile(scenePath);
  await sharp(Buffer.from('<svg width="260" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="260" height="90" rx="12" fill="#54239c"/><circle cx="48" cy="45" r="28" fill="#4fc52b"/><rect x="95" y="25" width="135" height="40" fill="white"/></svg>'))
    .png().toFile(logoPath);
  const originalPixels = await fs.readFile(scenePath);
  let providerCalls = 0;
  let validationCalls = 0;
  const run: ImageGenerationRun = {
    schemaVersion: '1.0',
    runId: 'run-logo',
    projectId,
    taskId: 'provider-task-logo',
    status: 'succeeded',
    outputType: 'concept_image',
    providerId: 'dashscope',
    modelId: 'test-image-model',
    region: 'beijing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    gate: { blocked: false, errors: [], warnings: [] },
    images: [{
      imageId: 'image-01',
      relativePath: 'images/image-01.png',
      mimeType: 'image/png',
      sizeBytes: originalPixels.byteLength,
      sha256: 'original-scene',
      downloadedAt: new Date().toISOString(),
    }],
  };
  const repairContext: ProjectVisualContextShortChain = {
    ...context,
    sourceAssetRefs: [{
      assetId: 'logo-asset',
      name: 'Confirmed Logo',
      relativePath: 'brand/logo.png',
      role: 'logo',
    }],
  };
  const service = createShortChainImageGenerationService(
    { paths: async () => ({
      root,
      input: inputRoot,
      prepared: path.join(root, 'prepared'),
      outputs: path.join(root, 'outputs'),
      runtime: path.join(root, 'runtime'),
    }) } as never,
    {
      getShortChain: async () => repairContext,
      rebuildShortChain: async () => repairContext,
    } as never,
    () => ({
      async startCompiledCreativeTask() {
        providerCalls += 1;
        return run;
      },
      async getRun() { return run; },
      async runRoot() { return runRoot; },
    }) as never,
    () => ({
      async validate() {
        validationCalls += 1;
        if (validationCalls === 2) assert.notDeepEqual(await fs.readFile(scenePath), originalPixels);
        return {
          schemaVersion: '1.0',
          projectId,
          taskId: 'short-chain-logo-task',
          runId: run.runId,
          imageId: 'image-01',
          status: validationCalls < 4 ? 'failed' : 'passed',
          detectedFamily: 'space',
          detectedSubtype: 'reception',
          visibleEvidence: [],
          missingRequiredItems: [],
          forbiddenItemsFound: [],
          lockedAssetViolations: validationCalls < 4 ? ['Logo contour was altered'] : [],
          brandMatch: 'matched',
          brandToneMatch: 'matched',
          sceneCompleteness: 'complete',
          logoTextStatus: validationCalls < 4 ? 'incorrect' : 'correct',
          qualityIssues: [],
          mismatchTypes: validationCalls < 4 ? ['locked_asset_violation', 'logo_text_error'] : [],
          retryRecommended: validationCalls === 1,
          validatorId: 'test-validator',
          validatorVersion: '1',
          validatedAt: new Date().toISOString(),
        };
      },
    }) as never,
  );
  const compiled = await service.compile({
    projectId,
    task: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception with one large locked Logo on the back wall.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: ['logo-asset'],
      brandMarkRenderMode: 'locked_asset_render',
      materialMode: 'front_lit_acrylic',
      brandIntensity: 'balanced',
      logoUsageMode: 'reference',
    },
  });
  const result = await service.startValidated({ projectId, taskId: compiled.taskContract.taskId });
  assert.equal(providerCalls, 1);
  assert.equal(validationCalls, 4);
  assert.equal(result.localRepairApplied, true);
  assert.equal(result.localRepairAttempts, 2);
  assert.equal(result.fallbackApplied, true);
  assert.equal(result.terminalStatus, 'passed');
  assert.equal(result.correctionRun?.runId, run.runId);
  const debug = JSON.parse(await fs.readFile(path.join(
    root,
    'image-generation-short-chain',
    'validations',
    'run-logo.locked-assets-debug.json',
  ), 'utf8'));
  assert.deepEqual(debug.passes.map((item: { type: string }) => item.type), [
    'base_scene',
    'local_repair',
    'local_repair',
    'fallback_composite',
  ]);
  assert.equal(debug.finalStatus, 'passed_with_fallback');
  assert.deepEqual(debug.selectedAssets, ['logo-asset']);
});
