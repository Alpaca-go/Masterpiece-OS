import crypto from 'node:crypto';
import type {
  CreativeDirection,
  GenerationBlueprint,
  LockedAsset,
  ReferencePackItem,
  StyleProfile,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  compileGenerationBlueprintPrompt,
} from '../../../../packages/creative-production-runtime/src/generation-blueprint.js';
import {
  compileVisualMemoryPrompt,
} from '../../../../packages/creative-production-runtime/src/visual-memory.js';
import {
  selectProviderReferencesFromPack,
} from '../../../../packages/creative-production-runtime/src/reference-pack.js';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { GenerationBlueprintService } from './generation-blueprint-service.ts';
import type { AnchorCandidateService } from './anchor-candidate-service.ts';
import type { ImageGenerationService } from './image-generation/service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { VisualMemoryService } from './visual-memory-service.ts';
import type { ReferencePackService } from './reference-pack-service.ts';

function resolveBlueprintPurpose(purpose: string): GenerationBlueprint['imagePurpose'] {
  if (/店内|室内|空间|装修|门店|店面|外立面|门头/iu.test(purpose)) {
    return 'interior_scene';
  }
  if (/包装|包材|礼盒|袋装|瓶装/iu.test(purpose)) {
    return 'packaging_render';
  }
  return 'brand_poster';
}

function defaultAspectRatio(
  imagePurpose: GenerationBlueprint['imagePurpose'],
): '16:9' | '4:5' | '3:4' | '1:1' {
  if (['interior_scene', 'storefront_scene'].includes(imagePurpose)) return '16:9';
  if (imagePurpose === 'brand_poster') return '4:5';
  if (imagePurpose === 'illustration') return '3:4';
  return '1:1';
}

export function createAnchorGenerationService(
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  candidates: AnchorCandidateService,
  imageGeneration: ImageGenerationService,
  directions: CreativeDirectionService,
  blueprints: GenerationBlueprintService,
  memories?: VisualMemoryService,
  referencePacks?: ReferencePackService,
) {
  async function execute(
    projectId: string,
    candidate: Awaited<ReturnType<AnchorCandidateService['create']>>,
    style: StyleProfile,
    direction: CreativeDirection,
    locks: LockedAsset[],
    input: {
      apiProfileId?: string;
      dryRun?: boolean;
    },
  ) {
    const purpose = candidate.task.purpose;
    const aspectRatio = candidate.task.aspectRatio;
    const availableReferences = locks
      .filter((item) => item.sourceFile && ['logo', 'packaging_structure'].includes(item.type))
      .sort((left, right) => left.type === 'logo' ? -1 : right.type === 'logo' ? 1 : 0)
      .slice(0, 2)
      .map((item) => {
        const projectRelativePath = item.type === 'logo' && item.thumbnail
          ? item.thumbnail
          : `input/${item.sourceFile!.replaceAll('\\', '/')}`;
        return {
          id: item.sourceAssetId || item.id,
          role: item.type === 'logo' ? 'identity_reference' as const : 'structure_reference' as const,
          projectRelativePath,
        };
      });
    const blueprint = await blueprints.compile(projectId, {
      userRequest: purpose,
      imagePurpose: resolveBlueprintPurpose(purpose),
      materialRules: [
        ...style.materialAndTexture.materials,
        ...style.materialAndTexture.surfaceRules,
      ],
      brandAssetRules: [
        ...locks.filter((item) => item.priority === 'critical').map((item) => item.rule),
      ],
      avoid: [
        ...locks.flatMap((item) => item.forbiddenChanges),
        ...style.promptComponents.negative,
        ...style.forbiddenVariations,
      ],
    });
    const visualMemory = memories ? await memories.compile(projectId) : undefined;
    const referencePack = visualMemory && referencePacks
      ? await referencePacks.build(projectId)
      : undefined;
    const references = referencePack
      ? selectProviderReferencesFromPack(referencePack, blueprint.imagePurpose).map((reference: ReferencePackItem) => ({
        id: reference.asset_id,
        role: reference.role === 'anchor'
          ? 'core_reference' as const
          : reference.signals.some((signal) => /structure_reference|packaging_structure/iu.test(signal))
            ? 'structure_reference' as const
            : 'identity_reference' as const,
        projectRelativePath: reference.pack_path,
      }))
      : blueprint.imagePurpose === 'vi_application'
        ? availableReferences.filter((reference) => reference.role === 'identity_reference').slice(0, 1)
        : blueprint.imagePurpose === 'packaging_render'
          ? availableReferences.filter((reference) => reference.role === 'structure_reference').slice(0, 1)
          : [];
    const compiledPrompt = [
      ...(visualMemory ? [compileVisualMemoryPrompt(visualMemory)] : []),
      ...(referencePack ? [
        '## Reference Pack Policy',
        'Use only the task-selected reference files. Preserve identity and structure; do not copy obsolete style.',
      ] : []),
      compileGenerationBlueprintPrompt(blueprint),
      ...(candidate.candidateSetId ? [
        [
          '## Candidate Set Variation',
          `Candidate ${candidate.candidateIndex}/${candidate.candidateCount}.`,
          [
            '优先探索构图层级与留白关系。',
            '优先探索材质、光线与商业真实感。',
            '优先探索图形机制与品牌记忆点。',
            '优先探索跨触点延展与长期可复用性。',
          ][(candidate.candidateIndex ?? 1) - 1],
          '必须服从同一 Style Profile、Locked Assets 与 Creative Direction；差异只用于人工比较。',
        ].filter(Boolean).join('\n'),
      ] : []),
    ].join('\n\n');
    const snapshot = {
      schemaVersion: '1.0',
      kind: 'anchor-candidate-prompt',
      projectId,
      candidateId: candidate.id,
      ...(candidate.candidateSetId ? {
        candidateSetId: candidate.candidateSetId,
        candidateIndex: candidate.candidateIndex,
        candidateCount: candidate.candidateCount,
      } : {}),
      styleProfileId: style.id,
      styleProfileVersion: style.version,
      creativeDirectionId: direction.id,
      creativeDirectionVersion: direction.version,
      creativeDirectionSnapshot: direction,
      generationBlueprintId: blueprint.id,
      generationBlueprint: blueprint,
      ...(visualMemory ? { visualMemoryId: visualMemory.id, visualMemory } : {}),
      ...(referencePack ? { referencePackId: referencePack.id, referencePack } : {}),
      lockedAssetIds: locks.map((item) => item.id),
      purpose,
      references,
      compiledAt: new Date().toISOString(),
    };
    const run = await imageGeneration.startCompiledCreativeTask({
      projectId,
      compiledPrompt,
      promptVersion: 'anchor-candidate-18.1.0',
      snapshot,
      sourceMap: {
        candidateId: candidate.id,
        ...(candidate.candidateSetId ? {
          candidateSetId: candidate.candidateSetId,
          candidateIndex: candidate.candidateIndex,
          candidateCount: candidate.candidateCount,
        } : {}),
        styleProfile: `${style.id}@${style.version}`,
        creativeDirection: `${direction.id}@${direction.version}`,
        generationBlueprint: blueprint.id,
        ...(visualMemory ? { visualMemory: visualMemory.id } : {}),
        ...(referencePack ? { referencePack: referencePack.id } : {}),
        lockedAssetIds: locks.map((item) => item.id),
        references,
      },
      references,
      event: 'ANCHOR_CANDIDATE_PROMPT_ATTACHED',
      apiProfileId: input.apiProfileId,
      size: aspectRatio === '16:9' ? '1440*810'
        : aspectRatio === '4:5' ? '1024*1280'
          : aspectRatio === '3:4' ? '1024*1365'
            : '1024*1024',
      dryRun: input.dryRun,
    });
    await candidates.beginGeneration(projectId, candidate.id, run.runId);
    if (run.status !== 'succeeded' || !run.images[0]) {
      const failed = await candidates.failGeneration(projectId, candidate.id, {
        errorCode: run.errorCode || 'IMAGE_GENERATION_FAILED',
        errorMessage: run.errorMessage || 'Anchor Candidate 图片生成失败，请重试。',
      });
      return { candidate: failed, run };
    }
    const completed = await candidates.completeGeneration(
      projectId,
      candidate.id,
      `image-generation/${run.runId}/${run.images[0].relativePath}`,
    );
    return { candidate: completed, run };
  }

  async function generate(projectId: string, input: {
    purpose?: string;
    aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
    apiProfileId?: string;
    dryRun?: boolean;
  }) {
    const [style, direction, locks] = await Promise.all([
      styles.getActive(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!style || style.status !== 'confirmed') {
      throw Object.assign(new Error('生成 Anchor Candidate 前必须确认 Style Profile。'), {
        code: 'STYLE_PROFILE_NOT_CONFIRMED',
      });
    }
    if (!direction || direction.status !== 'ready') {
      throw Object.assign(new Error('生成 Anchor Candidate 前必须存在 ready Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    const purpose = input.purpose?.trim() || '建立新的品牌主视觉方向';
    const imagePurpose = resolveBlueprintPurpose(purpose);
    const candidate = await candidates.create(projectId, {
      purpose,
      aspectRatio: input.aspectRatio || defaultAspectRatio(imagePurpose),
    });
    return execute(projectId, candidate, style, direction, locks, input);
  }

  async function generateSet(projectId: string, input: {
    purpose?: string;
    aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
    candidateCount?: number;
    apiProfileId?: string;
    dryRun?: boolean;
  }) {
    const candidateCount = input.candidateCount ?? 3;
    if (!Number.isInteger(candidateCount) || candidateCount < 2 || candidateCount > 4) {
      throw Object.assign(new Error('Anchor Candidate Set 数量必须在 2 到 4 之间。'), {
        code: 'ANCHOR_CANDIDATE_SET_INVALID',
      });
    }
    const [style, direction, locks] = await Promise.all([
      styles.getActive(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!style || style.status !== 'confirmed') {
      throw Object.assign(new Error('生成 Anchor Candidate Set 前必须确认 Style Profile。'), {
        code: 'STYLE_PROFILE_NOT_CONFIRMED',
      });
    }
    if (!direction || direction.status !== 'ready') {
      throw Object.assign(new Error('生成 Anchor Candidate Set 前必须存在 ready Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    const purpose = input.purpose?.trim() || '建立新的品牌主视觉方向';
    const imagePurpose = resolveBlueprintPurpose(purpose);
    const aspectRatio = input.aspectRatio || defaultAspectRatio(imagePurpose);
    const candidateSetId = `anchor-set-${crypto.randomUUID()}`;
    const results = [];
    for (let index = 1; index <= candidateCount; index += 1) {
      const candidate = await candidates.create(projectId, {
        purpose,
        aspectRatio,
        candidateSetId,
        candidateIndex: index,
        candidateCount,
      });
      results.push(await execute(projectId, candidate, style, direction, locks, input));
    }
    return { candidateSetId, results };
  }

  async function retry(projectId: string, candidateId: string, input: {
    apiProfileId?: string;
    dryRun?: boolean;
  }) {
    const [style, direction, locks] = await Promise.all([
      styles.getActive(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!style || style.status !== 'confirmed') {
      throw Object.assign(new Error('重试 Anchor Candidate 前必须确认 Style Profile。'), {
        code: 'STYLE_PROFILE_NOT_CONFIRMED',
      });
    }
    if (!direction || direction.status !== 'ready') {
      throw Object.assign(new Error('重试 Anchor Candidate 前必须存在 ready Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    const candidate = await candidates.retry(projectId, candidateId);
    return execute(projectId, candidate, style, direction, locks, input);
  }

  async function list(projectId: string) {
    const items = await candidates.list(projectId);
    return Promise.all(items.map(async (candidate) => {
      if (candidate.status !== 'generating' || !candidate.generationRunId) return candidate;
      const run = await imageGeneration.getRun(candidate.generationRunId).catch(() => null);
      if (!run) {
        return candidates.failGeneration(projectId, candidate.id, {
          errorCode: 'ANCHOR_GENERATION_RUN_MISSING',
          errorMessage: '找不到 Anchor 对应的图片生成记录，请重新生成。',
        });
      }
      if (run.status === 'succeeded' && run.images[0]) {
        return candidates.completeGeneration(
          projectId,
          candidate.id,
          `image-generation/${run.runId}/${run.images[0].relativePath}`,
        );
      }
      if (['blocked', 'failed', 'cancelled'].includes(run.status)) {
        return candidates.failGeneration(projectId, candidate.id, {
          errorCode: run.errorCode || `IMAGE_GENERATION_${run.status.toUpperCase()}`,
          errorMessage: run.errorMessage || `图片生成已${run.status}，请重新生成。`,
        });
      }
      return candidate;
    }));
  }

  return { generate, generateSet, retry, list };
}

export type AnchorGenerationService = ReturnType<typeof createAnchorGenerationService>;
