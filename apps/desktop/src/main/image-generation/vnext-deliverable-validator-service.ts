import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  PublicSettings,
  VNextDeliverableValidation,
  VNextTaskContract,
} from '../../shared/types.ts';
import { validateVNextDeliverableEvidence } from '@masterpiece/image-generation-runtime/vnext/index.js';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import type { ProjectStore } from '../project-store.ts';
import type { ProjectContextService } from '../project-context-service.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import type { ImageGenerationService } from './service.ts';

interface Credentials {
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol?: string;
}

interface ValidateInput {
  projectId: string;
  taskContract: VNextTaskContract;
  runId: string;
  validatorProfileId?: string;
}

function parseJson(value: string): Record<string, unknown> {
  const clean = value.trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  const parsed = JSON.parse(clean);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Deliverable validator returned a non-object result');
  }
  return parsed as Record<string, unknown>;
}

export function createVNextDeliverableValidatorService(
  projects: ProjectStore,
  getImageGeneration: () => ImageGenerationService,
  readSettings: () => Promise<PublicSettings>,
  readCredentials: (profileId?: string) => Promise<Credentials>,
  projectContext?: ProjectContextService,
) {
  async function persist(
    projectId: string,
    runId: string,
    value: unknown,
  ): Promise<void> {
    const target = path.join(
      (await projects.paths(projectId)).root,
      'image-generation-vnext',
      'validations',
      `${runId}.json`,
    );
    const write = await atomicWriteJsonWithRetry(target, value);
    if (!write.success) throw new Error(write.errorMessage ?? 'Validation result write failed');
  }

  async function validate(input: ValidateInput): Promise<VNextDeliverableValidation> {
    const run = await getImageGeneration().getRun(input.runId);
    if (!run || run.projectId !== input.projectId || run.status !== 'succeeded' || !run.images[0]) {
      throw Object.assign(new Error('A succeeded image run is required for deliverable validation'), {
        code: 'VNEXT_VALIDATION_RUN_INVALID',
      });
    }
    const image = run.images[0];
    const settings = await readSettings();
    const validatorProfileId = input.validatorProfileId
      || settings.profiles.find((profile) =>
        profile.isEnabled
        && profile.hasApiKey
        && profile.modelType === 'analysis'
        && profile.protocol === 'openai-chat-multimodal')?.id;
    if (!validatorProfileId) {
      const validation = validateVNextDeliverableEvidence({
        projectId: input.projectId,
        taskContract: input.taskContract,
        runId: run.runId,
        imageId: image.imageId,
        evidence: {},
      }) as VNextDeliverableValidation;
      await persist(input.projectId, run.runId, validation);
      return validation;
    }
    const credentials = await readCredentials(validatorProfileId);
    if (credentials.protocol !== 'openai-chat-multimodal') {
      throw Object.assign(new Error('Deliverable validation requires a multimodal analysis profile'), {
        code: 'VNEXT_VALIDATOR_PROFILE_INCOMPATIBLE',
      });
    }
    const runRoot = await getImageGeneration().runRoot(run.runId);
    if (!runRoot) throw new Error('Image run directory is missing');
    const imagePath = path.join(runRoot, image.relativePath);
    const context = await projectContext?.getVNext(input.projectId).catch(() => undefined);
    const promptSource = context?.promptSourceObject;
    const targetTone = promptSource?.upgradeTranslation.toneBoundaries
      .map((item) => item.target)
      .filter(Boolean)
      .join('; ')
      || context?.visualIdentity.tone.join('; ')
      || '(not confirmed)';
    const toneAvoid = promptSource?.upgradeTranslation.toneBoundaries
      .flatMap((item) => item.avoid)
      .join('; ')
      || '(none confirmed)';
    const lockedRequirements = [
      ...(context?.lockedAssets.mustPreserve ?? []),
      ...(promptSource?.lockedAssets.mustPreserve ?? []),
    ];
    const reasoner = createQwenReasoner({
      apiKey: credentials.apiKey,
      model: credentials.model,
      baseUrl: credentials.baseUrl,
    });
    const response = await reasoner({
      prompt: {
        messages: [
          {
            role: 'system',
            content: 'You validate whether a generated image matches its requested deliverable. Inspect only visible image evidence. Return strict JSON without markdown.',
          },
          {
            role: 'user',
            content: [
              `Requested family: ${input.taskContract.deliverableFamily}`,
              `Requested subtype: ${input.taskContract.subtype}`,
              `Requested shot/composition: ${input.taskContract.shot}`,
              `Must include: ${input.taskContract.mustInclude.join('; ') || '(none)'}`,
              `Must avoid: ${input.taskContract.mustAvoid.join('; ') || '(none)'}`,
              `Logo mode: ${input.taskContract.logoUsageMode || 'blank_area'}`,
              `Confirmed brand tone: ${targetTone}`,
              `Tone boundaries to avoid: ${toneAvoid}`,
              `Locked visible requirements: ${lockedRequirements.join('; ') || '(none)'}`,
              '',
              'Return exactly:',
              JSON.stringify({
                detectedFamily: 'space|packaging|vi|poster|unknown',
                detectedSubtype: 'visible subtype or unknown',
                visibleEvidence: ['only concrete visible evidence'],
                missingRequiredItems: ['requested structures visibly missing'],
                forbiddenItemsFound: ['forbidden visible content'],
                lockedAssetViolations: ['visible violations only'],
                brandMatch: 'matched|mismatched|uncertain',
                brandToneMatch: 'matched|mismatched|uncertain',
                sceneCompleteness: 'complete|incomplete|uncertain',
                logoTextStatus: 'correct|incorrect|absent|uncertain|not_required',
                qualityIssues: ['visible rendering or composition defects'],
              }),
              'For a space result, complete means one continuous enterable scene with floor, walls, ceiling, usable function, circulation, foreground, middle ground, background, and credible scale.',
              'In reference Logo mode, flag distorted, invented, duplicated, or misspelled identity. In blank_area mode, any visible logo, word, letters, or pseudo-text is incorrect.',
              'Evaluate brand tone from visible color/material/light/form behavior, not from prompt wording.',
              'Do not infer correctness from this text. If the image cannot prove a field, use unknown/uncertain.',
            ].join('\n'),
          },
        ],
        attachments: [{
          assetId: image.imageId,
          path: imagePath,
          mediaType: 'image',
          format: path.extname(imagePath).slice(1),
          readable: true,
        }],
      },
      signal: new AbortController().signal,
      maximumDurationMs: 120_000,
    });
    const validation = validateVNextDeliverableEvidence({
      projectId: input.projectId,
      taskContract: input.taskContract,
      runId: run.runId,
      imageId: image.imageId,
      evidence: parseJson(response.reportMarkdown),
    }) as VNextDeliverableValidation;
    await persist(input.projectId, run.runId, {
      ...validation,
      validatorProvider: response.provider,
      validatorModel: response.model,
      validatorRunId: response.runId,
    });
    return validation;
  }

  return { validate };
}

export type VNextDeliverableValidatorService = ReturnType<typeof createVNextDeliverableValidatorService>;
