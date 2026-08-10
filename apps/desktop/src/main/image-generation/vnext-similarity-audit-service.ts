import crypto from 'node:crypto';
import path from 'node:path';
import type {
  VNextReferenceSceneRelation,
  VNextSimilarityAuditResult,
  VNextSimilarityAuditScores,
} from '@masterpiece/image-generation-contracts/index.ts';
import { assertVNextSimilarityAudit } from '@masterpiece/image-generation-contracts/index.ts';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import type { ProjectStore } from '../project-store.ts';
import type { ProjectContextService } from '../project-context-service.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';

// r2.0 §6.7 / Phase F-2: Similarity Audit Service.
//
// Goal: produce a 6-dimension similarity audit for a generated image
// versus its reference image(s), using a real multimodal LLM (the
// r2.0 plan EXPLICITLY forbids file-hash / perceptual-hash only:
// 不**仅**使用文件哈希 / 感知哈希判断复制。**必须**结合多模态 LLM 看图审计).
//
// The service is the SINGLE call site for the audit in production.
// It is invoked by vnext-service.startValidated (Phase F-3) for
// `reference_first` + `cross_scene` runs only. Standard / continuation
// runs are not audited.
//
// Design choices (r2.0 §6.7, locked at F-1 commit time):
//   - 6 dimensions, all integer 1..5 (helper throws on out-of-range / non-integer)
//   - First 5 dims must be >= 4; nearCopyRisk (inverted) must be <= 2.5
//   - Overall pass = ALL 6 dims pass individually
//   - Audit is ADVISORY: it does NOT block flowState. The result is
//     attached to VNextValidatedGenerationResult.similarityAudit for
//     the UI / smoke to surface; failures are recorded as-is.
//   - Single round-trip: reuses the F-1 audit-helper to validate the
//     6 raw scores the LLM returned.
//   - llmCallCount is recorded so UI / smoke can budget retries.
//
// The service is factory-shaped to match vnext-deliverable-validator-
// service. The reasoner is INJECTED through the factory so unit tests
// can swap a deterministic mock without touching the network.

interface Credentials {
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol?: string;
}

export interface VNextSimilarityAuditInput {
  projectId: string;
  runId: string;
  /** Phase E invariant: the audit always uses the FIRST image of the run. */
  imageId?: string;
  /** Reference images that the generated image should be related to (but not copy). */
  references: ReadonlyArray<{ assetId: string; projectRelativePath: string }>;
  /** Scene metadata — keeps the audit grounded in the actual request. */
  targetScene: {
    family: string;
    subtype: string;
    shot?: string;
    mustInclude?: ReadonlyArray<string>;
    mustAvoid?: ReadonlyArray<string>;
  };
  /** Auxiliary metadata; does NOT change scoring math. */
  referenceSceneRelation?: VNextReferenceSceneRelation;
  /** Optional caller-supplied audit id; default = random uuid. */
  auditId?: string;
  /** Optional caller-supplied multimodal-analysis profile override. */
  auditProfileId?: string;
  /** Per-run reasoner profile override; takes priority over settings lookup. */
  reasonerProfileId?: string;
}

/**
 * Public settings shape that the audit service depends on. Defined
 * here (rather than imported from shared/types) so the factory can be
 * unit-tested with a minimal mock.
 */
interface PublicSettingsLike {
  profiles: Array<{
    id: string;
    isEnabled?: boolean;
    hasApiKey?: boolean;
    modelType?: string;
    protocol?: string;
  }>;
}

/**
 * Reasoner signature (a subset of the qwen-reasoner's call shape).
 * Kept narrow so a test can pass a deterministic stub.
 */
export type VNextSimilarityAuditReasoner = (input: {
  prompt: {
    messages: Array<{ role: 'system' | 'user'; content: string | string[] }>;
    attachments: Array<{
      assetId: string;
      path: string;
      mediaType: string;
      format: string;
      readable: boolean;
    }>;
  };
  signal?: AbortSignal;
  maximumDurationMs?: number;
}) => Promise<{
  reportMarkdown: string;
  provider: string;
  model: string;
  runId: string;
}>;

interface AuditDeps {
  projects: ProjectStore;
  getImageGeneration: () => ImageGenerationService;
  readSettings: () => Promise<PublicSettingsLike>;
  readCredentials: (profileId?: string) => Promise<Credentials>;
  projectContext?: ProjectContextService;
  /**
   * Reasoner factory. Defaults to createQwenReasoner from
   * @masterpiece/model-runtime. Override in tests.
   */
  createReasoner?: (credentials: Credentials) => VNextSimilarityAuditReasoner;
  /** Clock for metadata.auditedAt. Override in tests. */
  now?: () => Date;
}

const MAX_REASONER_DURATION_MS = 120_000;
const MAX_REFERENCES_PER_AUDIT = 4;

function parseJson(value: string): Record<string, unknown> {
  const clean = value.trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  const parsed = JSON.parse(clean);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Similarity audit reasoner returned a non-object result');
  }
  return parsed as Record<string, unknown>;
}

function readScore(value: unknown, key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`VNextSimilarityAudit: ${key} must be an integer; got ${JSON.stringify(value)}`);
  }
  if (value < 1 || value > 5) {
    throw new Error(`VNextSimilarityAudit: ${key} must be in 1..5; got ${value}`);
  }
  return value;
}

function buildAuditPrompt(input: {
  targetScene: VNextSimilarityAuditInput['targetScene'];
  referenceSceneRelation: VNextReferenceSceneRelation;
  referenceCount: number;
  generatedDescription: string;
}): { system: string; userLines: string[] } {
  const system =
    'You audit a generated image versus its reference image(s). '
    + 'Score 6 dimensions, each an INTEGER 1..5 (no half-values, no strings, no nulls). '
    + 'Return strict JSON with no markdown fences. '
    + 'NEVER use a file-hash or perceptual-hash shortcut. You must look at the actual pixels.';

  const userLines: string[] = [
    'Audit this single generated image. Inspect only the visible pixels.',
    '',
    `Reference images provided: ${input.referenceCount}`,
    `Reference scene relation: ${input.referenceSceneRelation}`,
    '',
    `Target scene: ${input.targetScene.family} / ${input.targetScene.subtype}`,
    `Requested shot: ${input.targetScene.shot || '(not specified)'}`,
    `Must include: ${(input.targetScene.mustInclude || []).join('; ') || '(none)'}`,
    `Must avoid: ${(input.targetScene.mustAvoid || []).join('; ') || '(none)'}`,
    '',
    `Generated image context: ${input.generatedDescription}`,
    '',
    'Score each dimension as an INTEGER 1..5.',
    '- visualWorldFidelity: does the generated image carry the reference image\'s design language (material / light / color / surface / form rhythm)? 1 = no shared design language, 5 = strongly aligned design language.',
    '- sceneAccuracy: does the generated image\'s functional program / spatial type match the requested target scene? 1 = wrong program, 5 = correct program.',
    '- functionalRealism: is the spatial program credible / human-scale / usable? 1 = not credible, 5 = fully credible.',
    '- targetSceneAuthority: does the generated image treat the TARGET scene as the function layer authority (not a re-cast of the reference\'s scene)? 1 = reference scene won, 5 = target scene won.',
    '- referenceAlignment: does the generated image retain enough reference identity to be recognizably related, without being 1:1 copied? 1 = no recognizable relation, 5 = clearly related but not 1:1.',
    '- nearCopyRisk (INVERTED): 1 = clearly different from reference, 5 = essentially a 1:1 copy. High = bad.',
    '',
    'Return exactly this JSON shape:',
    JSON.stringify({
      visualWorldFidelity: 1,
      sceneAccuracy: 1,
      functionalRealism: 1,
      targetSceneAuthority: 1,
      referenceAlignment: 1,
      nearCopyRisk: 1,
      rationale: 'free-form text explaining each score with visible evidence',
    }),
    '',
    'If you cannot prove a field from visible pixels, return 1 for that field and explain why in rationale.',
  ];
  return { system, userLines };
}

function selectAuditProfile(
  settings: PublicSettingsLike,
  overrideProfileId?: string,
): string | null {
  if (overrideProfileId) {
    return overrideProfileId;
  }
  const profile = settings.profiles.find((candidate) =>
    candidate.isEnabled
    && candidate.hasApiKey
    && candidate.modelType === 'analysis'
    && candidate.protocol === 'openai-chat-multimodal',
  );
  return profile?.id ?? null;
}

function defaultCreateReasoner(credentials: Credentials): VNextSimilarityAuditReasoner {
  const reasoner = createQwenReasoner({
    apiKey: credentials.apiKey,
    model: credentials.model,
    baseUrl: credentials.baseUrl,
  });
  // The qwen-reasoner factory has a flexible signature. We narrow it
  // to VNextSimilarityAuditReasoner so callers (and tests) get a
  // stable shape.
  return (async (input) => {
    const response = await reasoner({
      prompt: input.prompt as Parameters<typeof reasoner>[0]['prompt'],
      ...(input.signal ? { signal: input.signal } : {}),
      maximumDurationMs: input.maximumDurationMs ?? MAX_REASONER_DURATION_MS,
    });
    return {
      reportMarkdown: response.reportMarkdown,
      provider: response.provider,
      model: response.model,
      runId: response.runId,
    };
  }) as VNextSimilarityAuditReasoner;
}

export function createVNextSimilarityAuditService(deps: AuditDeps) {
  const createReasoner = deps.createReasoner ?? defaultCreateReasoner;
  const now = deps.now ?? (() => new Date());

  async function persist(
    projectId: string,
    runId: string,
    result: VNextSimilarityAuditResult,
  ): Promise<{ path: string }> {
    const runRoot = await deps.getImageGeneration().runRoot(runId);
    if (!runRoot) {
      throw Object.assign(
        new Error('Image run directory is missing for similarity-audit persistence'),
        { code: 'VNEXT_SIMILARITY_AUDIT_RUN_ROOT_MISSING' },
      );
    }
    const target = path.join(runRoot, 'similarity-audit.json');
    const write = await atomicWriteJsonWithRetry(target, result);
    if (!write.success) {
      throw Object.assign(
        new Error(write.errorMessage ?? 'Similarity-audit result write failed'),
        { code: 'VNEXT_SIMILARITY_AUDIT_WRITE_FAILED' },
      );
    }
    return { path: target };
  }

  async function audit(input: VNextSimilarityAuditInput): Promise<VNextSimilarityAuditResult> {
    if (input.references.length === 0) {
      throw Object.assign(
        new Error('Similarity audit requires at least one reference image'),
        { code: 'VNEXT_SIMILARITY_AUDIT_REFERENCES_EMPTY' },
      );
    }
    if (input.references.length > MAX_REFERENCES_PER_AUDIT) {
      throw Object.assign(
        new Error(`Similarity audit accepts at most ${MAX_REFERENCES_PER_AUDIT} reference images; got ${input.references.length}`),
        { code: 'VNEXT_SIMILARITY_AUDIT_REFERENCES_TOO_MANY' },
      );
    }
    const run = await deps.getImageGeneration().getRun(input.runId);
    if (!run || run.projectId !== input.projectId) {
      throw Object.assign(
        new Error('Generated run not found for similarity audit'),
        { code: 'VNEXT_SIMILARITY_AUDIT_RUN_MISSING' },
      );
    }
    if (run.status !== 'succeeded' || !run.images[0]) {
      throw Object.assign(
        new Error('Similarity audit requires a succeeded run with at least one image'),
        { code: 'VNEXT_SIMILARITY_AUDIT_RUN_INVALID' },
      );
    }
    // Phase E invariant: the audit always reads the FIRST image. If a
    // caller passes a different imageId we still audit the first;
    // passing a non-first imageId is rejected to keep the contract
    // honest.
    const firstImage = input.imageId
      ? run.images.find((candidate) => candidate.imageId === input.imageId)
      : run.images[0];
    if (!firstImage) {
      throw Object.assign(
        new Error('Requested image does not exist on the run'),
        { code: 'VNEXT_SIMILARITY_AUDIT_IMAGE_MISSING' },
      );
    }
    if (input.imageId && firstImage.imageId !== run.images[0]?.imageId) {
      throw Object.assign(
        new Error('Similarity audit must run on the FIRST image of the run (Phase E invariant)'),
        { code: 'VNEXT_SIMILARITY_AUDIT_IMAGE_NOT_FIRST' },
      );
    }
    const runRoot = await deps.getImageGeneration().runRoot(input.runId);
    if (!runRoot) {
      throw Object.assign(
        new Error('Image run directory is missing'),
        { code: 'VNEXT_SIMILARITY_AUDIT_RUN_ROOT_MISSING' },
      );
    }
    const projectPaths = await deps.projects.paths(input.projectId);
    const generatedImagePath = path.join(runRoot, firstImage.relativePath);

    // Resolve reference image paths. The caller passes project-relative
    // paths; we absolutize them against project root.
    const referenceAttachments = input.references.slice(0, MAX_REFERENCES_PER_AUDIT).map((reference) => {
      const absolute = path.join(projectPaths.root, reference.projectRelativePath);
      return {
        assetId: reference.assetId,
        path: absolute,
        mediaType: 'image',
        format: path.extname(absolute).slice(1) || 'png',
        readable: true,
      };
    });

    const settings = await deps.readSettings();
    const auditProfileId = selectAuditProfile(
      settings,
      input.auditProfileId ?? input.reasonerProfileId,
    );
    if (!auditProfileId) {
      throw Object.assign(
        new Error('Similarity audit requires a multimodal analysis profile with an API key'),
        { code: 'VNEXT_SIMILARITY_AUDIT_PROFILE_MISSING' },
      );
    }
    const credentials = await deps.readCredentials(auditProfileId);
    if (credentials.protocol && credentials.protocol !== 'openai-chat-multimodal') {
      throw Object.assign(
        new Error('Similarity audit requires a multimodal analysis profile'),
        { code: 'VNEXT_SIMILARITY_AUDIT_PROFILE_INCOMPATIBLE' },
      );
    }

    const reasoner = createReasoner(credentials);
    const { system, userLines } = buildAuditPrompt({
      targetScene: input.targetScene,
      referenceSceneRelation: input.referenceSceneRelation ?? 'unknown',
      referenceCount: referenceAttachments.length,
      generatedDescription:
        `1 generated image, format=${path.extname(generatedImagePath).slice(1) || 'png'}, `
        + `dimensions=${firstImage.width || '?'}x${firstImage.height || '?'}`,
    });

    const response = await reasoner({
      prompt: {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userLines },
        ],
        // Reference images go first (the model reads them as context),
        // then the generated image (the one being audited).
        attachments: [
          ...referenceAttachments,
          {
            assetId: firstImage.imageId,
            path: generatedImagePath,
            mediaType: 'image',
            format: path.extname(generatedImagePath).slice(1) || 'png',
            readable: true,
          },
        ],
      },
      maximumDurationMs: MAX_REASONER_DURATION_MS,
    });

    const evidence = parseJson(response.reportMarkdown);
    // Map the LLM's free-form JSON to the 6 raw scores. Use the
    // assertVNextSimilarityAudit helper from F-1 to do the integer /
    // range validation. If the LLM returns anything out of range, the
    // helper throws — the audit result is invalid and we propagate.
    const scores: VNextSimilarityAuditScores = {
      visualWorldFidelity: readScore(evidence.visualWorldFidelity, 'visualWorldFidelity'),
      sceneAccuracy: readScore(evidence.sceneAccuracy, 'sceneAccuracy'),
      functionalRealism: readScore(evidence.functionalRealism, 'functionalRealism'),
      targetSceneAuthority: readScore(evidence.targetSceneAuthority, 'targetSceneAuthority'),
      referenceAlignment: readScore(evidence.referenceAlignment, 'referenceAlignment'),
      nearCopyRisk: readScore(evidence.nearCopyRisk, 'nearCopyRisk'),
    };
    const pass = assertVNextSimilarityAudit(scores);
    const rationale = typeof evidence.rationale === 'string'
      ? evidence.rationale.slice(0, 4000)
      : '';
    const auditId = input.auditId ?? crypto.randomUUID();
    const auditedAt = now().toISOString();

    const result: VNextSimilarityAuditResult = {
      scores,
      pass,
      rationale,
      metadata: {
        auditId,
        projectId: input.projectId,
        runId: input.runId,
        modelUsed: response.model,
        auditedAt,
      },
      // r2.0 §6.7: budget the cost. Single round-trip today; if a
      // future revision adds retries, the runner increments this.
      llmCallCount: 1,
    };
    await persist(input.projectId, input.runId, result);
    return result;
  }

  return { audit };
}

export type VNextSimilarityAuditService = ReturnType<typeof createVNextSimilarityAuditService>;
